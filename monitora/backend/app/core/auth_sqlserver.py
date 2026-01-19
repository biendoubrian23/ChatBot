"""
Authentification SQL Server pour Monitora
Remplace l'authentification Supabase
"""
from fastapi import HTTPException, Header, Depends
from typing import Optional, Dict, Any
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.sqlserver import get_sqlserver, SQLServerTable
import logging

logger = logging.getLogger(__name__)


# =====================================================
# HACHAGE DE MOT DE PASSE
# =====================================================

def generate_salt() -> str:
    """Génère un sel aléatoire pour le hachage"""
    return secrets.token_hex(32)


def hash_password(password: str, salt: str) -> str:
    """
    Hache un mot de passe avec SHA-256 et un sel.
    Compatible avec le système de hachage standard.
    """
    salted = f"{salt}{password}{salt}"
    return hashlib.sha256(salted.encode()).hexdigest()


def verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    """Vérifie si un mot de passe correspond au hash"""
    computed_hash = hash_password(password, password_salt)
    return secrets.compare_digest(computed_hash, password_hash)


# =====================================================
# GESTION DES TOKENS JWT
# =====================================================

def create_access_token(user_data: Dict[str, Any], expires_delta: timedelta = None) -> str:
    """Crée un token JWT d'accès"""
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.JWT_EXPIRY_HOURS)
    
    expire = datetime.utcnow() + expires_delta
    
    payload = {
        "sub": str(user_data.get("id")),
        "email": user_data.get("email"),
        "role": user_data.get("role", "admin"),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Crée un token de rafraîchissement"""
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRY_DAYS)
    
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Décode et valide un token JWT"""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Token invalide: {str(e)}")


def hash_token(token: str) -> str:
    """Hache un token pour stockage sécurisé"""
    return hashlib.sha256(token.encode()).hexdigest()


# =====================================================
# SERVICES D'AUTHENTIFICATION
# =====================================================

class AuthService:
    """Service d'authentification SQL Server"""
    
    def __init__(self):
        self.db = get_sqlserver()
        self.users_table = SQLServerTable("app_users", self.db)
        self.sessions_table = SQLServerTable("app_sessions", self.db)
        self.profiles_table = SQLServerTable("profiles", self.db)
    
    async def register(
        self, 
        email: str, 
        password: str, 
        full_name: str = None,
        role: str = "admin"
    ) -> Dict[str, Any]:
        """Inscrit un nouvel utilisateur"""
        # Vérifier si l'email existe
        existing = self.users_table.select_one(where={"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        
        # Valider le mot de passe
        if len(password) < 6:
            raise HTTPException(
                status_code=400, 
                detail="Le mot de passe doit contenir au moins 6 caractères"
            )
        
        # Générer sel et hash
        salt = generate_salt()
        password_hash = hash_password(password, salt)
        
        # Générer le nom si non fourni
        if not full_name:
            full_name = email.split("@")[0]
        
        # Appeler la stored procedure
        results = self.db.call_procedure("sp_create_user", {
            "email": email,
            "password_hash": password_hash,
            "password_salt": salt,
            "full_name": full_name,
            "role": role
        })
        
        if not results or not results[0].get("success"):
            message = results[0].get("message") if results else "Erreur lors de la création"
            raise HTTPException(status_code=400, detail=message)
        
        user_id = results[0].get("user_id")
        
        # Créer les tokens
        user_data = {
            "id": user_id,
            "email": email,
            "role": role
        }
        
        access_token = create_access_token(user_data)
        refresh_token = create_refresh_token(str(user_id))
        
        # Sauvegarder la session
        self._save_session(str(user_id), access_token, refresh_token)
        
        return {
            "user": {
                "id": str(user_id),
                "email": email,
                "full_name": full_name,
                "role": role
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def login(
        self, 
        email: str, 
        password: str,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """Authentifie un utilisateur"""
        # Récupérer l'utilisateur
        results = self.db.call_procedure("sp_get_user_for_auth", {"email": email})
        
        if not results:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        
        user = results[0]
        
        # Vérifier si le compte est verrouillé
        if user.get("locked_until"):
            locked_until = user["locked_until"]
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
            if locked_until > datetime.now(locked_until.tzinfo):
                raise HTTPException(
                    status_code=401, 
                    detail="Compte temporairement verrouillé. Réessayez plus tard."
                )
        
        # Vérifier si le compte est actif
        if not user.get("is_active"):
            raise HTTPException(status_code=401, detail="Compte désactivé")
        
        # Vérifier le mot de passe
        if not verify_password(password, user["password_hash"], user["password_salt"]):
            # Incrémenter les tentatives échouées
            self._increment_failed_attempts(user["id"])
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        
        # Mettre à jour la dernière connexion
        self.db.call_procedure("sp_update_last_login", {"user_id": user["id"]})
        
        # Créer les tokens
        user_data = {
            "id": user["id"],
            "email": user["email"],
            "role": user.get("role", "admin")
        }
        
        access_token = create_access_token(user_data)
        refresh_token = create_refresh_token(str(user["id"]))
        
        # Sauvegarder la session
        self._save_session(str(user["id"]), access_token, refresh_token, ip_address, user_agent)
        
        return {
            "user": {
                "id": str(user["id"]),
                "email": user["email"],
                "full_name": user.get("full_name"),
                "role": user.get("role", "admin")
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def logout(self, token: str) -> bool:
        """Déconnecte un utilisateur (invalide le token)"""
        token_hash = hash_token(token)
        self.db.call_procedure("sp_delete_session", {"token_hash": token_hash})
        return True
    
    async def refresh(self, refresh_token: str) -> Dict[str, Any]:
        """Rafraîchit les tokens"""
        # Décoder le refresh token
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")
        except HTTPException:
            raise
        
        user_id = payload.get("sub")
        
        # Récupérer l'utilisateur
        user = self.users_table.select_one(where={"id": user_id})
        if not user or not user.get("is_active"):
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé ou désactivé")
        
        # Créer de nouveaux tokens
        user_data = {
            "id": user["id"],
            "email": user["email"],
            "role": user.get("role", "admin")
        }
        
        new_access_token = create_access_token(user_data)
        new_refresh_token = create_refresh_token(str(user["id"]))
        
        # Invalider l'ancienne session et créer une nouvelle
        old_hash = hash_token(refresh_token)
        self.sessions_table.delete(where={"refresh_token_hash": old_hash})
        self._save_session(str(user["id"]), new_access_token, new_refresh_token)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    async def get_user(self, token: str) -> Dict[str, Any]:
        """Récupère les infos de l'utilisateur à partir du token"""
        payload = decode_token(token)
        
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token d'accès invalide")
        
        user_id = payload.get("sub")
        
        # Vérifier que la session existe toujours
        token_hash = hash_token(token)
        results = self.db.call_procedure("sp_validate_session", {"token_hash": token_hash})
        
        if not results:
            raise HTTPException(status_code=401, detail="Session expirée ou invalide")
        
        session = results[0]
        
        return {
            "id": str(session["user_id"]),
            "email": session["email"],
            "full_name": session.get("full_name"),
            "role": session.get("role", "admin")
        }
    
    async def change_password(
        self, 
        user_id: str, 
        old_password: str, 
        new_password: str
    ) -> bool:
        """Change le mot de passe d'un utilisateur"""
        # Récupérer l'utilisateur
        user = self.users_table.select_one(where={"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Vérifier l'ancien mot de passe
        if not verify_password(old_password, user["password_hash"], user["password_salt"]):
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
        
        # Valider le nouveau mot de passe
        if len(new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Le nouveau mot de passe doit contenir au moins 6 caractères"
            )
        
        # Générer nouveau sel et hash
        new_salt = generate_salt()
        new_hash = hash_password(new_password, new_salt)
        
        # Mettre à jour
        self.users_table.update(
            data={"password_hash": new_hash, "password_salt": new_salt},
            where={"id": user_id}
        )
        
        # Invalider toutes les sessions de l'utilisateur
        self.sessions_table.delete(where={"user_id": user_id})
        
        return True
    
    def _save_session(
        self, 
        user_id: str, 
        access_token: str, 
        refresh_token: str,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Sauvegarde une session dans la base"""
        expires_at = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS)
        
        self.db.call_procedure("sp_create_session", {
            "user_id": user_id,
            "token_hash": hash_token(access_token),
            "refresh_token_hash": hash_token(refresh_token),
            "expires_at": expires_at.isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent
        })
    
    def _increment_failed_attempts(self, user_id: str):
        """Incrémente le compteur de tentatives échouées"""
        user = self.users_table.select_one(where={"id": user_id})
        if user:
            attempts = (user.get("failed_login_attempts") or 0) + 1
            update_data = {"failed_login_attempts": attempts}
            
            # Verrouiller après 5 tentatives
            if attempts >= 5:
                locked_until = datetime.utcnow() + timedelta(minutes=15)
                update_data["locked_until"] = locked_until.isoformat()
            
            self.users_table.update(data=update_data, where={"id": user_id})


# Instance globale
_auth_service: Optional[AuthService] = None


def get_auth_service() -> AuthService:
    """Retourne le service d'authentification"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service


# =====================================================
# DÉPENDANCES FASTAPI
# =====================================================

async def get_current_user(authorization: str = Header(None)) -> Dict[str, Any]:
    """
    Dépendance FastAPI pour récupérer l'utilisateur authentifié.
    Compatible avec l'ancien système Supabase.
    """
    # Vérifier le mode de base de données
    if settings.DATABASE_MODE == "supabase":
        # Utiliser l'ancien système Supabase
        from app.core.supabase import get_supabase
        
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Non autorisé")
        
        token = authorization.replace("Bearer ", "")
        supabase = get_supabase()
        
        try:
            user_response = supabase.auth.get_user(token)
            if not user_response.user:
                raise HTTPException(status_code=401, detail="Token invalide")
            
            return {
                "id": user_response.user.id,
                "email": user_response.user.email,
                "created_at": str(user_response.user.created_at) if user_response.user.created_at else None
            }
        except Exception as e:
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    else:
        # Utiliser le nouveau système SQL Server
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Non autorisé")
        
        token = authorization.replace("Bearer ", "")
        auth_service = get_auth_service()
        
        return await auth_service.get_user(token)


async def get_optional_user(authorization: str = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Dépendance pour les routes où l'authentification est optionnelle.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
