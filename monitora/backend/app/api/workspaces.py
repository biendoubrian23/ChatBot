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
    """
    Supprime un workspace et toutes ses données associées en cascade.
    - Documents et chunks indexés
    - Historique des conversations
    - Clés API
    - Configuration de base de données
    - Analytics
    """
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès
    existing = supabase.table("workspaces")\
        .select("id, name")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .execute()
    
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace_name = existing.data[0].get("name", "")
    
    # Suppression en cascade de toutes les tables liées
    # L'ordre est important pour respecter les contraintes de clés étrangères
    # On ignore les erreurs pour les tables qui n'existent pas
    
    try:
        # 1. Supprimer les chunks de documents
        try:
            supabase.table("document_chunks")\
                .delete()\
                .eq("workspace_id", workspace_id)\
                .execute()
        except Exception:
            pass
        
        # 2. Supprimer les documents
        try:
            supabase.table("documents")\
                .delete()\
                .eq("workspace_id", workspace_id)\
                .execute()
        except Exception:
            pass
        
        # 3. Supprimer les conversations et messages
        try:
            supabase.table("conversations")\
                .delete()\
                .eq("workspace_id", workspace_id)\
                .execute()
        except Exception:
            pass
        
        # 4. Supprimer les clés API (si la table existe)
        try:
            supabase.table("api_keys")\
                .delete()\
                .eq("workspace_id", workspace_id)\
                .execute()
        except Exception:
            pass
        
        # 5. Supprimer la configuration de base de données externe
        try:
            supabase.table("workspace_databases")\
                .delete()\
                .eq("workspace_id", workspace_id)\
                .execute()
        except Exception:
            pass
        
        # 6. Supprimer le cache sémantique (si existe)
        try:
            supabase.table("semantic_cache")\
                .delete()\
                .eq("workspace_id", workspace_id)\
                .execute()
        except Exception:
            pass
        
        # 7. Finalement, supprimer le workspace lui-même
        supabase.table("workspaces")\
            .delete()\
            .eq("id", workspace_id)\
            .execute()
        
        return {
            "success": True,
            "message": f"Workspace '{workspace_name}' supprimé avec succès"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur lors de la suppression: {str(e)}"
        )
