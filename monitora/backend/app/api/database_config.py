"""
API pour la gestion des connexions aux bases de données externes.
Permet de configurer, tester et utiliser les BDD des clients.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import json
import base64
from app.core.supabase import get_supabase

router = APIRouter()


# =====================================================
# MODÈLES
# =====================================================

class DatabaseConfig(BaseModel):
    """Configuration de connexion à une base de données externe."""
    db_type: str = "sqlserver"  # sqlserver, mysql, postgres
    db_host: str
    db_name: str
    db_user: str
    db_password: str
    db_port: int = 1433
    schema_type: str = "coollibri"  # coollibri, generic
    is_enabled: bool = True


class DatabaseConfigResponse(BaseModel):
    """Réponse avec la config (sans mot de passe en clair)."""
    id: str
    workspace_id: str
    db_type: str
    db_host: str
    db_name: str
    db_user: str
    db_port: int
    schema_type: str
    is_enabled: bool
    last_test_status: Optional[str]
    last_test_at: Optional[str]


class TestConnectionResult(BaseModel):
    """Résultat du test de connexion."""
    success: bool
    message: str
    server_version: Optional[str] = None
    database: Optional[str] = None


# =====================================================
# HELPERS
# =====================================================

async def get_user_from_token(authorization: str) -> dict:
    """Vérifie le token et retourne l'utilisateur."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorisé")
    
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()
    
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token invalide: {e}")


def encrypt_password(password: str) -> str:
    """Encode le mot de passe en base64 (pour le moment, améliorer avec encryption réelle en prod)."""
    return base64.b64encode(password.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    """Décode le mot de passe."""
    return base64.b64decode(encrypted.encode()).decode()


# =====================================================
# ROUTES
# =====================================================

@router.get("/{workspace_id}/database")
async def get_database_config(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Récupère la configuration de base de données d'un workspace."""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier que l'utilisateur a accès au workspace
    workspace = supabase.table("workspaces")\
        .select("id, user_id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .execute()
    
    if not workspace.data or len(workspace.data) == 0:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Récupérer la config de BDD (sans .single() pour éviter l'erreur 0 rows)
    result = supabase.table("workspace_databases")\
        .select("*")\
        .eq("workspace_id", workspace_id)\
        .execute()
    
    if not result.data or len(result.data) == 0:
        return {"configured": False}
    
    db_config = result.data[0]  # Prendre le premier résultat
    return {
        "configured": True,
        "id": db_config["id"],
        "db_type": db_config["db_type"],
        "db_host": db_config["db_host"],
        "db_name": db_config["db_name"],
        "db_user": db_config["db_user"],
        "db_port": db_config["db_port"],
        "schema_type": db_config["schema_type"],
        "is_enabled": db_config["is_enabled"],
        "last_test_status": db_config.get("last_test_status"),
        "last_test_at": db_config.get("last_test_at")
    }


@router.post("/{workspace_id}/database")
async def save_database_config(
    workspace_id: str,
    config: DatabaseConfig,
    authorization: str = Header(None)
):
    """Sauvegarde la configuration de base de données."""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier accès
    workspace = supabase.table("workspaces")\
        .select("id, user_id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .execute()
    
    if not workspace.data or len(workspace.data) == 0:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Préparer les données
    db_data = {
        "workspace_id": workspace_id,
        "db_type": config.db_type,
        "db_host": config.db_host,
        "db_name": config.db_name,
        "db_user": config.db_user,
        "db_password_encrypted": encrypt_password(config.db_password),
        "db_port": config.db_port,
        "schema_type": config.schema_type,
        "is_enabled": config.is_enabled
    }
    
    # Vérifier si une config existe déjà
    existing = supabase.table("workspace_databases")\
        .select("id")\
        .eq("workspace_id", workspace_id)\
        .execute()
    
    if existing.data and len(existing.data) > 0:
        # Update
        result = supabase.table("workspace_databases")\
            .update(db_data)\
            .eq("id", existing.data[0]["id"])\
            .execute()
    else:
        # Insert
        result = supabase.table("workspace_databases")\
            .insert(db_data)\
            .execute()
    
    return {"success": True, "message": "Configuration sauvegardée"}


@router.post("/{workspace_id}/database/test")
async def test_database_connection(
    workspace_id: str,
    config: Optional[DatabaseConfig] = None,
    authorization: str = Header(None)
):
    """Teste la connexion à la base de données."""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier accès
    workspace = supabase.table("workspaces")\
        .select("id, user_id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .execute()
    
    if not workspace.data or len(workspace.data) == 0:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Récupérer la config existante en base (pour le mot de passe si besoin)
    db_result = supabase.table("workspace_databases")\
        .select("*")\
        .eq("workspace_id", workspace_id)\
        .execute()
    
    db_data = db_result.data[0] if db_result.data and len(db_result.data) > 0 else None
    
    # Si pas de config fournie OU mot de passe vide, utiliser celle en base
    if not config:
        if not db_data:
            raise HTTPException(status_code=400, detail="Aucune configuration de BDD")
        
        config = DatabaseConfig(
            db_type=db_data["db_type"],
            db_host=db_data["db_host"],
            db_name=db_data["db_name"],
            db_user=db_data["db_user"],
            db_password=decrypt_password(db_data["db_password_encrypted"]),
            db_port=db_data["db_port"],
            schema_type=db_data["schema_type"]
        )
    elif not config.db_password and db_data:
        # Config fournie mais sans mot de passe - utiliser celui en base
        config = DatabaseConfig(
            db_type=config.db_type,
            db_host=config.db_host,
            db_name=config.db_name,
            db_user=config.db_user,
            db_password=decrypt_password(db_data["db_password_encrypted"]),
            db_port=config.db_port,
            schema_type=config.schema_type
        )
    
    # Tester la connexion
    try:
        from app.services.external_database import ExternalDatabaseService
        
        db_service = ExternalDatabaseService({
            "db_type": config.db_type,
            "db_host": config.db_host,
            "db_name": config.db_name,
            "db_user": config.db_user,
            "db_password": config.db_password,
            "db_port": config.db_port
        })
        
        result = db_service.test_connection()
        
        # Mettre à jour le statut du test
        from datetime import datetime
        supabase.table("workspace_databases")\
            .update({
                "last_test_status": "success" if result["success"] else "failed",
                "last_test_at": datetime.utcnow().isoformat()
            })\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        if result["success"]:
            return {
                "success": True,
                "message": "Connexion réussie !",
                "server_version": result.get("server_version"),
                "database": result.get("database")
            }
        else:
            return {
                "success": False,
                "message": f"Échec de connexion: {result.get('error')}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Erreur: {str(e)}"
        }


@router.delete("/{workspace_id}/database")
async def delete_database_config(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Supprime la configuration de base de données."""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier accès
    workspace = supabase.table("workspaces")\
        .select("id, user_id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .execute()
    
    if not workspace.data or len(workspace.data) == 0:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    supabase.table("workspace_databases")\
        .delete()\
        .eq("workspace_id", workspace_id)\
        .execute()
    
    return {"success": True, "message": "Configuration supprimée"}
