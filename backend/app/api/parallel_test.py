"""Endpoints pour tester et visualiser le parallélisme des workers."""
import os
import asyncio
import time
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/parallel", tags=["Parallel Testing"])

# Obtenir le PID du worker actuel
WORKER_PID = os.getpid()

class WorkerInfo(BaseModel):
    """Informations sur le worker."""
    worker_pid: int
    timestamp: str
    processing_time_ms: float
    request_id: Optional[str] = None

class TestRequest(BaseModel):
    """Requête de test."""
    delay_seconds: float = 2.0
    request_id: str = "test"

@router.get("/worker-info")
async def get_worker_info() -> WorkerInfo:
    """Retourne les informations du worker actuel."""
    return WorkerInfo(
        worker_pid=WORKER_PID,
        timestamp=datetime.now().isoformat(),
        processing_time_ms=0
    )

@router.post("/simulate-work")
async def simulate_work(request: TestRequest) -> WorkerInfo:
    """
    Simule un travail de longue durée pour tester le parallélisme.
    Chaque worker a son propre PID, donc on peut voir quel worker traite quelle requête.
    """
    start_time = time.time()
    
    # Simuler un travail CPU-bound avec des pauses async
    for i in range(int(request.delay_seconds * 10)):
        await asyncio.sleep(0.1)  # 100ms pause
    
    processing_time = (time.time() - start_time) * 1000
    
    return WorkerInfo(
        worker_pid=WORKER_PID,
        timestamp=datetime.now().isoformat(),
        processing_time_ms=processing_time,
        request_id=request.request_id
    )

@router.get("/quick-ping")
async def quick_ping() -> dict:
    """Ping rapide pour tester la distribution des requêtes."""
    return {
        "worker_pid": WORKER_PID,
        "timestamp": datetime.now().isoformat(),
        "message": f"Handled by worker {WORKER_PID}"
    }
