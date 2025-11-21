"""API endpoints for the chatbot."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List
import json

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexStatus,
    CustomerValidationRequest
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


@router.get("/order/{order_number}")
async def get_order(order_number: int, last_name: str = None):
    """
    Récupérer les détails d'une commande par son numéro.
    
    Args:
        order_number: Numéro de commande (OrderId)
        last_name: Nom de famille (optionnel pour validation)
    
    Returns:
        Détails complets de la commande
    """
    try:
        from app.services.database import db_service
        
        order_data = db_service.get_order_by_number(str(order_number), last_name)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur base de données: {str(e)}"
        )
    
    if not order_data:
        raise HTTPException(
            status_code=404,
            detail=f"Commande #{order_number} introuvable"
        )
    
    # Validation optionnelle du nom de famille
    if last_name and order_data.get("customer", {}).get("name"):
        customer_name = order_data["customer"]["name"].lower()
        if last_name.lower() not in customer_name:
            raise HTTPException(
                status_code=403,
                detail="Le nom ne correspond pas à cette commande"
            )
    
    return order_data


@router.post("/order/validate-customer")
async def validate_customer_name(request: CustomerValidationRequest):
    """
    Valide le nom/prénom du client pour une commande.
    
    Args:
        order_number: Numéro de commande
        customer_name: Nom ou prénom saisi par le client
    
    Returns:
        Validation et message d'erreur si invalide
    """
    try:
        from app.services.order_tracking_service import OrderTrackingService
        
        tracking_service = OrderTrackingService()
        is_valid, full_name, error_message = tracking_service.validate_customer_name(
            str(request.order_number), 
            request.customer_name
        )
        
        if is_valid:
            return {
                "valid": True,
                "customer_name": full_name
            }
        else:
            return {
                "valid": False,
                "error_message": error_message
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur validation: {str(e)}"
        )


@router.get("/order/{order_number}/tracking")
async def get_order_tracking(order_number: int):
    """
    Génère une réponse intelligente de suivi de commande.
    
    Args:
        order_number: Numéro de commande
    
    Returns:
        Réponse formatée avec toutes les informations de suivi
    """
    try:
        from app.services.order_tracking_service import OrderTrackingService
        
        tracking_service = OrderTrackingService()
        order_data = tracking_service.get_order_tracking_info(str(order_number))
        
        if not order_data:
            raise HTTPException(
                status_code=404,
                detail=f"Commande #{order_number} introuvable"
            )
        
        tracking_response = tracking_service.generate_tracking_response(order_data)
        
        return {
            "order_number": order_number,
            "tracking_response": tracking_response,
            "order_data": order_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur génération tracking: {str(e)}"
        )


