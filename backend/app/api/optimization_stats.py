"""Endpoint pour les statistiques d'optimisation."""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.services.semantic_cache import get_response_cache
from app.services.request_batcher import get_batcher
from app.core.config import settings

router = APIRouter(prefix="/optimization", tags=["optimization"])


@router.get("/stats")
async def get_optimization_stats() -> Dict[str, Any]:
    """
    Retourne les statistiques de toutes les optimisations.
    
    Returns:
        Dict avec les stats de cache, batcher, etc.
    """
    stats = {
        "config": {
            "semantic_cache_enabled": settings.enable_semantic_cache,
            "request_batching_enabled": settings.enable_request_batching,
            "max_concurrent_requests": settings.max_concurrent_llm_requests,
            "batch_window_ms": settings.batch_window_ms,
        },
        "semantic_cache": {},
        "request_batcher": {},
    }
    
    # Stats du cache sémantique
    try:
        cache = get_response_cache()
        stats["semantic_cache"] = cache.get_stats()
    except Exception as e:
        stats["semantic_cache"] = {"error": str(e)}
    
    # Stats du batcher
    try:
        batcher = get_batcher()
        stats["request_batcher"] = batcher.get_stats()
    except Exception as e:
        stats["request_batcher"] = {"error": str(e)}
    
    return stats


@router.post("/cache/clear")
async def clear_cache() -> Dict[str, str]:
    """Vide le cache sémantique."""
    try:
        cache = get_response_cache()
        cache.clear()
        return {"status": "success", "message": "Cache vidé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cache/cleanup")
async def cleanup_cache() -> Dict[str, Any]:
    """Nettoie les entrées expirées du cache."""
    try:
        cache = get_response_cache()
        removed = cache.cleanup_expired()
        return {"status": "success", "removed_entries": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def optimization_health() -> Dict[str, Any]:
    """Vérifie la santé des services d'optimisation."""
    health = {
        "semantic_cache": "unknown",
        "request_batcher": "unknown",
    }
    
    try:
        cache = get_response_cache()
        health["semantic_cache"] = "healthy" if cache else "disabled"
    except Exception as e:
        health["semantic_cache"] = f"error: {e}"
    
    try:
        batcher = get_batcher()
        health["request_batcher"] = "healthy" if batcher else "disabled"
    except Exception as e:
        health["request_batcher"] = f"error: {e}"
    
    return health
