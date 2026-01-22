"""
API pour la gestion des connexions aux bases de données externes.
Permet de configurer, tester et utiliser les BDD des clients.
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
import json
import base64
from app.core.auth_sqlserver import get_current_user
from app.core.database import get_db, WorkspacesDB

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
    user = Depends(get_current_user)
):
    """Récupère la configuration de base de données d'un workspace."""
    db = get_db()
    
    # Vérifier que l'utilisateur a accès au workspace
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Récupérer la config de BDD depuis SQL Server
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT * FROM workspace_databases WHERE workspace_id = ?
        """, (workspace_id,))
        row = cursor.fetchone()
        
        if not row:
            return {"configured": False}
        
        columns = [col[0] for col in cursor.description]
        db_config = dict(zip(columns, row))
    
    # Décrypter le mot de passe pour l'afficher
    decrypted_password = ""
    if db_config.get("db_password_encrypted"):
        try:
            decrypted_password = decrypt_password(db_config["db_password_encrypted"])
        except Exception:
            pass
    
    return {
        "configured": True,
        "id": str(db_config["id"]),
        "db_type": db_config.get("db_type", "sqlserver"),
        "db_host": db_config.get("db_host", ""),
        "db_name": db_config.get("db_name", ""),
        "db_user": db_config.get("db_user", ""),
        "db_port": db_config.get("db_port", 1433),
        "db_password": decrypted_password,
        "schema_type": db_config.get("schema_type", "generic"),
        "is_enabled": db_config.get("is_enabled", True),
        "has_password": bool(db_config.get("db_password_encrypted")),
        "last_test_status": db_config.get("last_test_status"),
        "last_test_at": str(db_config.get("last_test_at")) if db_config.get("last_test_at") else None
    }


@router.post("/{workspace_id}/database")
async def save_database_config(
    workspace_id: str,
    config: DatabaseConfig,
    user = Depends(get_current_user)
):
    """Sauvegarde la configuration de base de données."""
    db = get_db()
    
    # Vérifier accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    with db.cursor() as cursor:
        # Vérifier si une config existe déjà
        cursor.execute("""
            SELECT id FROM workspace_databases WHERE workspace_id = ?
        """, (workspace_id,))
        existing = cursor.fetchone()
        
        import uuid
        
        if existing:
            # Update
            cursor.execute("""
                UPDATE workspace_databases SET
                    db_type = ?, db_host = ?, db_name = ?, db_user = ?,
                    db_password_encrypted = ?, db_port = ?, schema_type = ?,
                    is_enabled = ?, updated_at = GETDATE()
                WHERE workspace_id = ?
            """, (
                config.db_type, config.db_host, config.db_name, config.db_user,
                encrypt_password(config.db_password), config.db_port,
                config.schema_type, config.is_enabled, workspace_id
            ))
        else:
            # Insert
            new_id = str(uuid.uuid4()).upper()
            cursor.execute("""
                INSERT INTO workspace_databases (
                    id, workspace_id, db_type, db_host, db_name, db_user,
                    db_password_encrypted, db_port, schema_type, is_enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
            """, (
                new_id, workspace_id, config.db_type, config.db_host,
                config.db_name, config.db_user, encrypt_password(config.db_password),
                config.db_port, config.schema_type, config.is_enabled
            ))
    
    # Le commit est fait automatiquement par le context manager cursor()
    return {"success": True, "message": "Configuration sauvegardée"}


@router.post("/{workspace_id}/database/test")
async def test_database_connection(
    workspace_id: str,
    config: Optional[DatabaseConfig] = None,
    user = Depends(get_current_user)
):
    """Teste la connexion à la base de données."""
    db = get_db()
    
    # Vérifier accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Récupérer la config existante en base (pour le mot de passe si besoin)
    db_data = None
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT * FROM workspace_databases WHERE workspace_id = ?
        """, (workspace_id,))
        row = cursor.fetchone()
        if row:
            columns = [col[0] for col in cursor.description]
            db_data = dict(zip(columns, row))
    
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
            schema_type=db_data.get("schema_type", "generic")
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
        with db.cursor() as cursor:
            cursor.execute("""
                UPDATE workspace_databases SET
                    last_test_status = ?,
                    last_test_at = GETDATE()
                WHERE workspace_id = ?
            """, (
                "success" if result["success"] else "failed",
                workspace_id
            ))
        # Le commit est fait automatiquement par le context manager
        
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
    user = Depends(get_current_user)
):
    """Supprime la configuration de base de données."""
    db = get_db()
    
    # Vérifier accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    with db.cursor() as cursor:
        cursor.execute("""
            DELETE FROM workspace_databases WHERE workspace_id = ?
        """, (workspace_id,))
    
    # Le commit est fait automatiquement par le context manager
    return {"success": True, "message": "Configuration supprimée"}
