"""
Routes API pour les Workspaces
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
from app.core.supabase import get_supabase

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
    system_prompt: Optional[str] = None  # Prompt personnalisé du chatbot


async def get_user_from_token(authorization: str) -> dict:
    """Vérifie le token et retourne l'utilisateur"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non autorisé")
    
    token = authorization.replace("Bearer ", "")
    supabase = get_supabase()
    
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide")


@router.get("")
async def list_workspaces(authorization: str = Header(None)):
    """Liste tous les workspaces de l'utilisateur"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    result = supabase.table("workspaces")\
        .select("*")\
        .eq("user_id", user.id)\
        .order("created_at", desc=True)\
        .execute()
    
    return result.data


@router.post("")
async def create_workspace(
    data: WorkspaceCreate,
    authorization: str = Header(None)
):
    """Crée un nouveau workspace"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    from app.core.config import DEFAULT_RAG_CONFIG
    
    workspace_data = {
        "name": data.name,
        "description": data.description,
        "user_id": user.id,
        "rag_config": DEFAULT_RAG_CONFIG
    }
    
    result = supabase.table("workspaces")\
        .insert(workspace_data)\
        .execute()
    
    return result.data[0]


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Récupère un workspace par son ID"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    result = supabase.table("workspaces")\
        .select("*")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    return result.data


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    authorization: str = Header(None)
):
    """Met à jour un workspace"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès
    existing = supabase.table("workspaces")\
        .select("id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .single()\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Filtrer les champs non-null
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = supabase.table("workspaces")\
        .update(update_data)\
        .eq("id", workspace_id)\
        .execute()
    
    return result.data[0]


@router.patch("/{workspace_id}/rag-config")
async def update_rag_config(
    workspace_id: str,
    config: RAGConfigUpdate,
    authorization: str = Header(None)
):
    """Met à jour la configuration RAG d'un workspace"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Récupérer le workspace actuel
    existing = supabase.table("workspaces")\
        .select("rag_config")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .single()\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Fusionner la config existante avec les nouvelles valeurs
    current_config = existing.data.get("rag_config", {})
    new_config = {k: v for k, v in config.model_dump().items() if v is not None}
    merged_config = {**current_config, **new_config}
    
    result = supabase.table("workspaces")\
        .update({"rag_config": merged_config})\
        .eq("id", workspace_id)\
        .execute()
    
    return result.data[0]


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Supprime un workspace"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès
    existing = supabase.table("workspaces")\
        .select("id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .single()\
        .execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Supprimer le workspace (cascade vers documents, conversations, etc.)
    supabase.table("workspaces")\
        .delete()\
        .eq("id", workspace_id)\
        .execute()
    
    return {"message": "Workspace supprimé"}
