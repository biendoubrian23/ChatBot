"""
Routes API pour le Widget (accès public)
Ce sont les endpoints appelés par le widget injecté sur les sites clients
Inclut: fingerprint, score RAG, feedback 👍/👎, suivi de commandes
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, List
import json
import base64
import logging
from urllib.parse import urlparse
from app.core.supabase import get_supabase
from app.services.rag_pipeline import RAGPipeline, fix_email_format
from app.services.intent_detector import IntentDetector

logger = logging.getLogger(__name__)

router = APIRouter()


# =====================================================
# VALIDATION DU DOMAINE
# =====================================================

def validate_domain(request: Request, allowed_domains: Optional[List[str]] = None, allowed_domain: Optional[str] = None) -> tuple[bool, str]:
    """
    Valide que la requête provient d'un domaine autorisé.
    
    Args:
        request: La requête FastAPI
        allowed_domains: Liste des domaines autorisés (nouveau format)
        allowed_domain: Domaine autorisé unique (ancien format, pour compatibilité)
    
    Returns:
        tuple (is_valid, error_message)
    """
    # Combiner les deux formats (nouveau et ancien)
    domains_to_check = []
    if allowed_domains and isinstance(allowed_domains, list):
        domains_to_check.extend(allowed_domains)
    if allowed_domain and allowed_domain not in domains_to_check:
        domains_to_check.append(allowed_domain)
    
    # Récupérer l'origine de la requête
    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")
    
    # Utiliser origin en priorité, sinon referer
    source_url = origin or referer
    
    if not source_url:
        # Pas d'origine = probablement une requête directe (Postman, curl, etc.)
        # On autorise pour le debug mais on log
        logger.warning(f"Requête widget sans origine - Headers: {dict(request.headers)}")
        return True, ""
    
    # Parser l'URL source
    try:
        parsed = urlparse(source_url)
        source_host = parsed.hostname or ""
        source_port = parsed.port
    except Exception:
        return False, "URL d'origine invalide"
    
    # Liste des domaines de développement toujours autorisés
    dev_domains = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
    ]
    
    # Autoriser localhost et ses variantes pour le développement
    if source_host in dev_domains:
        logger.debug(f"Domaine de développement autorisé: {source_host}")
        return True, ""
    
    # Autoriser les requêtes depuis le dashboard MONITORA
    monitora_domains = [
        "localhost:3001",  # Frontend dev
        "monitora.ai",
        "www.monitora.ai",
        "app.monitora.ai",
    ]
    
    full_host = f"{source_host}:{source_port}" if source_port else source_host
    if full_host in monitora_domains or source_host in monitora_domains:
        return True, ""
    
    # Si pas de domaine configuré, autoriser tout (mais avertir)
    if not domains_to_check:
        logger.warning(f"Aucun domaine autorisé configuré - Requête depuis {source_host} autorisée par défaut")
        return True, ""
    
    # Comparer avec chaque domaine autorisé
    source_host_lower = source_host.lower()
    
    for domain in domains_to_check:
        if not domain:
            continue
            
        # Nettoyer le domaine autorisé (enlever https://, http://, etc.)
        clean_allowed = domain.lower().strip()
        clean_allowed = clean_allowed.replace("https://", "").replace("http://", "")
        clean_allowed = clean_allowed.rstrip("/")
        
        # Vérifier correspondance exacte
        if source_host_lower == clean_allowed:
            return True, ""
        
        # Autoriser les sous-domaines (ex: www.exemple.com pour exemple.com)
        if source_host_lower.endswith(f".{clean_allowed}"):
            return True, ""
    
    # Domaine non autorisé
    domains_list = ", ".join(domains_to_check)
    logger.warning(f"Domaine non autorisé: {source_host} (autorisés: {domains_list})")
    return False, f"Ce widget n'est pas autorisé sur ce domaine. Domaines autorisés: {domains_list}"


# =====================================================
# MODÈLES
# =====================================================

class WidgetChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    visitor_id: Optional[str] = None  # Fingerprint du navigateur
    stream: bool = True


class FeedbackRequest(BaseModel):
    message_id: str
    feedback: int  # 1 = 👍, -1 = 👎


class WidgetConfig(BaseModel):
    workspace_id: str
    name: str
    primary_color: str = "#6366f1"
    welcome_message: str = "Bonjour ! 👋 Comment puis-je vous aider ?"


@router.get("/{workspace_id}/config")
async def get_widget_config(workspace_id: str, request: Request):
    """Récupère la configuration publique du widget"""
    supabase = get_supabase()
    
    result = supabase.table("workspaces")\
        .select("id, name, domain, allowed_domains, widget_config, rag_config, is_active")\
        .eq("id", workspace_id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace = result.data
    if not workspace.get("is_active", True):
        raise HTTPException(status_code=403, detail="Workspace désactivé")
    
    # Valider le domaine d'origine (supporte les deux formats)
    allowed_domains = workspace.get("allowed_domains")
    allowed_domain = workspace.get("domain")
    is_valid, error_msg = validate_domain(request, allowed_domains, allowed_domain)
    if not is_valid:
        # Construire la liste des domaines pour l'affichage
        domains_display = allowed_domains if allowed_domains else ([allowed_domain] if allowed_domain else [])
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "domain_not_allowed",
                "message": error_msg,
                "allowed_domains": domains_display
            }
        )
    
    # Utiliser widget_config directement (sauvegardé par le frontend)
    widget_config = workspace.get("widget_config", {}) or {}
    rag_config = workspace.get("rag_config", {}) or {}
    
    return {
        "workspace_id": workspace["id"],
        "name": widget_config.get("chatbot_name", workspace["name"]),
        "primary_color": widget_config.get("primaryColor", "#000000"),
        "welcome_message": widget_config.get("welcomeMessage", "Bonjour ! 👋 Comment puis-je vous aider ?"),
        "placeholder": widget_config.get("placeholder", "Tapez votre message..."),
        "position": widget_config.get("position", "bottom-right"),
        "width": widget_config.get("widgetWidth", 380),
        "height": widget_config.get("widgetHeight", 500),
        "branding_text": widget_config.get("brandingText", "Propulsé par MONITORA"),
        "streaming_enabled": rag_config.get("streaming_enabled", True)
    }


@router.post("/{workspace_id}/chat")
async def widget_chat(
    workspace_id: str,
    data: WidgetChatRequest,
    request: Request
):
    """
    Endpoint de chat pour le widget.
    - Identifie l'utilisateur via visitor_id (fingerprint)
    - Détecte les questions de suivi de commande
    - Stocke le score RAG avec chaque réponse
    - Retourne session_id + message_id pour le feedback
    """
    supabase = get_supabase()
    
    # Vérifier que le workspace existe et est actif
    workspace_result = supabase.table("workspaces")\
        .select("id, domain, allowed_domains, rag_config, settings, is_active")\
        .eq("id", workspace_id)\
        .single()\
        .execute()
    
    if not workspace_result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    workspace = workspace_result.data
    if not workspace.get("is_active", True):
        raise HTTPException(status_code=403, detail="Workspace désactivé")
    
    # Valider le domaine d'origine (supporte les deux formats)
    allowed_domains = workspace.get("allowed_domains")
    allowed_domain = workspace.get("domain")
    is_valid, error_msg = validate_domain(request, allowed_domains, allowed_domain)
    if not is_valid:
        domains_display = allowed_domains if allowed_domains else ([allowed_domain] if allowed_domain else [])
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "domain_not_allowed",
                "message": error_msg,
                "allowed_domains": domains_display
            }
        )
    
    # Récupérer ou créer la conversation avec visitor_id
    conversation = await _get_or_create_conversation(
        supabase, workspace_id, data.session_id, data.visitor_id
    )
    
    # Sauvegarder le message utilisateur
    supabase.table("messages").insert({
        "conversation_id": conversation["id"],
        "role": "user",
        "content": data.message
    }).execute()
    
    # Mettre à jour le compteur de messages
    supabase.table("conversations").update({
        "messages_count": conversation.get("messages_count", 0) + 1
    }).eq("id", conversation["id"]).execute()
    
    # ========================================================
    # DÉTECTION D'INTENTION DE COMMANDE
    # ========================================================
    order_response = await _check_order_intent(supabase, workspace_id, data.message)
    
    if order_response:
        # Sauvegarder la réponse de commande
        msg_result = supabase.table("messages").insert({
            "conversation_id": conversation["id"],
            "role": "assistant",
            "content": order_response,
            "rag_score": 1.0,  # Réponse directe de la BDD
            "sources": []
        }).execute()
        
        message_id = msg_result.data[0]["id"] if msg_result.data else None
        
        if data.stream:
            async def stream_order_response():
                # Streamer la réponse de commande
                for char in order_response:
                    yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'session_id': conversation['id'], 'message_id': message_id, 'rag_score': 1.0})}\n\n"
            
            return StreamingResponse(
                stream_order_response(),
                media_type="text/event-stream"
            )
        else:
            return {
                "response": order_response,
                "session_id": conversation["id"],
                "message_id": message_id,
                "rag_score": 1.0
            }
    
    # ========================================================
    # RÉPONSE RAG CLASSIQUE
    # ========================================================
    # Récupérer l'historique (limité aux 6 derniers messages)
    history_result = supabase.table("messages")\
        .select("role, content")\
        .eq("conversation_id", conversation["id"])\
        .order("created_at")\
        .limit(6)\
        .execute()
    
    history = history_result.data[:-1] if history_result.data else []
    
    # Incrémenter les analytics
    _increment_analytics(supabase, workspace_id, data.visitor_id)
    
    # Pipeline RAG
    rag = RAGPipeline(workspace_id=workspace_id, config=workspace.get("rag_config", {}))
    
    if data.stream:
        return StreamingResponse(
            _stream_response_with_score(supabase, rag, data.message, history, conversation["id"]),
            media_type="text/event-stream"
        )
    else:
        response, sources, rag_score = await _get_response_with_score(rag, data.message, history)
        
        # Sauvegarder la réponse avec le score RAG
        msg_result = supabase.table("messages").insert({
            "conversation_id": conversation["id"],
            "role": "assistant",
            "content": response,
            "rag_score": rag_score,
            "sources": sources
        }).execute()
        
        message_id = msg_result.data[0]["id"] if msg_result.data else None
        
        return {
            "response": response,
            "session_id": conversation["id"],
            "message_id": message_id,
            "rag_score": rag_score
        }


@router.post("/{workspace_id}/feedback")
async def submit_feedback(workspace_id: str, data: FeedbackRequest):
    """
    Enregistre le feedback utilisateur (👍 ou 👎) sur un message
    """
    supabase = get_supabase()
    
    # Vérifier que le message appartient bien à ce workspace
    msg_result = supabase.table("messages")\
        .select("id, conversation:conversations!inner(workspace_id)")\
        .eq("id", data.message_id)\
        .single()\
        .execute()
    
    if not msg_result.data:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    if msg_result.data["conversation"]["workspace_id"] != workspace_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Mettre à jour le feedback
    supabase.table("messages").update({
        "feedback": data.feedback
    }).eq("id", data.message_id).execute()
    
    return {"success": True}


@router.get("/{workspace_id}/script.js")
async def get_widget_script(workspace_id: str):
    """
    Retourne le script JavaScript du widget moderne avec:
    - Fingerprint.js pour identifier les utilisateurs
    - Design moderne avec bords arrondis
    - Boutons de feedback 👍/👎
    """
    script = _generate_modern_widget_script(workspace_id)
    
    return Response(
        content=script,
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=3600"}
    )


# =====================================================
# FONCTIONS HELPER
# =====================================================

async def _get_or_create_conversation(supabase, workspace_id: str, session_id: str, visitor_id: str):
    """Récupère ou crée une conversation avec visitor_id"""
    
    if session_id:
        conv_result = supabase.table("conversations")\
            .select("*")\
            .eq("id", session_id)\
            .eq("workspace_id", workspace_id)\
            .single()\
            .execute()
        
        if conv_result.data:
            # Mettre à jour le visitor_id si fourni et pas encore défini
            if visitor_id and not conv_result.data.get("visitor_id"):
                supabase.table("conversations").update({
                    "visitor_id": visitor_id
                }).eq("id", session_id).execute()
            return conv_result.data
    
    # Nouvelle conversation
    conv_result = supabase.table("conversations").insert({
        "workspace_id": workspace_id,
        "visitor_id": visitor_id,
        "messages_count": 0
    }).execute()
    
    return conv_result.data[0]


async def _check_order_intent(supabase, workspace_id: str, message: str) -> Optional[str]:
    """
    Vérifie si le message est une question de suivi de commande.
    Si oui, interroge la BDD externe et retourne la réponse formatée.
    Sinon, retourne None pour continuer avec le RAG.
    
    Flux identique au chatbot CoolLibri original.
    """
    # 1. Détecter l'intention (comme MessageAnalyzer original)
    intent_detector = IntentDetector()
    intent = intent_detector.detect(message)
    
    if intent["intent"] != "order_tracking":
        return None
    
    order_number = intent.get("order_number")
    
    # Si pas de numéro, demander poliment (comme l'original)
    if not order_number:
        return (
            "Pour suivre votre commande, j'ai besoin de votre **numéro de commande**. 📦\n\n"
            "Vous pouvez le retrouver dans l'email de confirmation de commande.\n\n"
            "Exemple : `13456` ou `commande 13456`"
        )
    
    # 2. Vérifier si la BDD externe est configurée et activée
    db_result = supabase.table("workspace_databases")\
        .select("*")\
        .eq("workspace_id", workspace_id)\
        .eq("is_enabled", True)\
        .execute()
    
    if not db_result.data or len(db_result.data) == 0:
        return (
            f"Je vois que vous cherchez des informations sur la commande **{order_number}**.\n\n"
            f"Malheureusement, le système de suivi automatique n'est pas encore configuré.\n\n"
            f"Veuillez contacter notre service client :\n"
            f"📧 **Email** : contact@coollibri.com\n"
            f"📞 **Téléphone** : 05 31 61 60 42"
        )
    
    db_config = db_result.data[0]
    
    # 3. Se connecter à la BDD externe et récupérer la commande
    try:
        from app.services.external_database import get_order_service
        
        db_creds = {
            "db_type": db_config["db_type"],
            "db_host": db_config["db_host"],
            "db_port": db_config["db_port"],
            "db_name": db_config["db_name"],
            "db_user": db_config["db_user"],
            "db_password": base64.b64decode(db_config["db_password_encrypted"].encode()).decode(),
            "schema_type": db_config["schema_type"]
        }
        
        # Factory pour obtenir le bon service selon le tenant
        order_service = get_order_service(db_creds)
        
        # Récupérer les détails de la commande
        order_details = order_service.get_order_details(order_number)
        
        if not order_details:
            return (
                f"Je n'ai pas trouvé de commande avec le numéro **{order_number}**. 🔍\n\n"
                f"Vérifiez que vous avez bien saisi le numéro correct.\n\n"
                f"Si le problème persiste, contactez notre service client :\n"
                f"📧 **Email** : contact@coollibri.com\n"
                f"📞 **Téléphone** : 05 31 61 60 42"
            )
        
        # Formater la réponse (identique au format original)
        return order_service.format_order_response(order_details)
        
    except Exception as e:
        logger.error(f"Erreur interrogation BDD externe: {e}")
        return (
            f"Une erreur technique est survenue lors de la recherche de votre commande **{order_number}**. 😔\n\n"
            f"Veuillez réessayer dans quelques instants ou contacter notre service client :\n"
            f"📧 **Email** : contact@coollibri.com\n"
            f"📞 **Téléphone** : 05 31 61 60 42"
        )


async def _get_response_with_score(rag: RAGPipeline, message: str, history: list):
    """Génère une réponse et calcule le score RAG"""
    # Générer la réponse (peut venir du cache)
    response, sources, from_cache = await rag.get_response(message, history)
    
    # Si depuis le cache, score = 1.0 (réponse validée)
    # Sinon score par défaut 0.5
    rag_score = 1.0 if from_cache else 0.5
    
    return response, sources, rag_score


async def _stream_response_with_score(supabase, rag: RAGPipeline, message: str, history: list, conversation_id: str):
    """Stream la réponse et stocke avec le score RAG"""
    import asyncio
    
    full_response = ""
    sources = []
    rag_score = 0.5  # Score par défaut
    
    async for chunk in rag.stream_response(message, history):
        if chunk.get("type") == "token":
            full_response += chunk["content"]
            yield f"data: {json.dumps(chunk)}\n\n"
            # Petit délai pour ralentir le streaming (20ms par token)
            await asyncio.sleep(0.1)
        elif chunk.get("type") == "sources":
            sources = chunk.get("sources", [])
        elif chunk.get("type") == "rag_score":
            rag_score = chunk.get("score", 0.5)
        elif chunk.get("type") == "error":
            yield f"data: {json.dumps(chunk)}\n\n"
    
    # Post-traitement: corriger les emails malformés
    full_response = fix_email_format(full_response)
    
    # Sauvegarder la réponse avec le score RAG
    msg_result = supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": full_response,
        "rag_score": rag_score,
        "sources": sources
    }).execute()
    
    message_id = msg_result.data[0]["id"] if msg_result.data else None
    
    # Signal de fin avec session_id et message_id pour le feedback
    yield f"data: {json.dumps({'type': 'done', 'session_id': conversation_id, 'message_id': message_id, 'rag_score': rag_score})}\n\n"


def _increment_analytics(supabase, workspace_id: str, visitor_id: str):
    """Incrémente les compteurs analytics quotidiens"""
    from datetime import date
    
    today = date.today().isoformat()
    
    try:
        # Tenter de récupérer l'entrée existante
        existing = supabase.table("analytics_daily")\
            .select("id, messages_count")\
            .eq("workspace_id", workspace_id)\
            .eq("date", today)\
            .single()\
            .execute()
        
        if existing.data:
            supabase.table("analytics_daily").update({
                "messages_count": existing.data["messages_count"] + 1
            }).eq("id", existing.data["id"]).execute()
        else:
            supabase.table("analytics_daily").insert({
                "workspace_id": workspace_id,
                "date": today,
                "messages_count": 1,
                "conversations_count": 1,
                "unique_visitors": 1
            }).execute()
    except:
        pass  # Ignorer les erreurs d'analytics


def _generate_modern_widget_script(workspace_id: str) -> str:
    """Génère le script JavaScript moderne du widget avec fingerprint et feedback"""
    
    return '''
(function() {
  const WORKSPACE_ID = "''' + workspace_id + '''";
  const API_URL = window.MONITORA_API_URL || "";
  
  // =====================================================
  // FINGERPRINT - Identification unique du visiteur
  // =====================================================
  async function getVisitorId() {
    let visitorId = localStorage.getItem('monitora_visitor_id');
    if (visitorId) return visitorId;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('monitora', 2, 2);
      
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ];
      
      let hash = 0;
      const str = components.join('|');
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      visitorId = 'v_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
      localStorage.setItem('monitora_visitor_id', visitorId);
      return visitorId;
    } catch(e) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('monitora_visitor_id', visitorId);
      return visitorId;
    }
  }
  
  // =====================================================
  // STYLES MODERNES
  // =====================================================
  const styles = `
    #monitora-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #monitora-toggle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      transition: transform 0.2s;
    }
    #monitora-toggle:hover { transform: scale(1.05); }
    #monitora-toggle svg { width: 24px; height: 24px; fill: #fff; }
    
    #monitora-chat {
      display: none;
      position: absolute;
      bottom: 72px;
      right: 0;
      width: 360px;
      height: 520px;
      background: #fff;
      border-radius: 16px;
      flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    #monitora-chat.open { display: flex; }
    
    #monitora-header {
      padding: 16px 20px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #monitora-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #monitora-header-avatar svg { width: 20px; height: 20px; fill: #fff; }
    #monitora-header-info { flex: 1; }
    #monitora-header-name { font-weight: 600; font-size: 14px; }
    #monitora-header-status {
      font-size: 12px;
      opacity: 0.8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    #monitora-header-status::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #4ade80;
      border-radius: 50%;
    }
    #monitora-close {
      background: rgba(255,255,255,0.1);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #monitora-close:hover { background: rgba(255,255,255,0.2); }
    #monitora-close svg { width: 16px; height: 16px; fill: #fff; }
    
    #monitora-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: linear-gradient(to bottom, #f9fafb, #fff);
    }
    .monitora-msg-wrapper { margin-bottom: 12px; display: flex; }
    .monitora-msg-wrapper.user { justify-content: flex-end; }
    .monitora-msg-wrapper.assistant { justify-content: flex-start; }
    .monitora-msg-content { display: flex; flex-direction: column; max-width: 80%; }
    .monitora-msg {
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.5;
      border-radius: 16px;
    }
    .monitora-msg.user {
      background: #1f2937;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .monitora-msg.assistant {
      background: #fff;
      color: #374151;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }
    
    .monitora-feedback {
      display: flex;
      gap: 4px;
      margin-top: 4px;
      margin-left: 4px;
    }
    .monitora-feedback button {
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      border-radius: 4px;
      opacity: 0.5;
      transition: all 0.2s;
    }
    .monitora-feedback button:hover { opacity: 1; background: #f3f4f6; }
    .monitora-feedback button.active { opacity: 1; }
    .monitora-feedback button.active.up { color: #22c55e; background: #dcfce7; }
    .monitora-feedback button.active.down { color: #ef4444; background: #fee2e2; }
    .monitora-feedback svg { width: 12px; height: 12px; }
    
    #monitora-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      background: #fff;
    }
    #monitora-input {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
    }
    #monitora-input:focus { border-color: #9ca3af; }
    #monitora-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #monitora-send:disabled { opacity: 0.5; cursor: not-allowed; }
    #monitora-send svg { width: 16px; height: 16px; fill: #fff; }
    
    #monitora-powered {
      text-align: center;
      padding: 8px;
      font-size: 10px;
      color: #9ca3af;
      background: #fff;
    }
    #monitora-powered a { color: #6b7280; text-decoration: none; font-weight: 500; }
  `;
  
  // =====================================================
  // INITIALISATION
  // =====================================================
  let sessionId = localStorage.getItem('monitora_session_' + WORKSPACE_ID);
  let visitorId = null;
  let primaryColor = '#6366f1';
  
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
  
  const container = document.createElement('div');
  container.id = 'monitora-widget';
  container.innerHTML = `
    <div id="monitora-chat">
      <div id="monitora-header">
        <div id="monitora-header-avatar">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <div id="monitora-header-info">
          <div id="monitora-header-name">Assistant</div>
          <div id="monitora-header-status">En ligne</div>
        </div>
        <button id="monitora-close">
          <svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>
        </button>
      </div>
      <div id="monitora-messages"></div>
      <div id="monitora-input-area">
        <input type="text" id="monitora-input" placeholder="Votre message..." />
        <button id="monitora-send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="monitora-powered">Propulsé par <a href="https://monitora.io" target="_blank">MONITORA</a></div>
    </div>
    <button id="monitora-toggle">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </button>
  `;
  document.body.appendChild(container);
  
  const toggle = document.getElementById('monitora-toggle');
  const chat = document.getElementById('monitora-chat');
  const header = document.getElementById('monitora-header');
  const headerName = document.getElementById('monitora-header-name');
  const closeBtn = document.getElementById('monitora-close');
  const messages = document.getElementById('monitora-messages');
  const input = document.getElementById('monitora-input');
  const sendBtn = document.getElementById('monitora-send');
  
  toggle.onclick = () => chat.classList.add('open');
  closeBtn.onclick = () => chat.classList.remove('open');
  input.oninput = () => { sendBtn.disabled = !input.value.trim(); };
  
  function addMessage(content, role, messageId = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'monitora-msg-wrapper ' + role;
    
    let feedbackHtml = '';
    if (role === 'assistant' && messageId) {
      feedbackHtml = `
        <div class="monitora-feedback" data-message-id="${messageId}">
          <button class="up" onclick="window.monitoraFeedback('${messageId}', 1, this)">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z"/></svg>
          </button>
          <button class="down" onclick="window.monitoraFeedback('${messageId}', -1, this)">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 4h-2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h2V4zM2.17 11.12c-.11.25-.17.52-.17.8V13c0 1.1.9 2 2 2h5.5l-.92 4.65c-.05.22-.02.46.08.66.23.45.52.86.88 1.22L10 22l6.41-6.41c.38-.38.59-.89.59-1.42V6.34C17 5.05 15.95 4 14.66 4h-8.1c-.71 0-1.36.37-1.72.97l-2.67 6.15z"/></svg>
          </button>
        </div>
      `;
    }
    
    wrapper.innerHTML = `
      <div class="monitora-msg-content">
        <div class="monitora-msg ${role}">${content}</div>
        ${feedbackHtml}
      </div>
    `;
    
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper.querySelector('.monitora-msg');
  }
  
  window.monitoraFeedback = async function(messageId, value, btn) {
    const container = btn.parentElement;
    container.querySelectorAll('button').forEach(b => b.classList.remove('active', 'up', 'down'));
    btn.classList.add('active', value === 1 ? 'up' : 'down');
    
    try {
      await fetch(`${API_URL}/api/widget/${WORKSPACE_ID}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, feedback: value })
      });
    } catch(e) { console.error('Feedback error:', e); }
  };
  
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    
    const msgEl = addMessage('...', 'assistant');
    msgEl.style.opacity = '0.6';
    
    try {
      const response = await fetch(`${API_URL}/api/widget/${WORKSPACE_ID}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId, visitor_id: visitorId, stream: true })
      });
      
      msgEl.textContent = '';
      msgEl.style.opacity = '1';
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentMessageId = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                msgEl.textContent += data.content;
                messages.scrollTop = messages.scrollHeight;
              } else if (data.type === 'done') {
                sessionId = data.session_id;
                currentMessageId = data.message_id;
                localStorage.setItem('monitora_session_' + WORKSPACE_ID, sessionId);
              }
            } catch(e) {}
          }
        }
      }
      
      if (currentMessageId) {
        const wrapper = msgEl.closest('.monitora-msg-content');
        if (wrapper) {
          const feedbackDiv = document.createElement('div');
          feedbackDiv.className = 'monitora-feedback';
          feedbackDiv.innerHTML = `
            <button class="up" onclick="window.monitoraFeedback('${currentMessageId}', 1, this)">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z"/></svg>
            </button>
            <button class="down" onclick="window.monitoraFeedback('${currentMessageId}', -1, this)">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 4h-2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h2V4zM2.17 11.12c-.11.25-.17.52-.17.8V13c0 1.1.9 2 2 2h5.5l-.92 4.65c-.05.22-.02.46.08.66.23.45.52.86.88 1.22L10 22l6.41-6.41c.38-.38.59-.89.59-1.42V6.34C17 5.05 15.95 4 14.66 4h-8.1c-.71 0-1.36.37-1.72.97l-2.67 6.15z"/></svg>
            </button>
          `;
          wrapper.appendChild(feedbackDiv);
        }
      }
    } catch (e) {
      msgEl.textContent = 'Erreur de connexion. Veuillez réessayer.';
      msgEl.style.opacity = '1';
    }
  }
  
  sendBtn.onclick = sendMessage;
  input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
  
  function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
  
  async function init() {
    visitorId = await getVisitorId();
    
    try {
      const res = await fetch(`${API_URL}/api/widget/${WORKSPACE_ID}/config`);
      const config = await res.json();
      
      primaryColor = config.primary_color || '#6366f1';
      toggle.style.background = `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})`;
      header.style.background = `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})`;
      sendBtn.style.background = primaryColor;
      
      headerName.textContent = config.name || 'Assistant';
      if (config.welcome_message) addMessage(config.welcome_message, 'assistant');
    } catch(e) { console.error('Monitora init error:', e); }
  }
  
  init();
})();
'''
