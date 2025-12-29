"""
Cache Sémantique - Cache intelligent basé sur la similarité des requêtes.

Améliore le cache simple en:
1. Détectant les questions similaires (pas juste identiques)
2. Cachant les embeddings des questions fréquentes
3. Cachant le contexte RAG pour éviter les recherches répétées
"""
import time
import hashlib
import threading
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from collections import OrderedDict
import re
import numpy as np


@dataclass
class CacheEntry:
    """Entrée du cache avec métadonnées."""
    key: str
    value: Any
    embedding: Optional[np.ndarray] = None
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    access_count: int = 0
    ttl: float = 3600.0  # 1 heure par défaut
    
    def is_expired(self) -> bool:
        return time.time() - self.created_at > self.ttl
    
    def touch(self):
        self.last_accessed = time.time()
        self.access_count += 1


class SemanticCache:
    """
    Cache sémantique avec similarité cosinus.
    
    Fonctionnalités:
    1. Cache exact (hash) - O(1)
    2. Cache sémantique (similarité) - O(n) mais limité aux top-K
    3. LRU éviction
    4. TTL configurable
    """
    
    def __init__(
        self,
        max_size: int = 500,
        similarity_threshold: float = 0.92,  # 92% de similarité minimum
        default_ttl: float = 3600.0,         # 1 heure
        embedding_func: Optional[callable] = None,
    ):
        self.max_size = max_size
        self.similarity_threshold = similarity_threshold
        self.default_ttl = default_ttl
        self.embedding_func = embedding_func
        
        # Cache exact (hash -> entry)
        self._exact_cache: OrderedDict[str, CacheEntry] = OrderedDict()
        
        # Cache sémantique (liste pour recherche par similarité)
        self._semantic_cache: List[CacheEntry] = []
        
        # Lock pour thread-safety
        self._lock = threading.RLock()
        
        # Stats
        self.stats = {
            "exact_hits": 0,
            "semantic_hits": 0,
            "misses": 0,
            "evictions": 0,
        }
    
    def _normalize_query(self, query: str) -> str:
        """Normalise une requête pour le cache exact."""
        # Minuscule, sans espaces multiples, sans ponctuation sauf chiffres
        normalized = query.lower().strip()
        normalized = re.sub(r'\s+', ' ', normalized)
        # Garder la ponctuation importante (?, !)
        return normalized
    
    def _get_exact_key(self, query: str) -> str:
        """Génère une clé pour le cache exact."""
        normalized = self._normalize_query(query)
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calcule la similarité cosinus entre deux vecteurs."""
        if a is None or b is None:
            return 0.0
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))
    
    def get(self, query: str, context_hash: str = "") -> Optional[Any]:
        """
        Recherche une entrée dans le cache.
        
        Args:
            query: Question utilisateur
            context_hash: Hash optionnel du contexte
            
        Returns:
            Valeur cachée ou None
        """
        with self._lock:
            # 1. Essayer le cache exact
            key = self._get_exact_key(query + context_hash)
            if key in self._exact_cache:
                entry = self._exact_cache[key]
                if not entry.is_expired():
                    entry.touch()
                    # Move to end (LRU)
                    self._exact_cache.move_to_end(key)
                    self.stats["exact_hits"] += 1
                    return entry.value
                else:
                    # Expired, remove
                    del self._exact_cache[key]
            
            # 2. Essayer le cache sémantique (si embedding disponible)
            if self.embedding_func and len(self._semantic_cache) > 0:
                try:
                    query_embedding = self.embedding_func(query)
                    best_match = None
                    best_similarity = 0.0
                    
                    for entry in self._semantic_cache:
                        if entry.is_expired():
                            continue
                        if entry.embedding is not None:
                            similarity = self._cosine_similarity(query_embedding, entry.embedding)
                            if similarity > best_similarity and similarity >= self.similarity_threshold:
                                best_similarity = similarity
                                best_match = entry
                    
                    if best_match:
                        best_match.touch()
                        self.stats["semantic_hits"] += 1
                        print(f"🧠 Semantic Cache HIT (similarity: {best_similarity:.2%})")
                        return best_match.value
                except Exception as e:
                    print(f"⚠️ Semantic cache error: {e}")
            
            self.stats["misses"] += 1
            return None
    
    def set(
        self,
        query: str,
        value: Any,
        context_hash: str = "",
        ttl: Optional[float] = None,
        embedding: Optional[np.ndarray] = None,
    ) -> None:
        """
        Ajoute une entrée au cache.
        
        Args:
            query: Question utilisateur
            value: Réponse à cacher
            context_hash: Hash du contexte
            ttl: Time-to-live optionnel
            embedding: Embedding optionnel pour cache sémantique
        """
        with self._lock:
            # Éviction si nécessaire
            while len(self._exact_cache) >= self.max_size:
                # Remove oldest (LRU)
                oldest_key = next(iter(self._exact_cache))
                del self._exact_cache[oldest_key]
                self.stats["evictions"] += 1
            
            key = self._get_exact_key(query + context_hash)
            entry = CacheEntry(
                key=key,
                value=value,
                embedding=embedding,
                ttl=ttl or self.default_ttl,
            )
            
            self._exact_cache[key] = entry
            
            # Ajouter au cache sémantique si embedding fourni
            if embedding is not None:
                # Limiter la taille du cache sémantique
                if len(self._semantic_cache) >= self.max_size // 2:
                    # Remove les plus anciens
                    self._semantic_cache = sorted(
                        self._semantic_cache,
                        key=lambda e: e.last_accessed,
                        reverse=True
                    )[:self.max_size // 4]
                
                self._semantic_cache.append(entry)
    
    def invalidate(self, query: str, context_hash: str = "") -> bool:
        """Invalide une entrée spécifique."""
        with self._lock:
            key = self._get_exact_key(query + context_hash)
            if key in self._exact_cache:
                del self._exact_cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Vide le cache."""
        with self._lock:
            self._exact_cache.clear()
            self._semantic_cache.clear()
    
    def cleanup_expired(self) -> int:
        """Nettoie les entrées expirées."""
        with self._lock:
            expired_keys = [
                k for k, v in self._exact_cache.items()
                if v.is_expired()
            ]
            for key in expired_keys:
                del self._exact_cache[key]
            
            self._semantic_cache = [
                e for e in self._semantic_cache
                if not e.is_expired()
            ]
            
            return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du cache."""
        with self._lock:
            total_hits = self.stats["exact_hits"] + self.stats["semantic_hits"]
            total_requests = total_hits + self.stats["misses"]
            hit_rate = total_hits / total_requests if total_requests > 0 else 0
            
            return {
                **self.stats,
                "total_requests": total_requests,
                "hit_rate": f"{hit_rate:.2%}",
                "exact_cache_size": len(self._exact_cache),
                "semantic_cache_size": len(self._semantic_cache),
            }


# Singleton global
_response_cache: Optional[SemanticCache] = None
_cache_lock = threading.Lock()


def get_response_cache(embedding_func: Optional[callable] = None) -> SemanticCache:
    """Retourne l'instance singleton du cache."""
    global _response_cache
    if _response_cache is None:
        with _cache_lock:
            if _response_cache is None:
                _response_cache = SemanticCache(
                    max_size=500,
                    similarity_threshold=0.92,
                    default_ttl=3600.0,
                    embedding_func=embedding_func,
                )
    return _response_cache
