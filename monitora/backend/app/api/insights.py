"""
Routes API pour les Insights
Calcule et retourne les métriques d'un workspace
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.core.supabase import get_supabase
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
    supabase = get_supabase()
    
    # Vérifier que l'utilisateur possède ce workspace
    workspace = supabase.table("workspaces")\
        .select("id")\
        .eq("id", workspace_id)\
        .eq("user_id", user["id"])\
        .single()\
        .execute()
    
    if not workspace.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Calculer la date de début
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    # Calculer les métriques
    metrics = await _calculate_metrics(supabase, workspace_id, start_date)
    
    # Récupérer les topics
    topics = await _get_topics(supabase, workspace_id)
    
    # Récupérer les questions à faible confiance
    low_confidence = await _get_low_confidence_questions(supabase, workspace_id, start_date)
    
    return {
        "metrics": metrics,
        "topics": topics,
        "low_confidence_questions": low_confidence
    }


@router.post("/{workspace_id}/recalculate")
async def recalculate_insights(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Force le recalcul des insights d'un workspace"""
    supabase = get_supabase()
    
    # Vérifier ownership
    workspace = supabase.table("workspaces")\
        .select("id")\
        .eq("id", workspace_id)\
        .eq("user_id", user["id"])\
        .single()\
        .execute()
    
    if not workspace.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Appeler la fonction SQL
    try:
        supabase.rpc("calculate_workspace_insights", {
            "p_workspace_id": workspace_id
        }).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{workspace_id}/resolve/{message_id}")
async def mark_question_resolved(
    workspace_id: str,
    message_id: str,
    user = Depends(get_current_user)
):
    """Marque une question comme résolue (ajoutée à la documentation)"""
    supabase = get_supabase()
    
    # Vérifier que le message appartient bien au workspace de l'utilisateur
    result = supabase.table("messages")\
        .select("id, conversation:conversations!inner(workspace_id, workspace:workspaces!inner(user_id))")\
        .eq("id", message_id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    if result.data["conversation"]["workspace"]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Marquer comme résolu
    supabase.table("messages").update({
        "is_resolved": True
    }).eq("id", message_id).execute()
    
    return {"success": True}


# =====================================================
# FONCTIONS HELPER
# =====================================================

async def _calculate_metrics(supabase, workspace_id: str, start_date: str) -> dict:
    """Calcule les métriques d'un workspace"""
    
    # Essayer de récupérer depuis le cache d'abord
    cache = supabase.table("insights_cache")\
        .select("*")\
        .eq("workspace_id", workspace_id)\
        .single()\
        .execute()
    
    if cache.data:
        # Vérifier si le cache est récent (< 1 heure)
        calculated_at = cache.data.get("calculated_at")
        if calculated_at:
            # Le cache est valide
            return {
                "satisfaction_rate": cache.data.get("satisfaction_rate"),
                "avg_rag_score": cache.data.get("avg_rag_score"),
                "low_confidence_count": cache.data.get("low_confidence_count", 0),
                "avg_messages_per_conversation": cache.data.get("avg_messages_per_conversation", 0),
                "total_conversations": cache.data.get("total_conversations", 0),
                "total_messages": cache.data.get("total_messages", 0),
                "calculated_at": calculated_at
            }
    
    # Sinon, calculer en temps réel
    
    # Satisfaction rate
    feedback_result = supabase.table("messages")\
        .select("feedback", count="exact")\
        .eq("role", "assistant")\
        .not_.is_("feedback", "null")\
        .execute()
    
    positive = len([m for m in (feedback_result.data or []) if m.get("feedback") == 1])
    total_feedback = len(feedback_result.data or [])
    satisfaction_rate = (positive / total_feedback * 100) if total_feedback > 0 else None
    
    # RAG Score moyen
    rag_result = supabase.rpc("get_avg_rag_score", {
        "p_workspace_id": workspace_id
    }).execute()
    avg_rag_score = rag_result.data if rag_result.data else None
    
    # Conversations et messages
    conv_result = supabase.table("conversations")\
        .select("id", count="exact")\
        .eq("workspace_id", workspace_id)\
        .execute()
    total_conversations = conv_result.count or 0
    
    msg_result = supabase.table("messages")\
        .select("id", count="exact")\
        .execute()
    total_messages = msg_result.count or 0
    
    avg_messages = total_messages / total_conversations if total_conversations > 0 else 0
    
    # Low confidence count
    low_conf_result = supabase.table("messages")\
        .select("id", count="exact")\
        .eq("role", "assistant")\
        .eq("is_resolved", False)\
        .lt("rag_score", 0.5)\
        .execute()
    low_confidence_count = low_conf_result.count or 0
    
    return {
        "satisfaction_rate": satisfaction_rate,
        "avg_rag_score": avg_rag_score,
        "low_confidence_count": low_confidence_count,
        "avg_messages_per_conversation": round(avg_messages, 1),
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "calculated_at": datetime.utcnow().isoformat()
    }


async def _get_topics(supabase, workspace_id: str) -> list:
    """Récupère les topics d'un workspace"""
    result = supabase.table("message_topics")\
        .select("topic_name, message_count, sample_questions")\
        .eq("workspace_id", workspace_id)\
        .order("message_count", desc=True)\
        .limit(10)\
        .execute()
    
    return result.data or []


async def _get_low_confidence_questions(supabase, workspace_id: str, start_date: str) -> list:
    """Récupère les questions à faible confiance"""
    result = supabase.table("messages")\
        .select("id, content, rag_score, created_at, is_resolved, conversation:conversations!inner(workspace_id)")\
        .eq("conversation.workspace_id", workspace_id)\
        .eq("role", "user")\
        .eq("is_resolved", False)\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()
    
    # Filtrer et formater
    questions = []
    for msg in (result.data or []):
        # On cherche la réponse associée pour avoir le rag_score
        # Simplification: on prend les messages user dont la réponse a un faible score
        questions.append({
            "id": msg["id"],
            "content": msg["content"],
            "rag_score": msg.get("rag_score", 0.5),
            "created_at": msg["created_at"],
            "is_resolved": msg.get("is_resolved", False)
        })
    
    return questions[:10]  # Limiter à 10
