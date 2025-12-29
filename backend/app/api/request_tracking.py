"""Tracking des requêtes chatbot en temps réel pour le Parallel Monitor."""
import os
import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter(prefix="/tracking", tags=["Request Tracking"])

# Stockage global des requêtes actives
active_requests: Dict[str, Dict[str, Any]] = {}

# WebSocket connections pour le broadcast
monitor_connections: List[WebSocket] = []

# Historique des requêtes complétées
completed_requests: List[Dict[str, Any]] = []
MAX_HISTORY = 50


class RequestStart(BaseModel):
    """Données pour démarrer le tracking d'une requête."""
    question: str
    session_id: Optional[str] = None
    source: str = "frontend"  # frontend, monitor, api


class RequestUpdate(BaseModel):
    """Mise à jour d'une requête en cours."""
    request_id: str
    status: str  # processing, streaming, completed, error
    response_preview: Optional[str] = None
    tokens_count: Optional[int] = None
    error_message: Optional[str] = None


class RequestEnd(BaseModel):
    """Données pour terminer le tracking d'une requête."""
    request_id: str
    response: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None


async def broadcast_to_monitors(event_type: str, data: Dict[str, Any]):
    """Broadcast un événement à tous les monitors connectés."""
    message = {
        "type": event_type,
        "timestamp": datetime.now().isoformat(),
        "worker_pid": os.getpid(),
        **data
    }
    
    disconnected = []
    for ws in monitor_connections:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    
    # Nettoyer les connexions fermées
    for ws in disconnected:
        if ws in monitor_connections:
            monitor_connections.remove(ws)


@router.post("/start")
async def start_tracking(request: RequestStart) -> Dict[str, Any]:
    """Démarre le tracking d'une nouvelle requête."""
    request_id = str(uuid.uuid4())[:8]
    start_time = datetime.now()
    
    request_data = {
        "request_id": request_id,
        "question": request.question,
        "session_id": request.session_id,
        "source": request.source,
        "status": "pending",
        "start_time": start_time.isoformat(),
        "start_timestamp": start_time.timestamp() * 1000,  # ms pour JS
        "worker_pid": os.getpid(),
        "response_preview": "",
        "tokens_count": 0
    }
    
    active_requests[request_id] = request_data
    
    # Broadcast aux monitors
    await broadcast_to_monitors("request_start", request_data)
    
    return {"request_id": request_id, "status": "tracking_started"}


@router.post("/update")
async def update_tracking(update: RequestUpdate) -> Dict[str, Any]:
    """Met à jour le statut d'une requête en cours."""
    if update.request_id not in active_requests:
        return {"error": "Request not found"}
    
    request_data = active_requests[update.request_id]
    request_data["status"] = update.status
    
    if update.response_preview:
        request_data["response_preview"] = update.response_preview[:200]
    if update.tokens_count:
        request_data["tokens_count"] = update.tokens_count
    if update.error_message:
        request_data["error_message"] = update.error_message
    
    # Broadcast aux monitors
    await broadcast_to_monitors("request_update", {
        "request_id": update.request_id,
        "status": update.status,
        "response_preview": request_data.get("response_preview", ""),
        "tokens_count": request_data.get("tokens_count", 0)
    })
    
    return {"status": "updated"}


@router.post("/end")
async def end_tracking(end: RequestEnd) -> Dict[str, Any]:
    """Termine le tracking d'une requête."""
    if end.request_id not in active_requests:
        return {"error": "Request not found"}
    
    request_data = active_requests.pop(end.request_id)
    end_time = datetime.now()
    
    request_data["status"] = "completed" if end.success else "error"
    request_data["end_time"] = end_time.isoformat()
    request_data["end_timestamp"] = end_time.timestamp() * 1000
    request_data["duration_ms"] = int(end_time.timestamp() * 1000 - request_data["start_timestamp"])
    
    if end.response:
        request_data["response_preview"] = end.response[:200]
    if end.error_message:
        request_data["error_message"] = end.error_message
    
    # Ajouter à l'historique
    completed_requests.insert(0, request_data)
    if len(completed_requests) > MAX_HISTORY:
        completed_requests.pop()
    
    # Broadcast aux monitors
    await broadcast_to_monitors("request_end", request_data)
    
    return {"status": "completed", "duration_ms": request_data["duration_ms"]}


@router.get("/active")
async def get_active_requests() -> List[Dict[str, Any]]:
    """Retourne la liste des requêtes actives."""
    return list(active_requests.values())


@router.get("/history")
async def get_request_history() -> List[Dict[str, Any]]:
    """Retourne l'historique des requêtes complétées."""
    return completed_requests


@router.delete("/clear")
async def clear_history():
    """Efface l'historique des requêtes."""
    completed_requests.clear()
    await broadcast_to_monitors("history_cleared", {})
    return {"status": "cleared"}


@router.websocket("/ws")
async def websocket_tracking(websocket: WebSocket):
    """WebSocket pour recevoir les événements de requêtes en temps réel."""
    await websocket.accept()
    monitor_connections.append(websocket)
    
    # Envoyer l'état initial
    await websocket.send_json({
        "type": "init",
        "active_requests": list(active_requests.values()),
        "history": completed_requests[:20],
        "timestamp": datetime.now().isoformat()
    })
    
    try:
        # Garder la connexion ouverte
        while True:
            # Attendre des messages (heartbeat ou commandes)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
            except asyncio.TimeoutError:
                # Envoyer un heartbeat
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Tracking WebSocket error: {e}")
    finally:
        if websocket in monitor_connections:
            monitor_connections.remove(websocket)
