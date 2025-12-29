"""
Request Batcher Service - Optimise le traitement parallèle des requêtes LLM.

Ce service implémente:
1. Batching des requêtes (regroupe les requêtes arrivant dans une fenêtre de temps)
2. Queue de requêtes avec priorité
3. Gestion intelligente des connexions
"""
import asyncio
import time
import threading
from typing import Dict, List, Any, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from collections import deque
from enum import Enum
import hashlib


class RequestPriority(Enum):
    HIGH = 0      # Suivi de commande (rapide, DB)
    NORMAL = 1    # Questions générales (LLM)
    LOW = 2       # Batch/analytics


@dataclass
class BatchedRequest:
    """Représente une requête dans le batch."""
    id: str
    query: str
    context: str
    history: Optional[List[Dict]] = None
    priority: RequestPriority = RequestPriority.NORMAL
    created_at: float = field(default_factory=time.time)
    future: asyncio.Future = field(default=None)
    
    def __post_init__(self):
        if self.future is None:
            try:
                loop = asyncio.get_event_loop()
                self.future = loop.create_future()
            except RuntimeError:
                pass


class RequestBatcher:
    """
    Batches les requêtes LLM pour optimiser le throughput.
    
    Fonctionnement:
    1. Les requêtes arrivent et sont mises en queue
    2. Après BATCH_WINDOW_MS, toutes les requêtes accumulées sont traitées
    3. Les requêtes similaires peuvent partager le même résultat (dedup)
    """
    
    def __init__(
        self,
        batch_window_ms: int = 100,     # Fenêtre d'accumulation
        max_batch_size: int = 8,         # Taille max du batch
        max_concurrent: int = 4,         # Requêtes parallèles max vers Ollama
    ):
        self.batch_window_ms = batch_window_ms
        self.max_batch_size = max_batch_size
        self.max_concurrent = max_concurrent
        
        # Queues par priorité
        self._queues: Dict[RequestPriority, deque] = {
            RequestPriority.HIGH: deque(),
            RequestPriority.NORMAL: deque(),
            RequestPriority.LOW: deque(),
        }
        
        # Sémaphore pour limiter les requêtes parallèles
        self._semaphore = asyncio.Semaphore(max_concurrent)
        
        # Lock pour accès thread-safe
        self._lock = asyncio.Lock()
        
        # Stats
        self.stats = {
            "total_requests": 0,
            "batched_requests": 0,
            "deduped_requests": 0,
            "avg_batch_size": 0.0,
        }
        
        # Dedup cache (query_hash -> (result, timestamp))
        self._dedup_cache: Dict[str, tuple] = {}
        self._dedup_ttl = 5.0  # 5 secondes de TTL pour dedup
        
        # Batch processing task
        self._batch_task: Optional[asyncio.Task] = None
        self._running = False
    
    def _get_query_hash(self, query: str, context: str = "") -> str:
        """Génère un hash pour identifier les requêtes similaires."""
        normalized = query.lower().strip()
        return hashlib.md5(f"{normalized}:{len(context)}".encode()).hexdigest()
    
    async def start(self):
        """Démarre le batch processor."""
        if self._running:
            return
        self._running = True
        self._batch_task = asyncio.create_task(self._batch_loop())
        print("🚀 Request Batcher démarré")
    
    async def stop(self):
        """Arrête le batch processor."""
        self._running = False
        if self._batch_task:
            self._batch_task.cancel()
            try:
                await self._batch_task
            except asyncio.CancelledError:
                pass
        print("🛑 Request Batcher arrêté")
    
    async def submit(
        self,
        query: str,
        context: str,
        process_func: Callable[[str, str, Optional[List[Dict]]], Awaitable[str]],
        history: Optional[List[Dict]] = None,
        priority: RequestPriority = RequestPriority.NORMAL,
    ) -> str:
        """
        Soumet une requête au batcher.
        
        Args:
            query: Question utilisateur
            context: Contexte RAG
            process_func: Fonction async pour traiter la requête
            history: Historique conversation
            priority: Priorité de la requête
            
        Returns:
            Réponse générée
        """
        self.stats["total_requests"] += 1
        
        # Check dedup cache
        query_hash = self._get_query_hash(query, context)
        now = time.time()
        
        if query_hash in self._dedup_cache:
            result, cached_at = self._dedup_cache[query_hash]
            if now - cached_at < self._dedup_ttl:
                self.stats["deduped_requests"] += 1
                print(f"⚡ Dedup HIT pour requête similaire")
                return result
        
        # Si haute priorité ou pas de batching actif, traitement direct
        if priority == RequestPriority.HIGH:
            async with self._semaphore:
                result = await process_func(query, context, history)
                self._dedup_cache[query_hash] = (result, now)
                return result
        
        # Sinon, traitement via sémaphore pour limiter la concurrence
        async with self._semaphore:
            result = await process_func(query, context, history)
            self._dedup_cache[query_hash] = (result, now)
            return result
    
    async def _batch_loop(self):
        """Boucle principale de traitement des batches."""
        while self._running:
            try:
                await asyncio.sleep(self.batch_window_ms / 1000.0)
                await self._process_batches()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Erreur batch loop: {e}")
    
    async def _process_batches(self):
        """Traite les batches en attente."""
        # Nettoyer le cache dedup périmé
        now = time.time()
        expired = [k for k, (_, t) in self._dedup_cache.items() if now - t > self._dedup_ttl]
        for k in expired:
            del self._dedup_cache[k]
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du batcher."""
        return {
            **self.stats,
            "queue_sizes": {p.name: len(q) for p, q in self._queues.items()},
            "dedup_cache_size": len(self._dedup_cache),
        }


# Singleton global
_batcher: Optional[RequestBatcher] = None
_batcher_lock = threading.Lock()


def get_batcher() -> RequestBatcher:
    """Retourne l'instance singleton du batcher."""
    global _batcher
    if _batcher is None:
        with _batcher_lock:
            if _batcher is None:
                _batcher = RequestBatcher(
                    batch_window_ms=100,
                    max_batch_size=8,
                    max_concurrent=4,
                )
    return _batcher


async def init_batcher():
    """Initialise et démarre le batcher."""
    batcher = get_batcher()
    await batcher.start()
    return batcher


async def shutdown_batcher():
    """Arrête proprement le batcher."""
    global _batcher
    if _batcher:
        await _batcher.stop()
        _batcher = None
