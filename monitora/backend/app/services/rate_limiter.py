"""
Service de Rate Limiting pour protéger le chatbot contre le spam
3 niveaux de protection:
1. IP: Max 30 requêtes/min par IP
2. Fingerprint: Max 30 requêtes/min par empreinte navigateur
3. Global: Max 1000 requêtes/min par workspace
"""
import time
import threading
import logging
from typing import Tuple, Dict, List
from collections import defaultdict

logger = logging.getLogger(__name__)

# Configuration des limites
IP_LIMIT = 30  # requêtes par minute
FINGERPRINT_LIMIT = 30  # requêtes par minute
GLOBAL_LIMIT = 1000  # requêtes par minute par workspace
BLOCK_DURATION = 3600  # 1 heure en secondes
WINDOW_SIZE = 60  # 1 minute en secondes


class RateLimiter:
    """
    Rate limiter avec 3 niveaux de protection.
    Utilise un stockage en mémoire (pour un seul serveur).
    Pour du multi-serveur, utiliser Redis à la place.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern pour avoir une seule instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        # Tracking des requêtes: {key: [timestamp1, timestamp2, ...]}
        self.ip_requests: Dict[str, List[float]] = defaultdict(list)
        self.fingerprint_requests: Dict[str, List[float]] = defaultdict(list)
        self.global_requests: Dict[str, List[float]] = defaultdict(list)
        
        # Liste de blocage: {key: expiration_timestamp}
        self.blocked_ips: Dict[str, float] = {}
        self.blocked_fingerprints: Dict[str, float] = {}
        self.blocked_workspaces: Dict[str, float] = {}
        
        self._initialized = True
        logger.info("RateLimiter initialisé")
    
    def _cleanup_old_requests(self, requests: List[float], window: int = WINDOW_SIZE) -> List[float]:
        """Supprime les requêtes plus anciennes que la fenêtre"""
        now = time.time()
        cutoff = now - window
        return [ts for ts in requests if ts > cutoff]
    
    def _is_blocked(self, blocked_dict: Dict[str, float], key: str) -> bool:
        """Vérifie si une clé est bloquée"""
        if key not in blocked_dict:
            return False
        
        expiration = blocked_dict[key]
        if time.time() > expiration:
            # Le blocage a expiré, on le supprime
            del blocked_dict[key]
            return False
        
        return True
    
    def _block(self, blocked_dict: Dict[str, float], key: str, duration: int = BLOCK_DURATION):
        """Bloque une clé pour la durée spécifiée"""
        blocked_dict[key] = time.time() + duration
    
    def _check_limit(
        self, 
        requests_dict: Dict[str, List[float]], 
        blocked_dict: Dict[str, float],
        key: str, 
        limit: int,
        block_type: str
    ) -> Tuple[bool, str]:
        """
        Vérifie si la limite est dépassée.
        Retourne (is_allowed, message)
        """
        # Vérifier si déjà bloqué
        if self._is_blocked(blocked_dict, key):
            remaining = int(blocked_dict[key] - time.time())
            minutes = remaining // 60
            logger.warning(f"🚫 {block_type} bloqué: {key[:20]}... (reste {minutes}min)")
            return False, f"Trop de requêtes. Réessayez dans {minutes} minutes."
        
        # Nettoyer et compter les requêtes récentes
        requests_dict[key] = self._cleanup_old_requests(requests_dict[key])
        count = len(requests_dict[key])
        
        if count >= limit:
            # Limite dépassée, on bloque
            self._block(blocked_dict, key)
            logger.warning(f"🚨 RATE LIMIT {block_type}: {key[:20]}... ({count} requêtes/min) - BLOQUÉ 1h")
            return False, "Trop de requêtes. Réessayez dans 60 minutes."
        
        # Ajouter la requête actuelle
        requests_dict[key].append(time.time())
        return True, ""
    
    def check_ip(self, ip: str, workspace_id: str) -> Tuple[bool, str]:
        """
        Vérifie la limite IP.
        La clé inclut le workspace pour isoler les limites par chatbot.
        """
        key = f"ip:{workspace_id}:{ip}"
        return self._check_limit(
            self.ip_requests, 
            self.blocked_ips, 
            key, 
            IP_LIMIT,
            "IP"
        )
    
    def check_fingerprint(self, fingerprint: str, workspace_id: str) -> Tuple[bool, str]:
        """
        Vérifie la limite fingerprint (visitor_id).
        """
        if not fingerprint:
            return True, ""  # Pas de fingerprint = pas de vérification
            
        key = f"fp:{workspace_id}:{fingerprint}"
        return self._check_limit(
            self.fingerprint_requests,
            self.blocked_fingerprints,
            key,
            FINGERPRINT_LIMIT,
            "Fingerprint"
        )
    
    def check_global(self, workspace_id: str) -> Tuple[bool, str]:
        """
        Vérifie la limite globale du workspace.
        Si dépassée, le chatbot passe en mode maintenance.
        """
        key = f"global:{workspace_id}"
        return self._check_limit(
            self.global_requests,
            self.blocked_workspaces,
            key,
            GLOBAL_LIMIT,
            "Global"
        )
    
    def is_workspace_blocked(self, workspace_id: str) -> bool:
        """Vérifie si un workspace est bloqué (attaque globale)"""
        key = f"global:{workspace_id}"
        return self._is_blocked(self.blocked_workspaces, key)
    
    def check_all(self, ip: str, fingerprint: str, workspace_id: str) -> Tuple[bool, str]:
        """
        Vérifie les 3 niveaux de rate limiting.
        Retourne (is_allowed, error_message)
        """
        # 1. Vérifier la limite globale (prioritaire)
        allowed, msg = self.check_global(workspace_id)
        if not allowed:
            return False, msg
        
        # 2. Vérifier la limite IP
        allowed, msg = self.check_ip(ip, workspace_id)
        if not allowed:
            return False, msg
        
        # 3. Vérifier la limite fingerprint
        allowed, msg = self.check_fingerprint(fingerprint, workspace_id)
        if not allowed:
            return False, msg
        
        return True, ""
    
    def get_stats(self, workspace_id: str) -> dict:
        """Retourne les statistiques de rate limiting pour debug"""
        global_key = f"global:{workspace_id}"
        
        # Nettoyer avant de compter
        if global_key in self.global_requests:
            self.global_requests[global_key] = self._cleanup_old_requests(
                self.global_requests[global_key]
            )
        
        return {
            "global_requests_last_minute": len(self.global_requests.get(global_key, [])),
            "global_limit": GLOBAL_LIMIT,
            "is_workspace_blocked": self.is_workspace_blocked(workspace_id),
            "blocked_ips_count": len(self.blocked_ips),
            "blocked_fingerprints_count": len(self.blocked_fingerprints)
        }


# Instance globale (singleton)
rate_limiter = RateLimiter()


def get_client_ip(request) -> str:
    """
    Récupère l'IP réelle du client (gère les proxies).
    """
    # Headers communs pour les proxies
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Prendre la première IP (la plus proche du client)
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    # Fallback: IP directe
    if request.client:
        return request.client.host
    
    return "unknown"
