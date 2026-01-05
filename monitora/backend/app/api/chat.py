"""
Routes API pour le Chat (test interne)
"""
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
from app.core.supabase import get_supabase
from app.api.workspaces import get_user_from_token
from app.services.rag_pipeline import RAGPipeline

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" ou "assistant"
    content: str

class ChatRequest(BaseModel):
    workspace_id: str
    message: str
    conversation_id: Optional[str] = None
    stream: bool = True

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[dict] = []


@router.post("")
async def chat(
    data: ChatRequest,
    authorization: str = Header(None)
):
    """Endpoint de chat avec streaming"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès au workspace
    workspace_result = supabase.table("workspaces")\
        .select("*")\
        .eq("id", data.workspace_id)\
        .eq("user_id", user.id)\
        .single()\
        .execute()
    
    if not workspace_result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace = workspace_result.data
    
    # Créer ou récupérer la conversation
    if data.conversation_id:
        conv_result = supabase.table("conversations")\
            .select("*")\
            .eq("id", data.conversation_id)\
            .eq("workspace_id", data.workspace_id)\
            .single()\
            .execute()
        
        if not conv_result.data:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        conversation = conv_result.data
    else:
        # Créer une nouvelle conversation
        conv_result = supabase.table("conversations")\
            .insert({
                "workspace_id": data.workspace_id,
                "title": data.message[:50] + "..." if len(data.message) > 50 else data.message
            })\
            .execute()
        conversation = conv_result.data[0]
    
    # Sauvegarder le message utilisateur
    supabase.table("messages").insert({
        "conversation_id": conversation["id"],
        "role": "user",
        "content": data.message
    }).execute()
    
    # Récupérer l'historique
    history_result = supabase.table("messages")\
        .select("role, content")\
        .eq("conversation_id", conversation["id"])\
        .order("created_at")\
        .limit(10)\
        .execute()
    
    history = history_result.data[:-1]  # Exclure le dernier message (celui qu'on vient d'ajouter)
    
    # Créer le pipeline RAG
    rag = RAGPipeline(workspace_id=data.workspace_id, config=workspace.get("rag_config", {}))
    
    if data.stream:
        async def generate():
            full_response = ""
            sources = []
            
            async for chunk in rag.stream_response(data.message, history):
                if chunk.get("type") == "token":
                    full_response += chunk["content"]
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk.get("type") == "sources":
                    sources = chunk["sources"]
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk.get("type") == "error":
                    yield f"data: {json.dumps(chunk)}\n\n"
            
            # Sauvegarder la réponse
            supabase.table("messages").insert({
                "conversation_id": conversation["id"],
                "role": "assistant",
                "content": full_response,
                "metadata": {"sources": sources}
            }).execute()
            
            # Signal de fin
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation['id']})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    else:
        # Non-streaming
        response, sources = await rag.get_response(data.message, history)
        
        # Sauvegarder la réponse
        supabase.table("messages").insert({
            "conversation_id": conversation["id"],
            "role": "assistant",
            "content": response,
            "metadata": {"sources": sources}
        }).execute()
        
        return ChatResponse(
            response=response,
            conversation_id=conversation["id"],
            sources=sources
        )


@router.get("/conversations/{workspace_id}")
async def list_conversations(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Liste toutes les conversations d'un workspace"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès
    workspace_check = supabase.table("workspaces")\
        .select("id")\
        .eq("id", workspace_id)\
        .eq("user_id", user.id)\
        .single()\
        .execute()
    
    if not workspace_check.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    result = supabase.table("conversations")\
        .select("*")\
        .eq("workspace_id", workspace_id)\
        .order("created_at", desc=True)\
        .execute()
    
    return result.data


@router.get("/conversation/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Récupère les messages d'une conversation"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès via le workspace
    conv_result = supabase.table("conversations")\
        .select("*, workspaces!inner(user_id)")\
        .eq("id", conversation_id)\
        .single()\
        .execute()
    
    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conv_result.data["workspaces"]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    messages = supabase.table("messages")\
        .select("*")\
        .eq("conversation_id", conversation_id)\
        .order("created_at")\
        .execute()
    
    return messages.data


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Supprime une conversation"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Vérifier l'accès
    conv_result = supabase.table("conversations")\
        .select("*, workspaces!inner(user_id)")\
        .eq("id", conversation_id)\
        .single()\
        .execute()
    
    if not conv_result.data:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conv_result.data["workspaces"]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Supprimer (cascade vers messages)
    supabase.table("conversations").delete().eq("id", conversation_id).execute()
    
    return {"message": "Conversation supprimée"}
