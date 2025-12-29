"""Endpoints pour le monitoring CPU/GPU en temps réel - Style VU-mètre."""
import os
import asyncio
import time
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import psutil

# Essayer d'importer GPUtil pour les métriques GPU (optionnel)
try:
    import GPUtil
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False
    print("⚠️ GPUtil non disponible - Les métriques GPU ne seront pas affichées")

router = APIRouter(prefix="/metrics", tags=["System Metrics"])

# Stockage des connexions WebSocket actives
active_connections: List[WebSocket] = []

# Historique des métriques pour les graphiques
metrics_history: List[Dict[str, Any]] = []
MAX_HISTORY_SIZE = 120  # 2 minutes à 1 sample/sec

# Compteur de requêtes actives au chatbot
active_chatbot_requests = {"count": 0, "peak": 0}


class SystemMetrics(BaseModel):
    """Métriques système en temps réel."""
    timestamp: str
    
    # CPU
    cpu_percent: float
    cpu_percent_per_core: List[float]
    cpu_count: int
    cpu_freq_current: Optional[float] = None
    cpu_freq_max: Optional[float] = None
    
    # Mémoire
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    memory_available_gb: float
    
    # GPU (si disponible)
    gpu_available: bool
    gpu_percent: Optional[float] = None
    gpu_memory_percent: Optional[float] = None
    gpu_memory_used_mb: Optional[float] = None
    gpu_memory_total_mb: Optional[float] = None
    gpu_temperature: Optional[float] = None
    gpu_name: Optional[str] = None
    
    # Processus
    process_count: int
    
    # Chatbot
    active_requests: int
    peak_requests: int
    
    # Worker info
    worker_pid: int


def get_gpu_metrics() -> Dict[str, Any]:
    """Récupère les métriques GPU si disponible."""
    if not GPU_AVAILABLE:
        return {
            "gpu_available": False,
            "gpu_percent": None,
            "gpu_memory_percent": None,
            "gpu_memory_used_mb": None,
            "gpu_memory_total_mb": None,
            "gpu_temperature": None,
            "gpu_name": None
        }
    
    try:
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]  # Premier GPU
            return {
                "gpu_available": True,
                "gpu_percent": gpu.load * 100,
                "gpu_memory_percent": gpu.memoryUtil * 100,
                "gpu_memory_used_mb": gpu.memoryUsed,
                "gpu_memory_total_mb": gpu.memoryTotal,
                "gpu_temperature": gpu.temperature,
                "gpu_name": gpu.name
            }
    except Exception as e:
        print(f"Erreur GPU: {e}")
    
    return {
        "gpu_available": False,
        "gpu_percent": None,
        "gpu_memory_percent": None,
        "gpu_memory_used_mb": None,
        "gpu_memory_total_mb": None,
        "gpu_temperature": None,
        "gpu_name": None
    }


def collect_metrics() -> SystemMetrics:
    """Collecte toutes les métriques système."""
    # CPU
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
    cpu_count = psutil.cpu_count()
    
    try:
        cpu_freq = psutil.cpu_freq()
        cpu_freq_current = cpu_freq.current if cpu_freq else None
        cpu_freq_max = cpu_freq.max if cpu_freq else None
    except:
        cpu_freq_current = None
        cpu_freq_max = None
    
    # Mémoire
    memory = psutil.virtual_memory()
    
    # GPU
    gpu_metrics = get_gpu_metrics()
    
    # Processus
    process_count = len(psutil.pids())
    
    return SystemMetrics(
        timestamp=datetime.now().isoformat(),
        cpu_percent=cpu_percent,
        cpu_percent_per_core=cpu_per_core,
        cpu_count=cpu_count,
        cpu_freq_current=cpu_freq_current,
        cpu_freq_max=cpu_freq_max,
        memory_percent=memory.percent,
        memory_used_gb=round(memory.used / (1024**3), 2),
        memory_total_gb=round(memory.total / (1024**3), 2),
        memory_available_gb=round(memory.available / (1024**3), 2),
        process_count=process_count,
        active_requests=active_chatbot_requests["count"],
        peak_requests=active_chatbot_requests["peak"],
        worker_pid=os.getpid(),
        **gpu_metrics
    )


@router.get("/current")
async def get_current_metrics() -> SystemMetrics:
    """Retourne les métriques système actuelles."""
    return collect_metrics()


@router.get("/history")
async def get_metrics_history() -> List[Dict[str, Any]]:
    """Retourne l'historique des métriques (2 dernières minutes)."""
    return metrics_history


@router.post("/request/start")
async def start_request():
    """Signal qu'une requête chatbot démarre - incrémente le compteur."""
    active_chatbot_requests["count"] += 1
    if active_chatbot_requests["count"] > active_chatbot_requests["peak"]:
        active_chatbot_requests["peak"] = active_chatbot_requests["count"]
    return {"active": active_chatbot_requests["count"], "peak": active_chatbot_requests["peak"]}


@router.post("/request/end")
async def end_request():
    """Signal qu'une requête chatbot termine - décrémente le compteur."""
    active_chatbot_requests["count"] = max(0, active_chatbot_requests["count"] - 1)
    return {"active": active_chatbot_requests["count"], "peak": active_chatbot_requests["peak"]}


@router.post("/request/reset-peak")
async def reset_peak():
    """Reset le compteur de pic."""
    active_chatbot_requests["peak"] = active_chatbot_requests["count"]
    return {"active": active_chatbot_requests["count"], "peak": active_chatbot_requests["peak"]}


@router.websocket("/ws")
async def websocket_metrics(websocket: WebSocket):
    """WebSocket pour le streaming temps réel des métriques."""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Collecter les métriques
            metrics = collect_metrics()
            metrics_dict = metrics.model_dump()
            
            # Ajouter à l'historique
            metrics_history.append(metrics_dict)
            if len(metrics_history) > MAX_HISTORY_SIZE:
                metrics_history.pop(0)
            
            # Envoyer via WebSocket
            await websocket.send_json(metrics_dict)
            
            # Attendre 500ms avant la prochaine collecte
            await asyncio.sleep(0.5)
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


@router.get("/stress-test")
async def stress_test(duration_seconds: int = 5, intensity: int = 50):
    """
    Lance un stress test CPU pour tester la visualisation.
    intensity: 0-100 (pourcentage d'utilisation cible)
    """
    import threading
    
    def cpu_stress(duration: float, intensity: int):
        end_time = time.time() + duration
        while time.time() < end_time:
            # Calculer combien de temps travailler vs dormir
            work_time = intensity / 100
            sleep_time = (100 - intensity) / 100
            
            # Travail CPU
            start = time.time()
            while time.time() - start < work_time * 0.1:
                _ = sum(i * i for i in range(1000))
            
            # Pause
            time.sleep(sleep_time * 0.1)
    
    # Lancer le stress test dans un thread séparé
    thread = threading.Thread(target=cpu_stress, args=(duration_seconds, intensity))
    thread.start()
    
    return {
        "status": "started",
        "duration_seconds": duration_seconds,
        "intensity": intensity,
        "message": f"Stress test lancé pour {duration_seconds}s à {intensity}% d'intensité"
    }
