"""
Authentification - Helpers pour vérifier les tokens
"""
from fastapi import HTTPException, Header
from app.core.supabase import get_supabase


async def get_current_user(authorization: str = Header(None)):
    """
    Dépendance FastAPI pour récupérer l'utilisateur authentifié.
    Vérifie le token Bearer et retourne les infos utilisateur.
    """
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
