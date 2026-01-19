"""
Routes API pour l'authentification SQL Server
Remplace l'authentification Supabase
"""
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.auth_sqlserver import get_auth_service, get_current_user
from app.core.config import settings

router = APIRouter()


# =====================================================
# MODÈLES
# =====================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class AuthResponse(BaseModel):
    user: dict
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str


# =====================================================
# ROUTES
# =====================================================

@router.post("/register", response_model=AuthResponse)
async def register(data: RegisterRequest, request: Request):
    """
    Inscrit un nouvel utilisateur.
    Crée un compte avec le rôle 'admin' par défaut.
    """
    auth_service = get_auth_service()
    
    result = await auth_service.register(
        email=data.email,
        password=data.password,
        full_name=data.full_name
    )
    
    return result


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, request: Request):
    """
    Authentifie un utilisateur et retourne les tokens.
    """
    auth_service = get_auth_service()
    
    # Récupérer l'IP et le user agent
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    result = await auth_service.login(
        email=data.email,
        password=data.password,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return result


@router.post("/logout")
async def logout(authorization: str = Header(None)):
    """
    Déconnecte l'utilisateur (invalide le token).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorisé")
    
    token = authorization.replace("Bearer ", "")
    auth_service = get_auth_service()
    
    await auth_service.logout(token)
    
    return {"success": True, "message": "Déconnexion réussie"}


@router.post("/refresh")
async def refresh_token(data: RefreshRequest):
    """
    Rafraîchit les tokens d'accès.
    """
    auth_service = get_auth_service()
    
    result = await auth_service.refresh(data.refresh_token)
    
    return result


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(authorization: str = Header(None)):
    """
    Retourne les informations de l'utilisateur connecté.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorisé")
    
    token = authorization.replace("Bearer ", "")
    auth_service = get_auth_service()
    
    user = await auth_service.get_user(token)
    
    return user


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    authorization: str = Header(None)
):
    """
    Change le mot de passe de l'utilisateur connecté.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorisé")
    
    token = authorization.replace("Bearer ", "")
    auth_service = get_auth_service()
    
    # Récupérer l'utilisateur
    user = await auth_service.get_user(token)
    
    # Changer le mot de passe
    await auth_service.change_password(
        user_id=user["id"],
        old_password=data.old_password,
        new_password=data.new_password
    )
    
    return {"success": True, "message": "Mot de passe modifié avec succès"}


# =====================================================
# ROUTE DE VÉRIFICATION
# =====================================================

@router.get("/verify")
async def verify_token(authorization: str = Header(None)):
    """
    Vérifie si le token est valide.
    Utile pour le frontend pour vérifier l'état de connexion.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return {"valid": False, "message": "Token manquant"}
    
    try:
        token = authorization.replace("Bearer ", "")
        auth_service = get_auth_service()
        user = await auth_service.get_user(token)
        
        return {
            "valid": True,
            "user": user
        }
    except HTTPException as e:
        return {"valid": False, "message": e.detail}


# =====================================================
# ROUTE DE SANTÉ
# =====================================================

@router.get("/health")
async def auth_health():
    """
    Vérifie que le service d'authentification fonctionne.
    """
    try:
        from app.core.sqlserver import get_sqlserver
        db = get_sqlserver()
        result = db.test_connection()
        
        return {
            "status": "ok" if result["success"] else "error",
            "database": result.get("database"),
            "mode": settings.DATABASE_MODE
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "mode": settings.DATABASE_MODE
        }
