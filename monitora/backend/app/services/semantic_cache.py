"""
Cache Sémantique pour les réponses du chatbot
Version SQL Server - utilise un hash de la question pour recherche rapide
"""
import logging
import hashlib
from typing import Optional, Tuple
from datetime import datetime, timedelta
from app.core.database import get_db, dict_from_row, new_uuid

logger = logging.getLogger(__name__)

# Seuil de similarité (non utilisé avec hash, gardé pour compatibilité)
DEFAULT_SIMILARITY_THRESHOLD = 0.92
# TTL par défaut du cache (7 jours en secondes)
DEFAULT_CACHE_TTL = 604800


def _normalize_question(question: str) -> str:
    """
    Normalise une question pour améliorer les chances de cache hit.
    - Minuscules
    - Supprime les espaces multiples
    - Supprime la ponctuation de fin
    """
    normalized = question.lower().strip()
    normalized = " ".join(normalized.split())  # Espaces multiples -> simple
    normalized = normalized.rstrip("?!.,;:")
    return normalized


def _hash_question(question: str) -> str:
    """Génère un hash SHA256 de la question normalisée"""
    normalized = _normalize_question(question)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def search_cached_response(
    workspace_id: str,
    question: str,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    cache_ttl: int = DEFAULT_CACHE_TTL
) -> Optional[Tuple[str, float]]:
    """
    Cherche une réponse en cache pour une question identique (normalisée).
    
    Args:
        workspace_id: ID du workspace
        question: Question de l'utilisateur
        similarity_threshold: Non utilisé (gardé pour compatibilité API)
        cache_ttl: Durée de vie du cache en secondes
    
    Returns:
        Tuple (response, similarity=1.0) si trouvé, None sinon
    """
    try:
        db = get_db()
        question_hash = _hash_question(question)
        
        # Calculer la date limite du cache
        cache_limit = datetime.utcnow() - timedelta(seconds=cache_ttl)
        
        with db.cursor() as cursor:
            cursor.execute("""
                SELECT response, created_at 
                FROM response_cache 
                WHERE workspace_id = ? 
                  AND question_hash = ?
                  AND created_at > ?
                ORDER BY created_at DESC
            """, (workspace_id, question_hash, cache_limit))
            
            row = cursor.fetchone()
            
            if row:
                response = row[0]
                created_at = row[1]
                age_seconds = (datetime.utcnow() - created_at).total_seconds() if created_at else 0
                age_hours = age_seconds / 3600
                
                logger.info(f"✨ Cache HIT! Question trouvée (age: {age_hours:.1f}h)")
                return response, 1.0  # Similarité = 1.0 car hash exact
        
        logger.debug(f"Cache MISS pour: {question[:50]}...")
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
    Remplace l'ancienne entrée si elle existe.
    
    Returns:
        True si sauvegardé, False sinon
    """
    try:
        db = get_db()
        question_hash = _hash_question(question)
        cache_id = new_uuid()
        
        with db.cursor() as cursor:
            # Supprimer l'ancienne entrée si elle existe
            cursor.execute("""
                DELETE FROM response_cache 
                WHERE workspace_id = ? AND question_hash = ?
            """, (workspace_id, question_hash))
            
            # Insérer la nouvelle entrée
            cursor.execute("""
                INSERT INTO response_cache 
                (id, workspace_id, question, question_hash, response, created_at)
                VALUES (?, ?, ?, ?, ?, GETDATE())
            """, (cache_id, workspace_id, question, question_hash, response))
        
        logger.debug(f"💾 Réponse mise en cache: {question[:50]}...")
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
        db = get_db()
        
        with db.cursor() as cursor:
            # Compter d'abord
            cursor.execute("""
                SELECT COUNT(*) FROM response_cache WHERE workspace_id = ?
            """, (workspace_id,))
            count = cursor.fetchone()[0]
            
            # Supprimer
            cursor.execute("""
                DELETE FROM response_cache WHERE workspace_id = ?
            """, (workspace_id,))
        
        logger.info(f"🗑️ Cache vidé: {count} entrées supprimées")
        return count
        
    except Exception as e:
        logger.warning(f"Impossible de vider le cache: {e}")
        return 0


def cleanup_expired_cache(max_age_days: int = 30) -> int:
    """
    Nettoie les entrées de cache expirées (plus anciennes que max_age_days).
    À appeler périodiquement pour libérer de l'espace.
    
    Returns:
        Nombre d'entrées supprimées
    """
    try:
        db = get_db()
        cutoff = datetime.utcnow() - timedelta(days=max_age_days)
        
        with db.cursor() as cursor:
            cursor.execute("""
                DELETE FROM response_cache WHERE created_at < ?
            """, (cutoff,))
            
            # SQL Server ne retourne pas le count directement, on estime
            count = cursor.rowcount if hasattr(cursor, 'rowcount') else 0
        
        logger.info(f"🧹 Nettoyage cache: {count} entrées expirées supprimées")
        return count
        
    except Exception as e:
        logger.warning(f"Erreur nettoyage cache: {e}")
        return 0


def get_cache_stats(workspace_id: str) -> dict:
    """
    Retourne des statistiques sur le cache d'un workspace.
    """
    try:
        db = get_db()
        
        with db.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_entries,
                    MIN(created_at) as oldest_entry,
                    MAX(created_at) as newest_entry
                FROM response_cache 
                WHERE workspace_id = ?
            """, (workspace_id,))
            
            row = cursor.fetchone()
            
            return {
                "total_entries": row[0] if row else 0,
                "oldest_entry": str(row[1]) if row and row[1] else None,
                "newest_entry": str(row[2]) if row and row[2] else None
            }
        
    except Exception as e:
        logger.warning(f"Erreur stats cache: {e}")
        return {"total_entries": 0, "oldest_entry": None, "newest_entry": None}
