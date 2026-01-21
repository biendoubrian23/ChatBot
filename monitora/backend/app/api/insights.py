"""
Routes API pour les Insights - SQL Server
Calcule et retourne les métriques d'un workspace
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.core.database import WorkspacesDB, InsightsDB, MessagesDB
from app.core.auth import get_current_user

router = APIRouter()


# =====================================================
# MODÈLES
# =====================================================

class InsightMetrics(BaseModel):
    satisfaction_rate: Optional[float] = None
    avg_rag_score: Optional[float] = None
    low_confidence_count: int = 0
    avg_messages_per_conversation: float = 0
    total_conversations: int = 0
    total_messages: int = 0
    calculated_at: Optional[str] = None


class TopicStats(BaseModel):
    topic_name: str
    message_count: int
    sample_questions: List[str] = []


class LowConfidenceQuestion(BaseModel):
    id: str
    content: str
    rag_score: float
    created_at: str
    is_resolved: bool = False


class InsightsResponse(BaseModel):
    metrics: InsightMetrics
    topics: List[TopicStats] = []
    low_confidence_questions: List[LowConfidenceQuestion] = []


# =====================================================
# ENDPOINTS
# =====================================================

@router.get("/{workspace_id}")
async def get_workspace_insights(
    workspace_id: str,
    days: int = 30,
    user = Depends(get_current_user)
):
    """
    Récupère les insights complets d'un workspace:
    - Métriques de satisfaction et confiance
    - Topics les plus fréquents
    - Questions à faible confiance
    """
    # Vérifier que l'utilisateur possède ce workspace
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Calculer les métriques
    metrics = InsightsDB.calculate_metrics(workspace_id)
    
    # Récupérer les questions à faible confiance
    low_confidence = InsightsDB.get_low_confidence_questions(workspace_id)
    
    return {
        "metrics": metrics,
        "topics": [],  # TODO: Implémenter les topics
        "low_confidence_questions": low_confidence
    }


@router.post("/{workspace_id}/recalculate")
async def recalculate_insights(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Force le recalcul des insights d'un workspace"""
    # Vérifier ownership
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Recalculer les métriques
    try:
        metrics = InsightsDB.calculate_metrics(workspace_id)
        return {"success": True, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workspace_id}/resolve/{message_id}")
async def mark_question_resolved(
    workspace_id: str,
    message_id: str,
    user = Depends(get_current_user)
):
    """Marque une question comme résolue (ajoutée à la documentation)"""
    # Vérifier que l'utilisateur possède ce workspace
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Marquer comme résolu
    success = MessagesDB.mark_resolved(message_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    return {"success": True}


# =====================================================
# NOTE: Les fonctions helper précédentes ont été
# remplacées par InsightsDB dans app/core/database.py
# =====================================================
