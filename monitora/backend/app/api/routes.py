"""MONITORA Backend - API Routes"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
import os
import json

from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.services.vectorstore import vectorstore_manager, DocumentProcessor
from app.services.rag_pipeline import RAGPipelineManager

router = APIRouter()


# =============================================================================
# Pydantic Models
# =============================================================================

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    visitor_id: Optional[str] = None
    page_url: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    conversation_id: str
    processing_time: float


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
    context_template: Optional[str] = None


class IndexDocumentRequest(BaseModel):
    document_id: str


# =============================================================================
# Helper Functions
# =============================================================================

async def verify_api_key(x_api_key: str = Header(...)) -> Dict[str, Any]:
    """Verify workspace API key and return workspace info."""
    supabase = get_supabase_client()
    
    result = supabase.table('workspaces').select('*').eq('api_key', x_api_key).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    if not result.data.get('is_active'):
        raise HTTPException(status_code=403, detail="Workspace is inactive")
    
    return result.data


async def get_workspace_rag_config(workspace_id: str) -> Dict[str, Any]:
    """Get RAG configuration for a workspace."""
    supabase = get_supabase_client()
    
    result = supabase.table('workspace_rag_config').select('*').eq('workspace_id', workspace_id).single().execute()
    
    if not result.data:
        # Return defaults if no config exists
        return {
            'llm_provider': 'mistral',
            'llm_model': 'mistral-small-latest',
            'temperature': 0.1,
            'max_tokens': 900,
            'top_p': 1.0,
            'chunk_size': 1500,
            'chunk_overlap': 300,
            'top_k': 8,
            'rerank_top_n': 5,
            'enable_cache': True,
            'cache_ttl': 7200,
            'similarity_threshold': 0.92,
            'system_prompt': 'Tu es un assistant virtuel serviable et précis.',
            'context_template': 'Contexte:\n{context}\n\nQuestion: {question}'
        }
    
    return result.data


# =============================================================================
# Widget Endpoints (public, API key auth)
# =============================================================================

@router.get("/widget/config/{workspace_id}")
async def get_widget_config(workspace_id: str):
    """Get widget configuration for a workspace (public)."""
    supabase = get_supabase_client()
    
    result = supabase.table('workspaces').select(
        'id, settings, is_active, is_public'
    ).eq('id', workspace_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if not result.data.get('is_public'):
        raise HTTPException(status_code=403, detail="Workspace is not public")
    
    settings_data = result.data.get('settings', {})
    
    return {
        "bot_name": settings_data.get('bot_name', 'Assistant'),
        "welcome_message": settings_data.get('welcome_message', 'Bonjour !'),
        "placeholder": settings_data.get('placeholder', 'Tapez votre message...'),
        "primary_color": settings_data.get('primary_color', '#000000'),
        "position": settings_data.get('position', 'bottom-right'),
    }


@router.post("/widget/chat")
async def widget_chat(
    request: ChatRequest,
    x_api_key: str = Header(...)
):
    """Chat endpoint for widget."""
    # Verify API key
    workspace = await verify_api_key(x_api_key)
    workspace_id = workspace['id']
    
    # Get RAG config
    config = await get_workspace_rag_config(workspace_id)
    
    # Get or create conversation
    supabase = get_supabase_client()
    conversation_id = request.conversation_id
    
    if not conversation_id:
        # Create new conversation
        conv_result = supabase.table('conversations').insert({
            'workspace_id': workspace_id,
            'visitor_id': request.visitor_id or f"anon_{uuid.uuid4().hex[:8]}",
            'page_url': request.page_url,
        }).execute()
        conversation_id = conv_result.data[0]['id']
    
    # Get RAG pipeline
    pipeline = RAGPipelineManager.get_pipeline(workspace_id, config)
    
    # Generate response
    result = await pipeline.generate_response(
        query=request.message,
        history=request.history
    )
    
    # Save messages to database
    supabase.table('messages').insert([
        {
            'conversation_id': conversation_id,
            'role': 'user',
            'content': request.message,
        },
        {
            'conversation_id': conversation_id,
            'role': 'assistant',
            'content': result['answer'],
            'sources': result['sources'],
            'processing_time_ms': int(result['processing_time'] * 1000),
        }
    ]).execute()
    
    # Update conversation stats
    supabase.rpc('increment_workspace_stats', {
        'workspace_id': workspace_id,
        'conv_count': 0,
        'msg_count': 2
    }).execute()
    
    return ChatResponse(
        answer=result['answer'],
        sources=result['sources'],
        conversation_id=conversation_id,
        processing_time=result['processing_time']
    )


@router.post("/widget/chat/stream")
async def widget_chat_stream(
    request: ChatRequest,
    x_api_key: str = Header(...)
):
    """Streaming chat endpoint for widget."""
    workspace = await verify_api_key(x_api_key)
    workspace_id = workspace['id']
    config = await get_workspace_rag_config(workspace_id)
    
    pipeline = RAGPipelineManager.get_pipeline(workspace_id, config)
    
    async def generate():
        full_response = ""
        async for token in pipeline.generate_response_stream(
            query=request.message,
            history=request.history
        ):
            full_response += token
            yield f"data: {json.dumps({'token': token})}\n\n"
        
        yield f"data: {json.dumps({'done': True, 'full_response': full_response})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


# =============================================================================
# Dashboard Endpoints (authenticated)
# =============================================================================

@router.get("/workspaces/{workspace_id}/rag-config")
async def get_rag_config(workspace_id: str):
    """Get RAG configuration for a workspace."""
    config = await get_workspace_rag_config(workspace_id)
    return config


@router.put("/workspaces/{workspace_id}/rag-config")
async def update_rag_config(workspace_id: str, update: RAGConfigUpdate):
    """Update RAG configuration for a workspace."""
    supabase = get_supabase_client()
    
    # Build update dict with only provided fields
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table('workspace_rag_config').update(update_data).eq(
        'workspace_id', workspace_id
    ).execute()
    
    # Invalidate cached pipeline
    RAGPipelineManager.invalidate(workspace_id)
    
    return {"success": True, "updated": list(update_data.keys())}


@router.post("/workspaces/{workspace_id}/documents/upload")
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...)
):
    """Upload a document for a workspace."""
    supabase = get_supabase_client()
    
    # Validate file type
    allowed_types = ['pdf', 'txt', 'md', 'docx']
    file_ext = file.filename.split('.')[-1].lower()
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {allowed_types}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = f"{workspace_id}/{unique_filename}"
    
    # Save file locally (in production, use Supabase Storage)
    local_dir = os.path.join(settings.documents_base_path, workspace_id)
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, unique_filename)
    
    content = await file.read()
    with open(local_path, 'wb') as f:
        f.write(content)
    
    # Create document record
    doc_result = supabase.table('documents').insert({
        'workspace_id': workspace_id,
        'filename': unique_filename,
        'original_name': file.filename,
        'file_path': file_path,
        'file_type': file_ext,
        'file_size': len(content),
        'mime_type': file.content_type,
        'status': 'pending'
    }).execute()
    
    return {
        "success": True,
        "document_id": doc_result.data[0]['id'],
        "filename": file.filename,
        "status": "pending"
    }


@router.post("/workspaces/{workspace_id}/documents/{document_id}/index")
async def index_document(workspace_id: str, document_id: str):
    """Index a document into the workspace's vector store."""
    supabase = get_supabase_client()
    
    # Get document
    doc_result = supabase.table('documents').select('*').eq('id', document_id).single().execute()
    
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = doc_result.data
    
    # Update status to indexing
    supabase.table('documents').update({
        'status': 'indexing',
        'indexing_started_at': 'now()'
    }).eq('id', document_id).execute()
    
    try:
        # Get RAG config for chunking parameters
        config = await get_workspace_rag_config(workspace_id)
        
        # Process document
        processor = DocumentProcessor(
            chunk_size=config.get('chunk_size', 1500),
            chunk_overlap=config.get('chunk_overlap', 300)
        )
        
        local_path = os.path.join(
            settings.documents_base_path, 
            workspace_id, 
            doc['filename']
        )
        
        chunks = processor.process_file(
            file_path=local_path,
            file_type=doc['file_type'],
            metadata={
                'source': doc['original_name'],
                'document_id': document_id,
                'workspace_id': workspace_id
            }
        )
        
        # Add to vector store
        vectorstore = vectorstore_manager.get_store(workspace_id)
        count = vectorstore.add_documents(chunks)
        
        # Update document status
        supabase.table('documents').update({
            'status': 'indexed',
            'chunks_count': count,
            'indexed_at': 'now()'
        }).eq('id', document_id).execute()
        
        return {
            "success": True,
            "chunks_count": count,
            "status": "indexed"
        }
        
    except Exception as e:
        # Update status to error
        supabase.table('documents').update({
            'status': 'error',
            'error_message': str(e)
        }).eq('id', document_id).execute()
        
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workspaces/{workspace_id}/reindex")
async def reindex_all_documents(workspace_id: str):
    """Reindex all documents in a workspace."""
    supabase = get_supabase_client()
    
    # Clear existing vector store
    vectorstore = vectorstore_manager.get_store(workspace_id)
    vectorstore.clear()
    
    # Get all indexed documents
    docs_result = supabase.table('documents').select('*').eq(
        'workspace_id', workspace_id
    ).eq('status', 'indexed').execute()
    
    if not docs_result.data:
        return {"success": True, "documents_reindexed": 0}
    
    # Get config
    config = await get_workspace_rag_config(workspace_id)
    processor = DocumentProcessor(
        chunk_size=config.get('chunk_size', 1500),
        chunk_overlap=config.get('chunk_overlap', 300)
    )
    
    total_chunks = 0
    
    for doc in docs_result.data:
        try:
            local_path = os.path.join(
                settings.documents_base_path,
                workspace_id,
                doc['filename']
            )
            
            chunks = processor.process_file(
                file_path=local_path,
                file_type=doc['file_type'],
                metadata={
                    'source': doc['original_name'],
                    'document_id': doc['id'],
                    'workspace_id': workspace_id
                }
            )
            
            count = vectorstore.add_documents(chunks)
            total_chunks += count
            
            # Update chunk count
            supabase.table('documents').update({
                'chunks_count': count,
                'indexed_at': 'now()'
            }).eq('id', doc['id']).execute()
            
        except Exception as e:
            print(f"Error reindexing document {doc['id']}: {e}")
    
    return {
        "success": True,
        "documents_reindexed": len(docs_result.data),
        "total_chunks": total_chunks
    }


@router.get("/workspaces/{workspace_id}/stats")
async def get_workspace_stats(workspace_id: str):
    """Get statistics for a workspace."""
    vectorstore = vectorstore_manager.get_store(workspace_id)
    
    return {
        "documents_count": vectorstore.count(),
        "workspace_id": workspace_id
    }


@router.post("/workspaces/{workspace_id}/chat/test")
async def test_chat(workspace_id: str, request: ChatRequest):
    """Test chat endpoint for dashboard testing."""
    config = await get_workspace_rag_config(workspace_id)
    pipeline = RAGPipelineManager.get_pipeline(workspace_id, config)
    
    result = await pipeline.generate_response(
        query=request.message,
        history=request.history
    )
    
    return {
        "answer": result['answer'],
        "sources": result['sources'],
        "processing_time": result['processing_time'],
        "documents_retrieved": result.get('documents_retrieved', 0),
        "documents_used": result.get('documents_used', 0),
        "config_used": {
            "llm_provider": config.get('llm_provider'),
            "llm_model": config.get('llm_model'),
            "temperature": config.get('temperature'),
            "top_k": config.get('top_k'),
            "rerank_top_n": config.get('rerank_top_n'),
        }
    }


class TestChatRequest(BaseModel):
    """Request model for test chat with workspace_id in body."""
    message: str
    workspace_id: str
    history: Optional[List[Dict[str, str]]] = None


@router.post("/test/chat")
async def test_chat_direct(request: TestChatRequest):
    """Test chat endpoint for dashboard - workspace_id in body."""
    config = await get_workspace_rag_config(request.workspace_id)
    pipeline = RAGPipelineManager.get_pipeline(request.workspace_id, config)
    
    result = await pipeline.generate_response(
        query=request.message,
        history=request.history
    )
    
    return {
        "answer": result['answer'],
        "sources": result['sources'],
        "processing_time": result['processing_time'],
        "documents_retrieved": result.get('documents_retrieved', 0),
        "documents_used": result.get('documents_used', 0),
        "config_used": {
            "llm_provider": config.get('llm_provider'),
            "llm_model": config.get('llm_model'),
            "temperature": config.get('temperature'),
            "top_k": config.get('top_k'),
            "rerank_top_n": config.get('rerank_top_n'),
        }
    }
