"""MONITORA Backend - RAG Pipeline for each workspace"""
import time
from typing import List, Tuple, Optional, Dict, Any
from langchain.schema import Document

from app.services.vectorstore import vectorstore_manager, DocumentProcessor
from app.services.llm_provider import LLMProviderFactory, BaseLLMProvider


class WorkspaceRAGPipeline:
    """RAG pipeline configured for a specific workspace."""
    
    def __init__(
        self,
        workspace_id: str,
        config: Dict[str, Any]
    ):
        """Initialize RAG pipeline with workspace-specific config.
        
        Args:
            workspace_id: Unique workspace identifier
            config: RAG configuration from database
        """
        self.workspace_id = workspace_id
        self.config = config
        
        # Get vectorstore for this workspace
        self.vectorstore = vectorstore_manager.get_store(workspace_id)
        
        # Get LLM provider based on config
        self.llm: BaseLLMProvider = LLMProviderFactory.get_provider(
            provider_name=config.get('llm_provider', 'mistral'),
            model=config.get('llm_model', 'mistral-small-latest')
        )
        
        # RAG parameters
        self.top_k = config.get('top_k', 8)
        self.rerank_top_n = config.get('rerank_top_n', 5)
        self.temperature = config.get('temperature', 0.1)
        self.max_tokens = config.get('max_tokens', 900)
        self.top_p = config.get('top_p', 1.0)
        
        # Prompts
        self.system_prompt = config.get('system_prompt', 
            'Tu es un assistant virtuel serviable et précis. '
            'Réponds aux questions en utilisant uniquement les informations fournies dans le contexte. '
            'Si tu ne connais pas la réponse, dis-le clairement.'
        )
        self.context_template = config.get('context_template',
            'Voici les informations pertinentes:\n\n{context}\n\nQuestion: {question}'
        )
    
    def retrieve_documents(self, query: str) -> List[Tuple[Document, float]]:
        """Retrieve relevant documents for a query."""
        return self.vectorstore.similarity_search(query, k=self.top_k)
    
    def rerank_documents(
        self,
        query: str,
        documents: List[Tuple[Document, float]]
    ) -> List[Tuple[Document, float]]:
        """Rerank documents (simple score-based for now)."""
        sorted_docs = sorted(documents, key=lambda x: x[1], reverse=True)
        return sorted_docs[:self.rerank_top_n]
    
    def format_context(self, documents: List[Tuple[Document, float]]) -> str:
        """Format retrieved documents into context string."""
        context_parts = []
        for i, (doc, score) in enumerate(documents, 1):
            source = doc.metadata.get('source', 'Document')
            context_parts.append(
                f"[Source {i}: {source}]\n{doc.page_content}\n"
            )
        return "\n".join(context_parts)
    
    async def generate_response(
        self,
        query: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Generate a response using the RAG pipeline.
        
        Args:
            query: User question
            history: Optional conversation history
            
        Returns:
            Response with answer, sources, and metadata
        """
        start_time = time.time()
        
        # 1. Retrieve documents
        documents = self.retrieve_documents(query)
        
        # 2. Rerank
        reranked_docs = self.rerank_documents(query, documents)
        
        # 3. Format context
        context = self.format_context(reranked_docs)
        
        # 4. Build prompt
        user_message = self.context_template.format(
            context=context,
            question=query
        )
        
        # 5. Build messages with history
        messages = []
        if history:
            messages.extend(history[-6:])  # Keep last 3 exchanges
        messages.append({"role": "user", "content": user_message})
        
        # 6. Generate response
        try:
            answer = await self.llm.generate_chat(
                messages=messages,
                system_prompt=self.system_prompt,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                top_p=self.top_p
            )
        except Exception as e:
            answer = f"Désolé, une erreur s'est produite: {str(e)}"
        
        processing_time = time.time() - start_time
        
        # 7. Format sources
        sources = [
            {
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "source": doc.metadata.get('source', 'Unknown'),
                "score": score
            }
            for doc, score in reranked_docs
        ]
        
        return {
            "answer": answer,
            "sources": sources,
            "processing_time": processing_time,
            "documents_retrieved": len(documents),
            "documents_used": len(reranked_docs)
        }
    
    async def generate_response_stream(
        self,
        query: str,
        history: Optional[List[Dict[str, str]]] = None
    ):
        """Generate a streaming response.
        
        Yields tokens as they are generated.
        """
        # 1. Retrieve and rerank documents
        documents = self.retrieve_documents(query)
        reranked_docs = self.rerank_documents(query, documents)
        
        # 2. Format context
        context = self.format_context(reranked_docs)
        
        # 3. Build prompt
        user_message = self.context_template.format(
            context=context,
            question=query
        )
        
        # 4. Build messages
        messages = []
        if history:
            messages.extend(history[-6:])
        messages.append({"role": "user", "content": user_message})
        
        # 5. Stream response
        async for token in self.llm.generate_stream(
            messages=messages,
            system_prompt=self.system_prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            top_p=self.top_p
        ):
            yield token


class RAGPipelineManager:
    """Manager for workspace RAG pipelines."""
    
    _pipelines: Dict[str, WorkspaceRAGPipeline] = {}
    
    @classmethod
    def get_pipeline(cls, workspace_id: str, config: Dict[str, Any]) -> WorkspaceRAGPipeline:
        """Get or create a RAG pipeline for a workspace."""
        # Always create fresh to respect config changes
        # In production, add caching with config hash
        return WorkspaceRAGPipeline(
            workspace_id=workspace_id,
            config=config
        )
    
    @classmethod
    def invalidate(cls, workspace_id: str) -> None:
        """Invalidate cached pipeline for a workspace."""
        if workspace_id in cls._pipelines:
            del cls._pipelines[workspace_id]
