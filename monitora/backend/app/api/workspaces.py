"""
Routes API pour les Workspaces - SQL Server uniquement
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from pydantic import BaseModel
from app.core.config import settings, DEFAULT_RAG_CONFIG
from app.core.auth_sqlserver import get_current_user
from app.core.database import WorkspacesDB, get_db, to_json, parse_json, new_uuid

router = APIRouter()

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rag_config: Optional[dict] = None

class RAGConfigUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    top_k: Optional[int] = None
    rerank_top_n: Optional[int] = None
    enable_cache: Optional[bool] = None
    cache_ttl: Optional[int] = None
    similarity_threshold: Optional[float] = None
    system_prompt: Optional[str] = None


# =====================================================
# ROUTES SQL Server
# =====================================================

@router.get("")
async def list_workspaces(user = Depends(get_current_user)):
    """Liste tous les workspaces de l'utilisateur"""
    db = get_db()
    
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT w.*, 
                   (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id) as documents_count,
                   (SELECT COUNT(*) FROM conversations c WHERE c.workspace_id = w.id) as conversations_count
            FROM workspaces w
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        """, (user["id"],))
        
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        workspaces = [dict(zip(columns, row)) for row in rows]
        
        # Parser les colonnes JSON
        for w in workspaces:
            w["rag_config"] = parse_json(w.get("rag_config"))
            w["widget_config"] = parse_json(w.get("widget_config"))
        
        return workspaces


@router.post("")
async def create_workspace(
    data: WorkspaceCreate,
    user = Depends(get_current_user)
):
    """Crée un nouveau workspace"""
    db = get_db()
    workspace_id = new_uuid()
    
    default_widget = {
        "color_accent": "#000000",
        "position": "bottom-right",
        "welcome_message": "Bonjour ! Comment puis-je vous aider ?",
        "chatbot_name": "Assistant"
    }
    
    with db.cursor() as cursor:
        cursor.execute("""
            INSERT INTO workspaces (id, user_id, name, description, rag_config, widget_config, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
        """, (
            workspace_id,
            user["id"],
            data.name,
            data.description,
            to_json(DEFAULT_RAG_CONFIG),
            to_json(default_widget)
        ))
        
        cursor.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        columns = [col[0] for col in cursor.description]
        row = cursor.fetchone()
        result = dict(zip(columns, row))
        result["rag_config"] = parse_json(result.get("rag_config"))
        result["widget_config"] = parse_json(result.get("widget_config"))
        
        return result


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Récupère un workspace par son ID"""
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    return workspace


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    user = Depends(get_current_user)
):
    """Met à jour un workspace"""
    
    # Vérifier l'accès
    existing = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Filtrer les champs non-null
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = WorkspacesDB.update(workspace_id, **update_data)
    return result


@router.patch("/{workspace_id}/rag-config")
async def update_rag_config(
    workspace_id: str,
    config: RAGConfigUpdate,
    user = Depends(get_current_user)
):
    """Met à jour la configuration RAG d'un workspace"""
    
    # Récupérer le workspace actuel
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Fusionner la config
    current_config = workspace.get("rag_config") or {}
    new_config = {k: v for k, v in config.model_dump().items() if v is not None}
    merged_config = {**current_config, **new_config}
    
    result = WorkspacesDB.update(workspace_id, rag_config=merged_config)
    return result


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Supprime un workspace et toutes ses données associées en cascade."""
    
    # Vérifier l'accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace_name = workspace.get("name", "")
    
    try:
        WorkspacesDB.delete(workspace_id)
        return {
            "success": True,
            "message": f"Workspace '{workspace_name}' supprimé avec succès"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression: {str(e)}"
        )
