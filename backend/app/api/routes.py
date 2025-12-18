"""API endpoints for the chatbot."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from typing import List
import json
import asyncio

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexStatus,
    CustomerValidationRequest,
    MessageAnalysisRequest,
    MessageAnalysisResponse
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
        
        response = await pipeline.generate_response(
            query=request.question,
            conversation_id=request.conversation_id,
            history=history_list
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(http_request: Request, request: ChatRequest, pipeline=Depends(get_rag_pipeline)):
    """Handle streaming chat requests.
    
    Args:
        http_request: HTTP request object to detect client disconnection
        request: Chat request with user question and optional conversation history
        pipeline: RAG pipeline instance
        
    Returns:
        Streaming response with answer chunks
    """
    async def generate():
        try:
            # 1. Analyze intent with LLM-First approach
            # Le LLM décide si c'est du suivi de commande ou une question générale
            analysis = await pipeline.message_analyzer.analyze_message(request.question)
            
            # Send analysis to client
            yield f"data: {json.dumps({'type': 'analysis', 'intent': analysis['intent'], 'reasoning': analysis.get('reasoning'), 'order_number': analysis.get('order_number')})}\n\n"
            
            # 2. Handle Order Tracking with SQL
            if analysis['intent'] == 'order_tracking':
                order_number = analysis.get('order_number')
                
                if order_number:
                    # Fetch from database
                    from app.services.database import db_service
                    from app.services.order_logic import generate_order_status_response
                    
                    order_data = db_service.get_order_tracking_details(order_number)
                    
                    if order_data:
                        # Generate response from DB data
                        response_text = generate_order_status_response(
                            order_data, 
                            current_status_id=order_data.get("status_id")
                        )
                        
                        # Stream the SQL response with typing effect
                        for char in response_text:
                            if await http_request.is_disconnected():
                                return
                            yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
                            await asyncio.sleep(0.003)  # Typing effect optimisé (3ms au lieu de 5ms)
                        
                        # Send sources
                        yield f"data: {json.dumps({'type': 'sources', 'sources': [{'content': f'Commande #{order_number}', 'metadata': {'source': 'Base de données CoolLibri'}}]})}\n\n"
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        return
                    else:
                        # Order not found
                        error_msg = f"Je ne trouve pas la commande numéro {order_number} dans notre base de données. Êtes-vous sûr du numéro ?"
                        for char in error_msg:
                            yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        return
                else:
                    # Need order number - ask user
                    ask_msg = "Pour suivre votre commande, j'ai besoin de votre numéro de commande. Pouvez-vous me le donner ?"
                    for char in ask_msg:
                        yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    return
            
            # 3. Standard RAG Flow for general questions
            # Convert history to list of dicts
            history_list = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
            
            # Get context from vectorstore
            context_docs = pipeline.vectorstore.similarity_search(request.question, k=pipeline.top_k)
            context = "\n\n".join([doc.page_content for doc, _ in context_docs])
            
            # Stream the response with disconnect detection
            async for chunk in pipeline.llm_service.generate_response_stream_async(
                query=request.question,
                context=context,
                history=history_list,
                is_disconnected=http_request.is_disconnected
            ):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
            
            # Vérifier avant d'envoyer les sources
            if await http_request.is_disconnected():
                return
            
            # Send sources AFTER the response is complete
            sources = [{"content": doc.page_content, "metadata": doc.metadata} for doc, _ in context_docs]
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except asyncio.CancelledError:
            # Requête annulée (client déconnecté)
            pass
        except Exception as e:
            if not await http_request.is_disconnected():
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/chat/analyze", response_model=MessageAnalysisResponse)
async def analyze_message(request: MessageAnalysisRequest, ollama=Depends(get_ollama_service)):
    """Analyse intelligente d'un message pour détecter l'intention de l'utilisateur.
    
    Détermine si le message concerne :
    - Le suivi d'une commande (avec ou sans numéro)
    - Une question générale sur l'impression de livres
    
    Args:
        request: Message à analyser
        ollama: Service Ollama pour l'analyse LLM
        
    Returns:
        Analyse avec intention, numéro de commande extrait (si présent), 
        et indicateur si un numéro est requis
    """
    try:
        from app.services.message_analyzer import MessageAnalyzer
        
        analyzer = MessageAnalyzer(ollama)
        analysis = await analyzer.analyze_message(request.message)
        
        return MessageAnalysisResponse(**analysis)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur analyse message: {str(e)}"
        )


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
        from app.services.order_logic import generate_order_status_response
        
        tracking_service = OrderTrackingService()
        order_data = tracking_service.get_order_tracking_info(str(order_number))
        
        if not order_data:
            raise HTTPException(
                status_code=404,
                detail=f"Commande #{order_number} introuvable"
            )
        
        # Utiliser la nouvelle logique avec validation de paiement et dates intelligentes
        tracking_response = generate_order_status_response(order_data)
        
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


@router.get("/order/{order_number}/tracking/stream")
async def stream_order_tracking(order_number: int, http_request: Request):
    """
    Stream la réponse de suivi de commande avec un effet de typing naturel.
    
    Args:
        order_number: Numéro de commande
        http_request: HTTP request object to detect client disconnection
    
    Returns:
        Streaming response avec effet typing
    """
    async def generate():
        try:
            from app.services.order_tracking_service import OrderTrackingService
            from app.services.order_logic import generate_order_status_response
            
            tracking_service = OrderTrackingService()
            order_data = tracking_service.get_order_tracking_info(str(order_number))
            
            if not order_data:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Commande #{order_number} introuvable'})}\n\n"
                return
            
            # Étapes de réflexion (effet ChatGPT thinking)
            thinking_steps = [
                "🔍 Recherche de la commande...",
                "📋 Analyse des informations...",
                "📅 dates de production et d'expédi...",
                "⚙️ Récupération du statut de trait...",
                "💳 Contrôle du statut de paiement...",
                "📦 Calcul des estimations de livra..."
            ]
            
            # Envoyer les étapes de thinking
            for step in thinking_steps:
                # Vérifier si le client est toujours connecté
                if await http_request.is_disconnected():
                    return  # Client déconnecté, arrêter proprement
                
                yield f"data: {json.dumps({'type': 'thinking', 'content': step})}\n\n"
                await asyncio.sleep(1.2)  # 1.2 seconde par étape
            
            # Vérifier avant de générer la réponse
            if await http_request.is_disconnected():
                return
            
            # Générer la réponse complète
            tracking_response = generate_order_status_response(order_data)
            
            # Envoyer la réponse finale d'un coup (pas de streaming)
            yield f"data: {json.dumps({'type': 'final_response', 'content': tracking_response})}\n\n"
            
            # Envoyer le signal de fin
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except asyncio.CancelledError:
            # Requête annulée (client déconnecté)
            pass
        except Exception as e:
            if not await http_request.is_disconnected():
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


