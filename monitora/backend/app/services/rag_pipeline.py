"""
Pipeline RAG complet
Combine vectorstore + LLM pour générer des réponses
"""
import logging
from typing import AsyncIterator, List, Dict, Tuple, Optional
from app.services.vectorstore import search_vectorstore
from app.services.llm_provider import get_llm_provider
from app.core.config import settings, DEFAULT_RAG_CONFIG

logger = logging.getLogger(__name__)

# Prompt système par défaut
DEFAULT_SYSTEM_PROMPT = """Tu es un assistant virtuel intelligent et serviable.
Tu réponds aux questions en te basant UNIQUEMENT sur le contexte fourni ci-dessous.
Si l'information n'est pas dans le contexte, dis-le clairement et propose de reformuler la question.

RÈGLES:
- Réponds de manière concise et précise
- Utilise un ton professionnel mais amical
- Si tu ne sais pas, dis "Je n'ai pas cette information dans ma base de connaissances"
- Ne fabrique jamais d'informations
- Cite les sources quand c'est pertinent

CONTEXTE:
{context}
"""


class RAGPipeline:
    """Pipeline RAG pour un workspace"""
    
    def __init__(self, workspace_id: str, config: Dict = None):
        self.workspace_id = workspace_id
        self.config = {**DEFAULT_RAG_CONFIG, **(config or {})}
        
        # Initialiser le LLM
        self.llm = get_llm_provider(
            provider=self.config.get("llm_provider", "mistral"),
            model=self.config.get("llm_model")
        )
    
    def _build_context(self, documents: List) -> Tuple[str, List[Dict]]:
        """Construit le contexte à partir des documents trouvés"""
        if not documents:
            return "", []
        
        context_parts = []
        sources = []
        seen_sources = set()
        
        for i, doc in enumerate(documents):
            content = doc.page_content.strip()
            source = doc.metadata.get("source", "Document")
            
            context_parts.append(f"[Source {i+1}: {source}]\n{content}")
            
            if source not in seen_sources:
                sources.append({
                    "source": source,
                    "document_id": doc.metadata.get("document_id")
                })
                seen_sources.add(source)
        
        context = "\n\n---\n\n".join(context_parts)
        return context, sources
    
    def _build_prompt(self, context: str, custom_prompt: str = None) -> str:
        """Construit le prompt système"""
        prompt = custom_prompt or DEFAULT_SYSTEM_PROMPT
        return prompt.format(context=context)
    
    async def get_response(
        self, 
        query: str, 
        history: List[Dict] = None,
        custom_prompt: str = None
    ) -> Tuple[str, List[Dict]]:
        """
        Génère une réponse complète (non-streaming)
        Retourne (réponse, sources)
        """
        # Recherche vectorielle
        top_k = self.config.get("top_k", settings.DEFAULT_TOP_K)
        documents = search_vectorstore(self.workspace_id, query, top_k=top_k)
        
        # Construire le contexte
        context, sources = self._build_context(documents)
        
        if not context:
            return "Je n'ai pas trouvé d'informations pertinentes dans ma base de connaissances pour répondre à votre question.", []
        
        # Construire le prompt
        system_prompt = self._build_prompt(context, custom_prompt)
        
        # Générer la réponse
        try:
            response = await self.llm.generate(
                system_prompt=system_prompt,
                user_message=query,
                history=history,
                temperature=self.config.get("temperature", settings.DEFAULT_TEMPERATURE),
                max_tokens=self.config.get("max_tokens", settings.DEFAULT_MAX_TOKENS),
                top_p=self.config.get("top_p", 1.0)
            )
            return response, sources
            
        except Exception as e:
            logger.error(f"Erreur génération RAG: {e}")
            return f"Désolé, une erreur s'est produite lors de la génération de la réponse.", []
    
    async def stream_response(
        self,
        query: str,
        history: List[Dict] = None,
        custom_prompt: str = None
    ) -> AsyncIterator[Dict]:
        """
        Génère une réponse en streaming.
        Yield des chunks: {"type": "token|sources|error", "content": ...}
        """
        # Recherche vectorielle
        top_k = self.config.get("top_k", settings.DEFAULT_TOP_K)
        documents = search_vectorstore(self.workspace_id, query, top_k=top_k)
        
        # Construire le contexte
        context, sources = self._build_context(documents)
        
        # Envoyer les sources d'abord
        if sources:
            yield {"type": "sources", "sources": sources}
        
        if not context:
            yield {
                "type": "token",
                "content": "Je n'ai pas trouvé d'informations pertinentes dans ma base de connaissances pour répondre à votre question."
            }
            return
        
        # Construire le prompt
        system_prompt = self._build_prompt(context, custom_prompt)
        
        # Streamer la réponse
        try:
            async for token in self.llm.stream(
                system_prompt=system_prompt,
                user_message=query,
                history=history,
                temperature=self.config.get("temperature", settings.DEFAULT_TEMPERATURE),
                max_tokens=self.config.get("max_tokens", settings.DEFAULT_MAX_TOKENS),
                top_p=self.config.get("top_p", 1.0)
            ):
                yield {"type": "token", "content": token}
                
        except Exception as e:
            logger.error(f"Erreur streaming RAG: {e}")
            yield {"type": "error", "content": "Erreur lors de la génération de la réponse"}
