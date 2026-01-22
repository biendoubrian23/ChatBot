"""
Routes API pour les Workspaces - SQL Server uniquement
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from pydantic import BaseModel
from app.core.config import settings, DEFAULT_RAG_CONFIG
from app.core.auth_sqlserver import get_current_user, get_user_from_token_sqlserver
from app.core.database import WorkspacesDB, get_db, to_json, parse_json, new_uuid

router = APIRouter()


# Alias pour compatibilité avec les anciens imports
async def get_user_from_token(authorization: str) -> dict:
    """
    Wrapper pour compatibilité - utilise l'auth SQL Server.
    Les modules qui importent cette fonction depuis workspaces.py continueront de fonctionner.
    """
    return await get_user_from_token_sqlserver(authorization)

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rag_config: Optional[dict] = None
    widget_config: Optional[dict] = None  # Ajouté pour personnalisation
    is_active: Optional[bool] = None
    allowed_domains: Optional[list] = None
    domain: Optional[str] = None


class WidgetConfigUpdate(BaseModel):
    """Configuration du widget chatbot"""
    primaryColor: Optional[str] = None
    chatbot_name: Optional[str] = None
    welcomeMessage: Optional[str] = None
    placeholder: Optional[str] = None
    position: Optional[str] = None
    widgetWidth: Optional[int] = None
    widgetHeight: Optional[int] = None
    brandingText: Optional[str] = None


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
    streaming_enabled: Optional[bool] = None
    system_prompt: Optional[str] = None


# =====================================================
# ROUTES SQL Server
# =====================================================

@router.get("")
async def list_workspaces(user = Depends(get_current_user)):
    """Liste tous les workspaces de l'utilisateur"""
    db = get_db()
    
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT w.*, 
                   (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id) as documents_count,
                   (SELECT COUNT(*) FROM conversations c WHERE c.workspace_id = w.id) as conversations_count
            FROM workspaces w
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        """, (user["id"],))
        
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        workspaces = [dict(zip(columns, row)) for row in rows]
        
        # Parser les colonnes JSON
        for w in workspaces:
            w["rag_config"] = parse_json(w.get("rag_config"))
            w["widget_config"] = parse_json(w.get("widget_config"))
        
        return workspaces


@router.post("")
async def create_workspace(
    data: WorkspaceCreate,
    user = Depends(get_current_user)
):
    """Crée un nouveau workspace"""
    db = get_db()
    workspace_id = new_uuid()
    
    default_widget = {
        "color_accent": "#000000",
        "position": "bottom-right",
        "welcome_message": "Bonjour ! Comment puis-je vous aider ?",
        "chatbot_name": "Assistant"
    }
    
    with db.cursor() as cursor:
        cursor.execute("""
            INSERT INTO workspaces (id, user_id, name, description, rag_config, widget_config, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
        """, (
            workspace_id,
            user["id"],
            data.name,
            data.description,
            to_json(DEFAULT_RAG_CONFIG),
            to_json(default_widget)
        ))
        
        cursor.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        columns = [col[0] for col in cursor.description]
        row = cursor.fetchone()
        result = dict(zip(columns, row))
        result["rag_config"] = parse_json(result.get("rag_config"))
        result["widget_config"] = parse_json(result.get("widget_config"))
        
        return result


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Récupère un workspace par son ID"""
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    return workspace


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    user = Depends(get_current_user)
):
    """Met à jour un workspace"""
    
    # Vérifier l'accès
    existing = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not existing:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Filtrer les champs non-null
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = WorkspacesDB.update(workspace_id, **update_data)
    return result


@router.get("/{workspace_id}/rag-config")
async def get_rag_config(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Récupère la configuration RAG d'un workspace"""
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    return workspace.get("rag_config") or DEFAULT_RAG_CONFIG


@router.get("/{workspace_id}/analytics")
async def get_workspace_analytics(
    workspace_id: str,
    period: str = "30d",
    user = Depends(get_current_user)
):
    """Récupère les analytics d'un workspace"""
    # Vérifier l'accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
        
    db = get_db()
    
    # Récupérer les stats globales depuis la vue ou calculer en direct
    with db.cursor() as cursor:
        if period.endswith('d'):
            days = int(period[:-1])
        elif period == '24h':
            days = 1
        elif period.endswith('m'):
            days = int(period[:-1]) * 30
        elif period.endswith('y'):
             days = int(period[:-1]) * 365
        else:
            days = 30 # Default 30d

        # Calculer la date de début
        # SQL Server: DATEADD(day, -days, GETDATE())
        
        # 1. Stats Globales sur la période
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT c.id) as total_conversations,
                COUNT(m.id) as total_messages,
                COUNT(DISTINCT c.visitor_id) as unique_visitors,
                ISNULL(AVG(CAST(m.response_time_ms AS FLOAT)), 0) as avg_response_time_ms,
                ISNULL(AVG(CAST(m.ttfb_ms AS FLOAT)), 0) as avg_ttfb_ms,
                SUM(CASE WHEN m.feedback = 1 THEN 1 ELSE 0 END) as likes,
                SUM(CASE WHEN m.feedback = -1 THEN 1 ELSE 0 END) as dislikes
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.workspace_id = ? 
            AND c.created_at >= DATEADD(day, -?, SYSDATETIMEOFFSET())
        """, (workspace_id, days))
        
        row = cursor.fetchone()
        stats = dict(zip([c[0] for c in cursor.description], row))
        
        # Calcul satisfaction
        likes = stats['likes'] or 0
        dislikes = stats['dislikes'] or 0
        total_rated = likes + dislikes
        satisfaction_rate = round((likes / total_rated) * 100) if total_rated > 0 else 0

        # 2. Documents et autres (non filtré par période, ou filtré ?)
        # Le nombre total de documents est intemporel
        cursor.execute("SELECT COUNT(*) FROM documents WHERE workspace_id = ?", (workspace_id,))
        total_documents = cursor.fetchone()[0]
        
        # 3. Documents récents
        cursor.execute("""
            SELECT TOP 5 id, filename, status, created_at, file_size
            FROM documents 
            WHERE workspace_id = ?
            ORDER BY created_at DESC
        """, (workspace_id,))
        doc_columns = [c[0] for c in cursor.description]
        recent_documents = [dict(zip(doc_columns, r)) for r in cursor.fetchall()]

        # 4. Historique Journalier (pour les graphs)
        # On utilise analytics_daily pour les performances, mais attention aux jours manquants
        # Pour une meilleure précision sur "24h", on pourrait grouper par heure, mais restons sur jour pour l'instant sauf si 24h
        
        if days <= 1:
            # Mode 24h : Group by Hour
            # Note: SQL Server DATEPART(hour, ...)
             cursor.execute("""
                SELECT 
                    FORMAT(m.created_at, 'HH:00') as label,
                    COUNT(DISTINCT m.conversation_id) as conversations,
                    COUNT(m.id) as messages,
                    COUNT(DISTINCT c.visitor_id) as users
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.workspace_id = ?
                AND m.created_at >= DATEADD(day, -1, SYSDATETIMEOFFSET())
                GROUP BY FORMAT(m.created_at, 'HH:00')
                ORDER BY MIN(m.created_at) ASC
            """, (workspace_id,))
        else:
            # Mode Jours : Group by Date (from analytics_daily OR aggregation)
            # Analytics_daily est plus performant mais peut être incomplet si pas de job de synchro strict
            # On va utiliser analytics_daily car on l'a.
            cursor.execute("""
                SELECT date, messages_count, unique_visitors
                FROM analytics_daily 
                WHERE workspace_id = ? 
                AND date >= DATEADD(day, -?, CAST(GETDATE() AS DATE))
                ORDER BY date ASC
            """, (workspace_id, days))

        history_rows = cursor.fetchall()
        
        history = []
        if days <= 1:
             for r in history_rows:
                history.append({
                    "date": r[0], # "14:00"
                    "messages": r[2],
                    "users": r[3]
                })
        else:
            for r in history_rows:
                history.append({
                    "date": r[0], # ISO Date
                    "messages": r[1],
                    "users": r[2]
                })
            
        avg_resp_s = round(stats["avg_response_time_ms"] / 1000, 2)
        avg_ttfb_s = round(stats["avg_ttfb_ms"] / 1000, 2)
        
        # Conversations today (toujours utile)
        # Mais le dashboard principal utilise stats["total_conversations"] filtré
        
        return {
            "totalConversations": stats["total_conversations"],
            "totalMessages": stats["total_messages"],
            "documentsCount": total_documents,
            "uniqueUsers": stats["unique_visitors"],
            "conversationsToday": 0, # Pas utilisé dans le nouveau design, ou on peut le garder
            "averageSatisfaction": satisfaction_rate, 
            "messages_count": stats["total_messages"],
            "conversations_count": stats["total_conversations"],
            "messagesPerConversation": round(stats["total_messages"] / stats["total_conversations"], 1) if stats["total_conversations"] > 0 else 0,
            "avgResponseTime": f"{avg_resp_s}s",
            "avgTTFB": f"{avg_ttfb_s}s",
            "recentDocuments": recent_documents,
            "history": history
        }


@router.patch("/{workspace_id}/rag-config")
async def update_rag_config(
    workspace_id: str,
    config: RAGConfigUpdate,
    user = Depends(get_current_user)
):
    """Met à jour la configuration RAG d'un workspace"""
    
    # Récupérer le workspace actuel
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Fusionner la config
    current_config = workspace.get("rag_config") or {}
    new_config = {k: v for k, v in config.model_dump().items() if v is not None}
    merged_config = {**current_config, **new_config}
    
    result = WorkspacesDB.update(workspace_id, rag_config=merged_config)
    return result


@router.patch("/{workspace_id}/widget-config")
async def update_widget_config(
    workspace_id: str,
    config: dict,  # Accepte n'importe quel JSON
    user = Depends(get_current_user)
):
    """Met à jour la configuration du widget (couleur, textes, dimensions...)"""
    
    # Récupérer le workspace actuel
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Fusionner la config widget
    current_config = workspace.get("widget_config") or {}
    merged_config = {**current_config, **config}
    
    result = WorkspacesDB.update(workspace_id, widget_config=merged_config)
    return result


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    user = Depends(get_current_user)
):
    """Supprime un workspace et toutes ses données associées en cascade."""
    
    # Vérifier l'accès
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user["id"])
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace_name = workspace.get("name", "")
    
    try:
        WorkspacesDB.delete(workspace_id)
        return {
            "success": True,
            "message": f"Workspace '{workspace_name}' supprimé avec succès"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression: {str(e)}"
        )
