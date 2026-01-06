"""
Cache Sémantique pour les réponses du chatbot
Utilise pgvector pour trouver les questions similaires et retourner les réponses en cache
"""
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
from app.core.supabase import get_supabase
from app.services.vectorstore_supabase import get_embeddings, EMBEDDING_DIMENSION

logger = logging.getLogger(__name__)

# Seuil de similarité (92% = très similaire)
DEFAULT_SIMILARITY_THRESHOLD = 0.92
# TTL par défaut du cache (2 heures)
DEFAULT_CACHE_TTL = 7200


def search_cached_response(
    workspace_id: str,
    question: str,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    cache_ttl: int = DEFAULT_CACHE_TTL
) -> Optional[Tuple[str, float]]:
    """
    Cherche une réponse en cache pour une question similaire.
    
    Returns:
        Tuple (response, similarity) si trouvé, None sinon
    """
    try:
        supabase = get_supabase()
        embeddings = get_embeddings()
        
        # Générer l'embedding de la question
        question_embedding = embeddings.embed_query(question)
        
        # Calculer la date limite du cache
        cache_limit = (datetime.utcnow() - timedelta(seconds=cache_ttl)).isoformat()
        
        # Chercher une question similaire via la fonction RPC
        result = supabase.rpc(
            "search_response_cache",
            {
                "query_embedding": question_embedding,
                "p_workspace_id": workspace_id,
                "similarity_threshold": similarity_threshold,
                "cache_after": cache_limit
            }
        ).execute()
        
        if result.data and len(result.data) > 0:
            cached = result.data[0]
            logger.info(f"Cache HIT! Similarité: {cached['similarity']:.2%}")
            return cached["response"], cached["similarity"]
        
        return None
        
    except Exception as e:
        # En cas d'erreur (table manquante, etc.), on continue sans cache
        logger.warning(f"Cache sémantique indisponible: {e}")
        return None


def save_to_cache(
    workspace_id: str,
    question: str,
    response: str
) -> bool:
    """
    Sauvegarde une question/réponse dans le cache.
    
    Returns:
        True si sauvegardé, False sinon
    """
    try:
        supabase = get_supabase()
        embeddings = get_embeddings()
        
        # Générer l'embedding de la question
        question_embedding = embeddings.embed_query(question)
        
        # Insérer dans le cache
        supabase.table("response_cache").insert({
            "workspace_id": workspace_id,
            "question": question,
            "question_embedding": question_embedding,
            "response": response
        }).execute()
        
        logger.debug(f"Réponse mise en cache pour: {question[:50]}...")
        return True
        
    except Exception as e:
        logger.warning(f"Impossible de sauvegarder en cache: {e}")
        return False


def clear_workspace_cache(workspace_id: str) -> int:
    """
    Vide le cache d'un workspace.
    Utile après réindexation des documents.
    
    Returns:
        Nombre d'entrées supprimées
    """
    try:
        supabase = get_supabase()
        result = supabase.table("response_cache")\
            .delete()\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        count = len(result.data) if result.data else 0
        logger.info(f"Cache vidé: {count} entrées supprimées")
        return count
        
    except Exception as e:
        logger.warning(f"Impossible de vider le cache: {e}")
        return 0
