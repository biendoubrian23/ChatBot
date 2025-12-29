"""RAG pipeline service orchestrating all components."""
import time
import re
import hashlib
from typing import List, Tuple, Optional
from datetime import datetime
import uuid
from langchain.schema import Document

from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.llm import OllamaService
from app.services.message_analyzer import MessageAnalyzer
from app.services.order_logic import generate_order_status_response
from app.services.database import db_service
from app.services.semantic_cache import get_response_cache, SemanticCache
from app.services.request_batcher import get_batcher, RequestPriority
from app.models.schemas import ChatResponse, SourceDocument
from app.core.config import settings


def fix_email_format(text: str) -> str:
    """Corrige les emails CoolLibri malformés dans le texte.
    
    Le LLM oublie parfois le @ dans les emails. Cette fonction corrige:
    - contactcoollibri.com -> contact@coollibri.com
    - contact coollibri.com -> contact@coollibri.com
    """
    # Pattern pour détecter les variations malformées de l'email
    patterns = [
        (r'contactcoollibri\.com', 'contact@coollibri.com'),
        (r'contact\s+coollibri\.com', 'contact@coollibri.com'),
        (r'contact\.coollibri\.com', 'contact@coollibri.com'),
        (r'contactcoolibri\.com', 'contact@coollibri.com'),  # typo sans double l
        (r'contact coolibri\.com', 'contact@coollibri.com'),
    ]
    
    result = text
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result

class RAGPipeline:
    """RAG pipeline orchestrating retrieval and generation."""
    
    def __init__(
        self,
        vectorstore: VectorStoreService,
        llm_service: OllamaService,
        top_k: int = 5,
        rerank_top_n: int = 3
    ):
        """Initialize RAG pipeline.
        
        Args:
            vectorstore: Vector store service
            llm_service: LLM service (Ollama or Hugging Face)
            top_k: Number of documents to retrieve
            rerank_top_n: Number of documents after reranking
        """
        self.vectorstore = vectorstore
        self.llm_service = llm_service
        self.top_k = top_k
        self.rerank_top_n = rerank_top_n
        self.cache = {}  # Simple in-memory cache
        self.message_analyzer = MessageAnalyzer(llm_service)
        
        # Cache sémantique pour les réponses
        self._semantic_cache: Optional[SemanticCache] = None
        if settings.enable_semantic_cache:
            self._init_semantic_cache()
        
        # Request batcher pour le parallélisme
        self._batcher = get_batcher()
    
    def _init_semantic_cache(self):
        """Initialise le cache sémantique avec la fonction d'embedding."""
        try:
            # Utiliser le vectorstore pour les embeddings
            def embed_query(query: str):
                return self.vectorstore.embedding_service.embed_query(query)
            
            self._semantic_cache = get_response_cache(embedding_func=embed_query)
            print("✅ Cache sémantique initialisé")
        except Exception as e:
            print(f"⚠️ Cache sémantique non disponible: {e}")
            self._semantic_cache = None
    
    def _get_context_hash(self, documents: List[Tuple[Document, float]]) -> str:
        """Génère un hash du contexte pour le cache."""
        if not documents:
            return "empty"
        content = "".join([doc.page_content[:100] for doc, _ in documents[:3]])
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def retrieve_documents(self, query: str) -> List[Tuple[Document, float]]:
        """Retrieve relevant documents for a query.
        
        Args:
            query: User query
            
        Returns:
            List of (Document, score) tuples
        """
        return self.vectorstore.similarity_search(query, k=self.top_k)
    
    def rerank_documents(
        self,
        query: str,
        documents: List[Tuple[Document, float]]
    ) -> List[Tuple[Document, float]]:
        """Rerank documents (simple score-based for now).
        
        Args:
            query: User query
            documents: Retrieved documents with scores
            
        Returns:
            Reranked documents
        """
        # Sort by score and take top N
        sorted_docs = sorted(documents, key=lambda x: x[1], reverse=True)
        return sorted_docs[:self.rerank_top_n]
    
    def format_context(self, documents: List[Tuple[Document, float]]) -> str:
        """Format retrieved documents into context string.
        
        Args:
            documents: Retrieved documents with scores
            
        Returns:
            Formatted context string
        """
        context_parts = []
        for i, (doc, score) in enumerate(documents, 1):
            source = doc.metadata.get('source', 'Unknown')
            context_parts.append(
                f"[Document {i} - Source: {source}]\n{doc.page_content}\n"
            )
        return "\n".join(context_parts)
    
    async def generate_response(
        self,
        query: str,
        conversation_id: Optional[str] = None,
        history: Optional[List[dict]] = None
    ) -> ChatResponse:
        """Generate a response using the RAG pipeline.
        
        Args:
            query: User question
            conversation_id: Optional conversation ID
            history: Optional conversation history [{"role": "user|assistant", "content": "..."}]
            
        Returns:
            ChatResponse object
        """
        start_time = time.time()
        
        # Generate conversation ID if not provided
        if conversation_id is None:
            conversation_id = str(uuid.uuid4())
            
        # 1. Analyze intent with LLM-First approach
        # Le LLM décide si c'est du suivi de commande ou une question générale
        analysis = await self.message_analyzer.analyze_message(query)
        intent = analysis["intent"]
        order_number = analysis.get("order_number")
        reasoning = analysis.get("reasoning")
        
        print(f"🤖 Pipeline Analysis: Intent={intent}, Order={order_number}")
        
        # 2. Handle Order Tracking
        if intent == "order_tracking":
            if order_number:
                # Fetch order details from DB
                print(f"🔍 Searching for order {order_number}...")
                order_data = db_service.get_order_tracking_details(order_number)
                
                if order_data:
                    # Generate status response
                    answer = generate_order_status_response(
                        order_data, 
                        current_status_id=order_data["status_id"]
                    )
                    
                    return ChatResponse(
                        answer=answer,
                        sources=[SourceDocument(
                            content=f"Détails de la commande {order_number}",
                            metadata={"source": "database", "type": "order_status"},
                            relevance_score=1.0
                        )],
                        conversation_id=conversation_id,
                        processing_time=time.time() - start_time,
                        intent=intent,
                        reasoning=reasoning
                    )
                else:
                    # Order not found
                    return ChatResponse(
                        answer=f"Je ne trouve pas la commande numéro {order_number} dans notre base de données. Êtes-vous sûr du numéro ?",
                        sources=[],
                        conversation_id=conversation_id,
                        processing_time=time.time() - start_time,
                        intent=intent,
                        reasoning=reasoning
                    )
            elif analysis.get("needs_order_input"):
                # Ask for order number
                return ChatResponse(
                    answer="Pour suivre votre commande, j'ai besoin de votre numéro de commande. Pouvez-vous me le donner ?",
                    sources=[],
                    conversation_id=conversation_id,
                    processing_time=time.time() - start_time,
                    intent=intent,
                    reasoning=reasoning
                )

        # 3. Standard RAG Flow (General Question)
        
        # Check cache (only if no history, as context changes with history)
        cache_key = query.lower().strip()
        if cache_key in self.cache and not history:
            cached_response = self.cache[cache_key]
            cached_response.conversation_id = conversation_id
            cached_response.timestamp = datetime.utcnow()
            # Update intent/reasoning in cached response if missing
            if not hasattr(cached_response, 'intent') or not cached_response.intent:
                cached_response.intent = intent
                cached_response.reasoning = reasoning
            return cached_response
        
        # Retrieve documents
        retrieved_docs = self.retrieve_documents(query)
        
        if not retrieved_docs:
            # No documents found
            return ChatResponse(
                answer="Je n'ai pas trouvé d'information pertinente pour répondre à votre question.",
                sources=[],
                conversation_id=conversation_id,
                processing_time=time.time() - start_time,
                intent=intent,
                reasoning=reasoning
            )
        
        # Rerank documents
        reranked_docs = self.rerank_documents(query, retrieved_docs)
        
        # Format context
        context = self.format_context(reranked_docs)
        
        # Check semantic cache before calling LLM
        context_hash = self._get_context_hash(reranked_docs)
        if self._semantic_cache and not history:
            cached_answer = self._semantic_cache.get(query, context_hash)
            if cached_answer:
                print(f"🧠 Semantic Cache HIT")
                # Prepare source documents
                sources = [
                    SourceDocument(
                        content=doc.page_content,
                        metadata=doc.metadata,
                        relevance_score=score
                    )
                    for doc, score in reranked_docs
                ]
                return ChatResponse(
                    answer=cached_answer,
                    sources=sources,
                    conversation_id=conversation_id,
                    processing_time=time.time() - start_time,
                    intent=intent,
                    reasoning=reasoning
                )
        
        # Generate answer with LLM (now with history)
        answer = self.llm_service.generate_response(
            query=query,
            context=context,
            history=history
        )
        
        # Post-traitement: corriger les emails malformés
        answer = fix_email_format(answer)
        
        # Store in semantic cache
        if self._semantic_cache and not history:
            try:
                embedding = self.vectorstore.embedding_service.embed_query(query)
                self._semantic_cache.set(
                    query=query,
                    value=answer,
                    context_hash=context_hash,
                    embedding=embedding
                )
            except Exception as e:
                print(f"⚠️ Erreur cache sémantique: {e}")
        
        # Prepare source documents
        sources = [
            SourceDocument(
                content=doc.page_content,
                metadata=doc.metadata,
                relevance_score=score
            )
            for doc, score in reranked_docs
        ]
        
        # Create response
        response = ChatResponse(
            answer=answer,
            sources=sources,
            conversation_id=conversation_id,
            processing_time=time.time() - start_time,
            intent=intent,
            reasoning=reasoning
        )
        
        # Cache the response
        self.cache[cache_key] = response
        
        # Limit cache size (simple LRU-like behavior)
        if len(self.cache) > 100:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        return response
