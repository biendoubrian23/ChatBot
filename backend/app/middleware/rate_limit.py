"""
Rate Limiting Middleware avec Fingerprinting
=============================================
Protège contre le spam en identifiant les utilisateurs par:
- Adresse IP
- User-Agent
- Fingerprint navigateur (envoyé par le frontend)

Même si l'utilisateur change d'IP (VPN), le fingerprint reste le même.
"""

import time
import hashlib
from typing import Dict, Optional
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


class RateLimitConfig:
    """Configuration du rate limiting."""
    
    # Limites par fenêtre de temps
    REQUESTS_PER_MINUTE = 20       # Max 20 requêtes/minute
    REQUESTS_PER_HOUR = 200        # Max 200 requêtes/heure
    
    # Endpoints exemptés (health checks, etc.)
    EXEMPT_PATHS = [
        "/health",
        "/docs",
        "/openapi.json",
        "/favicon.ico",
        "/api/v1/tracking",  # Tracking pour le monitor
        "/api/v1/order",     # Order tracking
    ]
    
    # Durée du ban temporaire en secondes
    BAN_DURATION = 300  # 5 minutes
    
    # Seuil pour déclencher un ban
    BAN_THRESHOLD = 50  # Si plus de 50 requêtes en 1 minute = ban


class RateLimitStore:
    """
    Stockage en mémoire des compteurs de requêtes.
    En production, utiliser Redis pour la persistence entre instances.
    """
    
    def __init__(self):
        # {fingerprint: {minute_timestamp: count}}
        self.minute_counts: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        # {fingerprint: {hour_timestamp: count}}
        self.hour_counts: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        # {fingerprint: ban_until_timestamp}
        self.bans: Dict[str, float] = {}
        # Dernière cleanup
        self.last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Nettoie les entrées expirées (toutes les 5 minutes)."""
        now = time.time()
        if now - self.last_cleanup < 300:
            return
        
        current_minute = int(now // 60)
        current_hour = int(now // 3600)
        
        # Nettoyer les compteurs de minutes (garder les 5 dernières)
        for fp in list(self.minute_counts.keys()):
            old_minutes = [m for m in self.minute_counts[fp] if m < current_minute - 5]
            for m in old_minutes:
                del self.minute_counts[fp][m]
            if not self.minute_counts[fp]:
                del self.minute_counts[fp]
        
        # Nettoyer les compteurs d'heures (garder les 2 dernières)
        for fp in list(self.hour_counts.keys()):
            old_hours = [h for h in self.hour_counts[fp] if h < current_hour - 2]
            for h in old_hours:
                del self.hour_counts[fp][h]
            if not self.hour_counts[fp]:
                del self.hour_counts[fp]
        
        # Nettoyer les bans expirés
        expired_bans = [fp for fp, until in self.bans.items() if until < now]
        for fp in expired_bans:
            del self.bans[fp]
        
        self.last_cleanup = now
    
    def is_banned(self, fingerprint: str) -> bool:
        """Vérifie si un fingerprint est banni."""
        if fingerprint in self.bans:
            if time.time() < self.bans[fingerprint]:
                return True
            else:
                del self.bans[fingerprint]
        return False
    
    def ban(self, fingerprint: str, duration: int = RateLimitConfig.BAN_DURATION):
        """Banni un fingerprint pour une durée donnée."""
        self.bans[fingerprint] = time.time() + duration
        logger.warning(f"🚫 Fingerprint banni pour {duration}s: {fingerprint[:16]}...")
    
    def get_ban_remaining(self, fingerprint: str) -> int:
        """Retourne le temps restant du ban en secondes."""
        if fingerprint in self.bans:
            remaining = int(self.bans[fingerprint] - time.time())
            return max(0, remaining)
        return 0
    
    def increment(self, fingerprint: str) -> tuple[int, int]:
        """
        Incrémente les compteurs et retourne (count_minute, count_hour).
        """
        self._cleanup_old_entries()
        
        now = time.time()
        current_minute = int(now // 60)
        current_hour = int(now // 3600)
        
        self.minute_counts[fingerprint][current_minute] += 1
        self.hour_counts[fingerprint][current_hour] += 1
        
        return (
            self.minute_counts[fingerprint][current_minute],
            self.hour_counts[fingerprint][current_hour]
        )


# Instance globale du store
rate_limit_store = RateLimitStore()


def generate_fingerprint(request: Request) -> str:
    """
    Génère un fingerprint unique pour identifier un utilisateur.
    
    STRATÉGIE (par ordre de priorité):
    1. Si le frontend envoie X-Client-Fingerprint → On l'utilise (résiste au VPN)
    2. Sinon → Fallback sur IP + User-Agent (moins fiable mais mieux que rien)
    
    Le fingerprint frontend est basé sur des caractéristiques du NAVIGATEUR
    (écran, canvas, polices, WebGL) qui ne changent PAS avec un VPN.
    """
    # Fingerprint envoyé par le frontend (basé sur canvas, écran, polices, etc.)
    client_fingerprint = request.headers.get("X-Client-Fingerprint", "")
    
    # Si le frontend a envoyé un fingerprint riche, on l'utilise directement
    # C'est le plus fiable car il ne change pas avec VPN/proxy
    if client_fingerprint and len(client_fingerprint) > 10 and client_fingerprint != "pending":
        # On ajoute juste un préfixe pour identifier la source
        return f"fp_{client_fingerprint[:32]}"
    
    # FALLBACK: Si pas de fingerprint frontend, on utilise IP + User-Agent
    # Moins fiable (change avec VPN) mais mieux que rien
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    user_agent = request.headers.get("User-Agent", "unknown")
    accept_lang = request.headers.get("Accept-Language", "unknown")
    
    # Fallback fingerprint basé sur IP (moins fiable)
    raw_fingerprint = f"fallback|{ip}|{user_agent}|{accept_lang}"
    fingerprint = hashlib.sha256(raw_fingerprint.encode()).hexdigest()[:32]
    
    return f"ip_{fingerprint}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware de rate limiting avec fingerprinting.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Ignorer certains paths
        path = request.url.path
        if any(path.startswith(exempt) for exempt in RateLimitConfig.EXEMPT_PATHS):
            return await call_next(request)
        
        # Générer le fingerprint
        fingerprint = generate_fingerprint(request)
        
        # Vérifier si banni
        if rate_limit_store.is_banned(fingerprint):
            remaining = rate_limit_store.get_ban_remaining(fingerprint)
            logger.warning(f"🚫 Requête bloquée (ban): {fingerprint[:16]}... - {remaining}s restantes")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Trop de requêtes",
                    "message": f"Vous avez été temporairement bloqué. Réessayez dans {remaining} secondes.",
                    "retry_after": remaining
                },
                headers={"Retry-After": str(remaining)}
            )
        
        # Incrémenter et vérifier les limites
        count_minute, count_hour = rate_limit_store.increment(fingerprint)
        
        # Vérifier le seuil de ban (spam agressif)
        if count_minute > RateLimitConfig.BAN_THRESHOLD:
            rate_limit_store.ban(fingerprint)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Spam détecté",
                    "message": f"Activité suspecte détectée. Vous êtes bloqué pour {RateLimitConfig.BAN_DURATION // 60} minutes.",
                    "retry_after": RateLimitConfig.BAN_DURATION
                },
                headers={"Retry-After": str(RateLimitConfig.BAN_DURATION)}
            )
        
        # Vérifier limite par minute
        if count_minute > RateLimitConfig.REQUESTS_PER_MINUTE:
            wait_time = 60 - (time.time() % 60)
            logger.info(f"⚠️ Rate limit minute: {fingerprint[:16]}... ({count_minute} req)")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Limite atteinte",
                    "message": f"Maximum {RateLimitConfig.REQUESTS_PER_MINUTE} requêtes par minute. Réessayez dans {int(wait_time)} secondes.",
                    "retry_after": int(wait_time)
                },
                headers={"Retry-After": str(int(wait_time))}
            )
        
        # Vérifier limite par heure
        if count_hour > RateLimitConfig.REQUESTS_PER_HOUR:
            wait_time = 3600 - (time.time() % 3600)
            logger.info(f"⚠️ Rate limit heure: {fingerprint[:16]}... ({count_hour} req)")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Limite horaire atteinte",
                    "message": f"Maximum {RateLimitConfig.REQUESTS_PER_HOUR} requêtes par heure. Réessayez plus tard.",
                    "retry_after": int(wait_time)
                },
                headers={"Retry-After": str(int(wait_time))}
            )
        
        # Ajouter les headers de rate limit à la réponse
        response = await call_next(request)
        
        # Headers informatifs
        response.headers["X-RateLimit-Limit-Minute"] = str(RateLimitConfig.REQUESTS_PER_MINUTE)
        response.headers["X-RateLimit-Remaining-Minute"] = str(max(0, RateLimitConfig.REQUESTS_PER_MINUTE - count_minute))
        response.headers["X-RateLimit-Limit-Hour"] = str(RateLimitConfig.REQUESTS_PER_HOUR)
        response.headers["X-RateLimit-Remaining-Hour"] = str(max(0, RateLimitConfig.REQUESTS_PER_HOUR - count_hour))
        
        return response


def get_rate_limit_stats() -> dict:
    """Retourne les statistiques de rate limiting (pour monitoring)."""
    return {
        "active_fingerprints": len(rate_limit_store.minute_counts),
        "banned_count": len(rate_limit_store.bans),
        "config": {
            "requests_per_minute": RateLimitConfig.REQUESTS_PER_MINUTE,
            "requests_per_hour": RateLimitConfig.REQUESTS_PER_HOUR,
            "ban_duration_seconds": RateLimitConfig.BAN_DURATION,
            "ban_threshold": RateLimitConfig.BAN_THRESHOLD
        }
    }
