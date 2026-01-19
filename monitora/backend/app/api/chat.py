"""
Routes API pour le Chat (test interne) - SQL Server
"""
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import json
from app.core.database import WorkspacesDB, ConversationsDB, MessagesDB
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
    
    # Vérifier l'accès au workspace
    workspace = WorkspacesDB.get_by_id_and_user(data.workspace_id, user.id)
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Créer ou récupérer la conversation
    if data.conversation_id:
        conversation = ConversationsDB.get_by_id(data.conversation_id)
        
        if not conversation or conversation.get('workspace_id') != data.workspace_id:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
    else:
        # Créer une nouvelle conversation
        title = data.message[:50] + "..." if len(data.message) > 50 else data.message
        conversation = ConversationsDB.create(data.workspace_id, title)
    
    # Sauvegarder le message utilisateur
    MessagesDB.create(conversation["id"], "user", data.message)
    
    # Récupérer l'historique
    history = MessagesDB.get_by_conversation(conversation["id"], limit=10)
    history = [{"role": m["role"], "content": m["content"]} for m in history[:-1]]  # Exclure le dernier
    
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
            MessagesDB.create(
                conversation["id"], 
                "assistant", 
                full_response, 
                metadata={"sources": sources}
            )
            
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
        MessagesDB.create(
            conversation["id"], 
            "assistant", 
            response, 
            metadata={"sources": sources}
        )
        
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
    
    # Vérifier l'accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user.id)
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    conversations = ConversationsDB.get_by_workspace(workspace_id)
    return conversations


@router.get("/conversation/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Récupère les messages d'une conversation"""
    user = await get_user_from_token(authorization)
    
    # Vérifier l'accès via le workspace
    conversation = ConversationsDB.get_with_workspace_owner(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conversation.get("workspace_user_id") != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    messages = MessagesDB.get_by_conversation(conversation_id)
    return messages


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Supprime une conversation"""
    user = await get_user_from_token(authorization)
    
    # Vérifier l'accès
    conversation = ConversationsDB.get_with_workspace_owner(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    if conversation.get("workspace_user_id") != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Supprimer (cascade vers messages)
    ConversationsDB.delete(conversation_id)
    
    return {"message": "Conversation supprimée"}
