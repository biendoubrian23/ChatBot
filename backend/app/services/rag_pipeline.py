"""RAG pipeline service orchestrating all components."""
import time
from typing import List, Tuple, Optional, Union
from datetime import datetime
import uuid
from langchain.schema import Document

from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.llm import OllamaService
from app.services.huggingface_llm import HuggingFaceLLMService
from app.models.schemas import ChatResponse, SourceDocument


class RAGPipeline:
    """RAG pipeline orchestrating retrieval and generation."""
    
    def __init__(
        self,
        vectorstore: VectorStoreService,
        llm_service: Union[OllamaService, HuggingFaceLLMService],
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
    
    def generate_response(
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
        
        # Check cache (only if no history, as context changes with history)
        cache_key = query.lower().strip()
        if cache_key in self.cache and not history:
            cached_response = self.cache[cache_key]
            cached_response.conversation_id = conversation_id
            cached_response.timestamp = datetime.utcnow()
            return cached_response
        
        # Retrieve documents
        retrieved_docs = self.retrieve_documents(query)
        
        if not retrieved_docs:
            # No documents found
            return ChatResponse(
                answer="Je n'ai pas trouvé d'information pertinente pour répondre à votre question.",
                sources=[],
                conversation_id=conversation_id,
                processing_time=time.time() - start_time
            )
        
        # Rerank documents
        reranked_docs = self.rerank_documents(query, retrieved_docs)
        
        # Format context
        context = self.format_context(reranked_docs)
        
        # Generate answer with LLM (now with history)
        answer = self.llm_service.generate_response(
            query=query,
            context=context,
            history=history
        )
        
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
            processing_time=time.time() - start_time
        )
        
        # Cache the response
        self.cache[cache_key] = response
        
        # Limit cache size (simple LRU-like behavior)
        if len(self.cache) > 100:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        return response
