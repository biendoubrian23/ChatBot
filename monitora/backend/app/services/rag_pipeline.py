"""
Pipeline RAG complet
Combine vectorstore + LLM pour générer des réponses
Inclut cache sémantique pour les questions répétitives
"""
import logging
import re
from typing import AsyncIterator, List, Dict, Tuple, Optional
from app.services.llm_provider import get_llm_provider
from app.core.config import settings, DEFAULT_RAG_CONFIG
from app.services.semantic_cache import search_cached_response, save_to_cache

# Importer le bon module vectorstore selon le mode
if settings.STORAGE_MODE == "supabase":
    from app.services.vectorstore_supabase import search_vectorstore
else:
    from app.services.vectorstore import search_vectorstore

logger = logging.getLogger(__name__)


def fix_email_format(text: str) -> str:
    """Corrige les emails CoolLibri malformés dans le texte.
    
    Le LLM oublie parfois le @ dans les emails. Cette fonction corrige:
    - contactcoollibri.com -> contact@coollibri.com
    - contact coollibri.com -> contact@coollibri.com
    
    Note: Ne pas ajouter de markdown, le widget s'occupe de rendre les emails cliquables.
    """
    patterns = [
        (r'contactcoollibri\.com', 'contact@coollibri.com'),
        (r'contact\s+coollibri\.com', 'contact@coollibri.com'),
        (r'contact\.coollibri\.com', 'contact@coollibri.com'),
        (r'contactcoolibri\.com', 'contact@coollibri.com'),
        (r'contact coolibri\.com', 'contact@coollibri.com'),
        # Supprimer le markdown mailto si le LLM l'a généré (le widget le gère)
        (r'\[([^\]]+@[^\]]+)\]\(mailto:[^)]+\)', r'\1'),
    ]
    
    result = text
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    return result


# Prompt système par défaut
DEFAULT_SYSTEM_PROMPT = """Tu es un assistant virtuel chaleureux, professionnel et serviable.
Tu es là pour aider les utilisateurs avec enthousiasme et bienveillance.

🎯 RÈGLES DE COMPORTEMENT:

1. **SALUTATIONS** - Réponds TOUJOURS chaleureusement aux salutations:
   - "salut" → "Salut ! 😊 Ravi de te voir ! Comment puis-je t'aider aujourd'hui ?"
   - "bonjour" → "Bonjour ! ☀️ Bienvenue ! Je suis là pour vous aider, que puis-je faire pour vous ?"
   - "hello" → "Hello ! 👋 Super de vous avoir ! Qu'est-ce qui vous amène ?"
   - "comment ça va ?" → "Je vais très bien, merci de demander ! 😊 Et vous, comment allez-vous ? Comment puis-je vous aider ?"

2. **RÉPONSES AUX QUESTIONS**:
   - Utilise le contexte fourni ci-dessous pour répondre aux questions
   - Si l'info n'est pas dans le contexte, dis-le gentiment et propose de reformuler
   - Sois précis mais chaleureux dans tes réponses

3. **FORMAT DE RÉPONSE** - TRÈS IMPORTANT:
   - Privilégie les listes à puces pour structurer tes réponses
   - Utilise "-" ou "•" pour les listes à puces simples
   - Utilise des numéros (1., 2., 3.) pour les étapes ou processus
   - Met en **gras** les éléments importants
   - Fais des paragraphes courts et aérés
   - Exemple de bonne réponse:
     "Voici les étapes pour passer commande :
     
     1. Créez votre compte sur le site
     2. Téléchargez votre fichier PDF
     3. Choisissez vos options d'impression :
        - Format du livre
        - Type de reliure
        - Papier intérieur
     4. Validez et payez votre commande
     
     Besoin d'aide sur une étape en particulier ?"

4. **TON GÉNÉRAL**:
   - Chaleureux et accueillant 🤗
   - Professionnel mais pas froid
   - Utilise des emojis avec modération pour être plus humain
   - Termine souvent par une question pour maintenir le dialogue

5. **CE QUE TU NE DOIS PAS FAIRE**:
   - Ne sois jamais froid ou robotique
   - Ne fabrique jamais d'informations
   - Ne réponds jamais "Je n'ai pas d'informations" à une simple salutation
   - N'écris pas de longs paragraphes sans structure

CONTEXTE DISPONIBLE:
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
        # Utiliser le system_prompt personnalisé de la config s'il existe
        if not custom_prompt:
            custom_prompt = self.config.get("system_prompt", "")
        
        # Si toujours pas de prompt, utiliser le défaut
        if not custom_prompt or not custom_prompt.strip():
            prompt = DEFAULT_SYSTEM_PROMPT
        else:
            # Ajouter le contexte au prompt personnalisé
            prompt = custom_prompt + "\n\nCONTEXTE DISPONIBLE:\n{context}"
        
        return prompt.format(context=context)
    
    async def get_response(
        self, 
        query: str, 
        history: List[Dict] = None,
        custom_prompt: str = None
    ) -> Tuple[str, List[Dict], bool]:
        """
        Génère une réponse complète (non-streaming)
        Retourne (réponse, sources, from_cache)
        """
        # ===== CACHE SÉMANTIQUE =====
        # Vérifier si une question similaire existe en cache (seulement si pas d'historique complexe)
        if self.config.get("enable_cache", True) and (not history or len(history) <= 2):
            cached = search_cached_response(
                workspace_id=self.workspace_id,
                question=query,
                similarity_threshold=self.config.get("similarity_threshold", 0.92),
                cache_ttl=self.config.get("cache_ttl", 7200)
            )
            if cached:
                response, similarity = cached
                logger.info(f"✨ Réponse en cache (similarité: {similarity:.1%})")
                return fix_email_format(response), [], True
        
        # ===== PIPELINE RAG STANDARD =====
        # Recherche vectorielle
        top_k = self.config.get("top_k", settings.DEFAULT_TOP_K)
        documents = search_vectorstore(self.workspace_id, query, top_k=top_k)
        
        # Construire le contexte
        context, sources = self._build_context(documents)
        
        # Construire le prompt (même sans contexte, pour les salutations)
        system_prompt = self._build_prompt(context if context else "Aucun document pertinent trouvé.", custom_prompt)
        
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
            # Post-traitement: corriger les emails malformés
            response = fix_email_format(response)
            
            # Sauvegarder en cache si activé
            if self.config.get("enable_cache", True):
                save_to_cache(self.workspace_id, query, response)
            
            return response, sources, False
            
        except Exception as e:
            logger.error(f"Erreur génération RAG: {e}")
            return f"Désolé, une erreur s'est produite lors de la génération de la réponse.", [], False
    
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
        
        # Construire le prompt (même sans contexte, pour les salutations)
        system_prompt = self._build_prompt(context if context else "Aucun document pertinent trouvé.", custom_prompt)
        
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
