"""API endpoints for the chatbot."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List
import json

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexStatus
)
from app.core.config import settings

router = APIRouter()

# These will be initialized in main.py
rag_pipeline = None
ollama_service = None
vectorstore = None


def get_rag_pipeline():
    """Dependency to get RAG pipeline instance."""
    if rag_pipeline is None:
        raise HTTPException(status_code=503, detail="RAG pipeline not initialized")
    return rag_pipeline


def get_ollama_service():
    """Dependency to get Ollama service instance."""
    if ollama_service is None:
        raise HTTPException(status_code=503, detail="Ollama service not initialized")
    return ollama_service


def get_vectorstore():
    """Dependency to get vector store instance."""
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="Vector store not initialized")
    return vectorstore


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, pipeline=Depends(get_rag_pipeline)):
    """Handle chat requests.
    
    Args:
        request: Chat request with user question and optional conversation history
        pipeline: RAG pipeline instance
        
    Returns:
        Chat response with answer and sources
    """
    try:
        # Convert history to list of dicts for the pipeline
        history_list = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
        
        response = pipeline.generate_response(
            query=request.question,
            conversation_id=request.conversation_id,
            history=history_list
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, pipeline=Depends(get_rag_pipeline)):
    """Handle streaming chat requests.
    
    Args:
        request: Chat request with user question and optional conversation history
        pipeline: RAG pipeline instance
        
    Returns:
        Streaming response with answer chunks
    """
    async def generate():
        try:
            # Convert history to list of dicts
            history_list = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
            
            # Get context from vectorstore
            context_docs = pipeline.vectorstore.similarity_search(request.question, k=pipeline.top_k)
            context = "\n\n".join([doc.page_content for doc, _ in context_docs])
            
            # Stream the response FIRST
            for chunk in pipeline.llm_service.generate_response_stream(
                query=request.question,
                context=context,
                history=history_list
            ):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
            
            # Send sources AFTER the response is complete
            sources = [{"content": doc.page_content, "metadata": doc.metadata} for doc, _ in context_docs]
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/health", response_model=HealthResponse)
async def health_check(
    ollama=Depends(get_ollama_service),
    vs=Depends(get_vectorstore)
):
    """Health check endpoint.
    
    Returns:
        Health status of all services
    """
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        ollama_available=ollama.is_available(),
        vectorstore_loaded=vs.count() > 0
    )


@router.get("/stats")
async def get_stats(vs=Depends(get_vectorstore)):
    """Get statistics about the vector store.
    
    Returns:
        Statistics including document count
    """
    return {
        "total_documents": vs.count(),
        "collection_name": vs.collection_name
    }
