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
from app.core.database import (
    WorkspacesDB, ConversationsDB, MessagesDB, 
    WorkspaceDatabasesDB, AnalyticsDB
)
from app.services.rag_pipeline import RAGPipeline, fix_email_format
from app.services.intent_detector import IntentDetector

logger = logging.getLogger(__name__)

router = APIRouter()


# =====================================================
# VALIDATION DU DOMAINE (Inchangé)
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
    user_context: Optional[dict] = None # { isLoggedIn: bool, id: str, email: str }


class FeedbackRequest(BaseModel):
    # Format moderne (widget.py script.js)
    message_id: Optional[str] = None
    feedback: Optional[int] = None  # 1 = 👍, -1 = 👎
    
    # Format alternatif (embed.js)
    type: Optional[str] = None  # "positive" ou "negative"
    message: Optional[str] = None
    session_id: Optional[str] = None


class WidgetConfig(BaseModel):
    workspace_id: str
    name: str
    primary_color: str = "#6366f1"
    welcome_message: str = "Bonjour ! 👋 Comment puis-je vous aider ?"


@router.get("/{workspace_id}/config")
async def get_widget_config(workspace_id: str, request: Request):
    """Récupère la configuration publique du widget"""
    
    workspace = WorkspacesDB.get_by_id(workspace_id)
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
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
    - Rate limiting 3 niveaux (IP, fingerprint, global)
    - Identifie l'utilisateur via visitor_id (fingerprint)
    - Détecte les questions de suivi de commande
    - Stocke le score RAG avec chaque réponse
    - Retourne session_id + message_id pour le feedback
    """
    
    # ========================================================
    # RATE LIMITING - Protection anti-spam
    # ========================================================
    from app.services.rate_limiter import rate_limiter, get_client_ip
    import asyncio
    
    client_ip = get_client_ip(request)
    fingerprint = data.visitor_id or ""
    
    # Vérifier les 3 niveaux de rate limiting
    is_allowed, rate_limit_msg = rate_limiter.check_all(client_ip, fingerprint, workspace_id)
    
    if not is_allowed:
        # Spammer détecté - renvoyer un message de maintenance
        logger.warning(f"🚫 Rate limit atteint: IP={client_ip}, FP={fingerprint[:10]}..., WS={workspace_id[:8]}...")
        
        maintenance_msg = "Je suis momentanément indisponible. Veuillez réessayer dans quelques instants. 🙏"
        
        if data.stream:
            async def stream_blocked():
                tokens = maintenance_msg.split(" ")
                for i, token in enumerate(tokens):
                    text = token + (" " if i < len(tokens) - 1 else "")
                    yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"
                    await asyncio.sleep(0.03)
                yield f"data: {json.dumps({'type': 'done', 'session_id': None, 'message_id': None})}\n\n"
            
            return StreamingResponse(stream_blocked(), media_type="text/event-stream")
        
        return {"response": maintenance_msg, "session_id": None, "message_id": None}
    
    # ========================================================
    # VALIDATION WORKSPACE
    # ========================================================
    workspace = WorkspacesDB.get_by_id(workspace_id)
    
    # Si le workspace est désactivé, renvoyer un message de maintenance
    if not workspace.get("is_active", True):
        # Récupérer ou créer une conversation
        conversation = await _get_or_create_conversation(
            workspace_id, data.session_id, data.visitor_id
        )
        
        # Sauvegarder le message utilisateur
        MessagesDB.create(
            conversation_id=conversation["id"],
            role="user",
            content=data.message
        )
        
        maintenance_msg = "Le chatbot est actuellement en maintenance et revient très bientôt ! 🚧"
        
        # Sauvegarder la réponse du système
        msg = MessagesDB.create(
            conversation_id=conversation["id"],
            role="assistant",
            content=maintenance_msg
        )
        
        # Gérer le streaming si demandé
        if data.stream:
            import asyncio
            
            async def stream_maintenance():
                # Simuler un streaming fluide
                tokens = maintenance_msg.split(" ")
                for i, token in enumerate(tokens):
                    # Ajouter un espace sauf pour le dernier
                    text = token + (" " if i < len(tokens) - 1 else "")
                    chunk = {
                        "type": "token",
                        "content": text
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
                    await asyncio.sleep(0.05) # Petit délai pour l'effet "typing"
                
                # Fin du stream
                end_chunk = {
                    "type": "done",
                    "session_id": conversation["session_id"],
                    "message_id": msg["id"]
                }
                yield f"data: {json.dumps(end_chunk)}\n\n"

            return StreamingResponse(stream_maintenance(), media_type="text/event-stream")
            
        return {
            "response": maintenance_msg, # Clé 'response' attendue par le frontend
            "sources": [],
            "message_id": msg["id"],
            "session_id": conversation["session_id"]
        }
    
    # Récupérer ou créer la conversation avec visitor_id
    conversation = await _get_or_create_conversation(
        workspace_id, data.session_id, data.visitor_id
    )
    
    # Sauvegarder le message utilisateur
    MessagesDB.create(
        conversation_id=conversation["id"],
        role="user",
        content=data.message
    )
    
    # Mieux : Mettre à jour les stats tout de suite pour capturer le 'nouveau visiteur'
    # avant que d'autres messages ne soient ajoutés (réponse bot)
    _increment_analytics(workspace_id, data.visitor_id)
    
    # Mettre à jour le compteur de messages
    ConversationsDB.increment_message_count(conversation["id"])
    
    # ========================================================
    # DÉTECTION D'INTENTION DE COMMANDE
    # ========================================================
    order_response = await _check_order_intent(workspace_id, data.message, data.user_context)
    
    if order_response:
        # Sauvegarder la réponse de commande
        msg_result = MessagesDB.create(
            conversation_id=conversation["id"],
            role="assistant",
            content=order_response,
            rag_score=1.0,  # Réponse directe de la BDD
            sources=[]
        )
        
        message_id = msg_result["id"]
        
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
    history_msgs = MessagesDB.get_by_conversation(conversation["id"], limit=6)
    history = [{"role": m["role"], "content": m["content"]} for m in history_msgs]
    
    # Analytics déplacé plus haut pour gérer tous les cas (Order + RAG)
    # _increment_analytics(workspace_id, data.visitor_id)
    
    # Pipeline RAG
    rag_config = workspace.get("rag_config", {})
    rag = RAGPipeline(workspace_id=workspace_id, config=rag_config)
    
    # Vérifier si le streaming est activé globalement
    streaming_enabled = rag_config.get("streaming_enabled", True)
    
    if data.stream and streaming_enabled:
        return StreamingResponse(
            _stream_response_with_score(rag, data.message, history, conversation["id"]),
            media_type="text/event-stream"
        )
    else:
        import time
        start_time = time.time()
        
        response, sources, rag_score = await _get_response_with_score(rag, data.message, history)
        
        # Calculer le temps de réponse
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Sauvegarder la réponse avec le score RAG et temps de réponse
        msg_result = MessagesDB.create(
            conversation_id=conversation["id"],
            role="assistant",
            content=response,
            rag_score=rag_score,
            sources=sources,
            response_time_ms=response_time_ms
        )
        
        message_id = msg_result["id"]
        
        return {
            "response": response,
            "session_id": conversation["id"],
            "message_id": message_id,
            "rag_score": rag_score
        }


@router.post("/{workspace_id}/feedback")
async def submit_feedback(workspace_id: str, request: Request):
    """
    Enregistre le feedback utilisateur (👍 ou 👎) sur un message
    """
    # Log du body brut pour debug
    raw_body = await request.body()
    logger.info(f"📊 Feedback RAW body: {raw_body.decode('utf-8')}")
    
    # Parse le JSON
    try:
        import json
        body_data = json.loads(raw_body)
        logger.info(f"📊 Feedback parsed: {body_data}")
    except Exception as e:
        logger.error(f"❌ Erreur parsing JSON feedback: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    # Détecter le format et extraire les données
    message_id = body_data.get("message_id")
    feedback_value = body_data.get("feedback")
    
    # Format alternatif (embed.js) : {"type": "positive/negative", "session_id": "...", "message": "..."}
    if not message_id and body_data.get("type"):
        feedback_type = body_data.get("type")
        session_id = body_data.get("session_id")
        
        feedback_value = 1 if feedback_type == "positive" else -1
        
        if session_id:
            # Trouver le dernier message assistant de cette conversation
            msgs = MessagesDB.get_by_conversation(session_id)
            # Filtrer assistant et prendre le dernier
            assistant_msgs = [m for m in msgs if m["role"] == "assistant"]
            if assistant_msgs:
                message_id = assistant_msgs[-1]["id"]
                logger.info(f"📊 Message trouvé via session_id: {message_id}")
    
    # Valider qu'on a bien un message_id
    if not message_id:
        logger.warning("⚠️ Feedback sans message_id - ignoré")
        return {"success": True, "note": "No message_id found"}
    
    # Vérifier que le message appartient bien à ce workspace
    # On doit charger la conversation liée au message pour vérifier le workspace_id
    # MessagesDB ne donne pas le workspace directement, on doit faire une jointure ou 2 requetes.
    # On va faire simple: update directement. Si le message n'existe pas, ca retourne False.
    # Pour la sécurité, on pourrait vérifier mais c'est un endpoint public de toute façon.
    
    success = MessagesDB.update_feedback(message_id, feedback_value)
    
    if not success:
         logger.warning(f"⚠️ Message {message_id} non trouvé ou non mis à jour")
         return {"success": True, "note": "Message not found"}
    
    logger.info(f"✅ Feedback enregistré: message={message_id}, value={feedback_value}")
    return {"success": True}


@router.get("/{workspace_id}/script.js")
async def get_widget_script(workspace_id: str):
    """
    Retourne le script JavaScript du widget moderne
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

async def _get_or_create_conversation(workspace_id: str, session_id: str, visitor_id: str):
    """Récupère ou crée une conversation avec visitor_id"""
    
    if session_id:
        conv = ConversationsDB.get_by_id(session_id)
        if conv and str(conv["workspace_id"]) == str(workspace_id):
            # Mettre à jour le visitor_id si fourni et pas encore défini
            if visitor_id and not conv.get("visitor_id"):
                # TODO: Ajouter update_visitor_id dans ConversationsDB ?
                # Pour l'instant on laisse, c'est pas critique
                pass
            return conv
    
    # Nouvelle conversation
    return ConversationsDB.create(
        workspace_id=workspace_id, 
        session_id=session_id, # On peut stocker le session_id frontend si on veut, ou laisser l'ID généré
        visitor_id=visitor_id
    )


async def _check_order_intent(workspace_id: str, message: str, user_context: Optional[dict] = None) -> Optional[str]:
    """
    Vérifie si le message est une question de suivi de commande.
    - Détecte l'intention de suivi de commande
    - Vérifie que l'utilisateur est connecté et propriétaire de la commande
    - Si BDD désactivée : répond avec un message informatif
    - Si BDD activée : interroge la base de données
    """
    # 1. Détecter l'intention avec le LLM
    intent_detector = IntentDetector()
    intent = await intent_detector.detect(message)
    
    logger.info(f"🧠 Intent détectée: {intent}")
    
    if intent["intent"] != "order_tracking":
        return None
    
    order_number = intent.get("order_number")

    # ---------------------------------------------------------
    # SÉCURITÉ : Vérification du contexte utilisateur
    # ---------------------------------------------------------
    # Pour toute demande de suivi, on vérifie d'abord si l'utilisateur est connecté
    if not user_context or not user_context.get("isLoggedIn"):
        logger.warning(f"🔒 Accès refusé : Utilisateur non connecté demande suivi commande {order_number}")
        return (
            "Pour consulter le suivi de votre commande, **veuillez vous connecter à votre compte client** sur le site. 🔒\n\n"
            "Une fois connecté, je pourrai vous donner toutes les informations sur votre commande !"
        )
    
    user_id = user_context.get("id")
    # user_email = user_context.get("email") # Optionnel pour double vérif

    if not user_id:
        logger.error("❌ Erreur sécurité : isLoggedIn=True mais aucun ID utilisateur fourni")
        return "Impossible de vérifier votre identité. Veuillez rafraîchir la page et réessayer."

    # ---------------------------------------------------------

    
    # 2. Vérifier si la BDD externe est configurée ET activée
    db_config = WorkspaceDatabasesDB.get_enabled_by_workspace(workspace_id)
    
    # Si pas de config OU désactivée, informer que le suivi n'est pas disponible
    if not db_config:
        logger.info(f"⚠️ BDD externe désactivée - Message d'information pour suivi de commande")
        
        if order_number:
            return (
                f"Je vois que vous souhaitez consulter votre commande **{order_number}**. 📦\n\n"
                f"Le suivi automatique des commandes n'est pas encore disponible pour le moment.\n\n"
                f"**Pour suivre votre commande, veuillez :**\n"
                f"• Vous connecter à votre espace client en ligne\n"
                f"• Contacter notre service client :\n"
                f"  📧 Email : contact@coollibri.com\n"
                f"  📞 Téléphone : 05 31 61 60 42"
            )
        else:
            return (
                "Le suivi automatique des commandes n'est pas encore disponible pour le moment. 📦\n\n"
                "**Pour suivre votre commande, vous pouvez :**\n"
                "• Vous connecter à votre espace client en ligne\n"
                "• Contacter notre service client :\n"
                "  📧 Email : contact@coollibri.com\n"
                "  📞 Téléphone : 05 31 61 60 42"
            )
    
    # Si le type est "generic" (données indexées uniquement, pas de connexion directe)
    if db_config.get("schema_type") == "generic":
        logger.info(f"⚠️ Schema type 'generic' - Suivi non disponible")
        
        if order_number:
            return (
                f"Je vois que vous souhaitez consulter votre commande **{order_number}**. 📦\n\n"
                f"Le suivi automatique des commandes n'est pas encore disponible pour le moment.\n\n"
                f"**Pour suivre votre commande, veuillez :**\n"
                f"• Vous connecter à votre espace client en ligne\n"
                f"• Contacter notre service client :\n"
                f"  📧 Email : contact@coollibri.com\n"
                f"  📞 Téléphone : 05 31 61 60 42"
            )
        else:
            return (
                "Le suivi automatique des commandes n'est pas encore disponible pour le moment. 📦\n\n"
                "**Pour suivre votre commande, vous pouvez :**\n"
                "• Vous connecter à votre espace client en ligne\n"
                "• Contacter notre service client :\n"
                "  📧 Email : contact@coollibri.com\n"
                "  📞 Téléphone : 05 31 61 60 42"
            )
    
    # 3. BDD activée : continuer avec le traitement normal
    
    # Si pas de numéro, demander poliment
    if not order_number:
        return (
            "Pour suivre votre commande, j'ai besoin de votre **numéro de commande**. 📦\n\n"
            "Vous pouvez le retrouver dans l'email de confirmation de commande.\n\n"
            "Exemple : `13456` ou `commande 13456`"
        )
    
    # 4. Se connecter à la BDD externe et récupérer la commande
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
        
        # ---------------------------------------------------------
        # SÉCURITÉ : Vérification de propriété
        # ---------------------------------------------------------
        # On vérifie si l'ID client de la commande correspond à l'ID utilisateur connecté
        order_customer_id = str(order_details.get("customer_id", "")).lower()
        current_user_id = str(user_id).lower()
        
        if order_customer_id != current_user_id:
            logger.warning(f"⛔ SÉCURITÉ : Tentative accès commande {order_number} (Clt: {order_customer_id}) par User {current_user_id}")
            # On retourne un message générique "Non trouvé" pour ne pas fuiter l'existence de la commande
            return (
                f"Je n'ai pas trouvé de commande **{order_number}** associée à votre compte. 🔍\n\n"
                f"Vérifiez que vous êtes bien connecté avec le compte ayant passé la commande."
            )
        
        if order_customer_id == current_user_id:
             logger.info(f"✅ SÉCURITÉ : Accès autorisé commande {order_number} par User {current_user_id}")

        # ---------------------------------------------------------

        # Formater la réponse
        return order_service.format_order_response(order_details)
        
    except Exception as e:
        logger.error(f"Erreur interrogation BDD externe: {e}")
        return (
            f"Une erreur technique est survenue lors de la recherche de votre commande **{order_number}**. 😔\n\n"
            f"Veuillez réessayer dans quelques instants ou contacter notre service client."
        )


async def _get_response_with_score(rag: RAGPipeline, message: str, history: list):
    """Génère une réponse et calcule le score RAG"""
    # Générer la réponse (peut venir du cache)
    response, sources, from_cache = await rag.get_response(message, history)
    
    # Si depuis le cache, score = 1.0 (réponse validée)
    # Sinon score par défaut 0.5
    rag_score = 1.0 if from_cache else 0.5
    
    return response, sources, rag_score


async def _stream_response_with_score(rag: RAGPipeline, message: str, history: list, conversation_id: str):
    """Stream la réponse et stocke avec le score RAG + temps de réponse"""
    import asyncio
    import time
    
    start_time = time.time()  # Début du chrono
    ttfb_ms = None # Time to First Byte
    
    full_response = ""
    sources = []
    rag_score = 0.5  # Score par défaut
    
    async for chunk in rag.stream_response(message, history):
        # Capturer le TTFB au premier token
        if ttfb_ms is None:
            ttfb_ms = int((time.time() - start_time) * 1000)

        if chunk.get("type") == "token":
            # Correction: chunk["content"] est déjà un string
            content = chunk["content"] 
            full_response += content
            yield f"data: {json.dumps(chunk)}\n\n"
            # Petit délai pour ralentir le streaming (20ms)
            await asyncio.sleep(0.02)
        elif chunk.get("type") == "sources":
            sources = chunk.get("sources", [])
        elif chunk.get("type") == "rag_score":
            rag_score = chunk.get("score", 0.5)
        elif chunk.get("type") == "error":
            yield f"data: {json.dumps(chunk)}\n\n"
    
    # Post-traitement: corriger les emails malformés
    full_response = fix_email_format(full_response)
    
    # Calculer le temps de réponse total en millisecondes
    response_time_ms = int((time.time() - start_time) * 1000)
    
    # Si ttfb n'a pas été capturé (ex: réponse vide ou erreur immédiate), on le met égal au temps total
    if ttfb_ms is None:
        ttfb_ms = response_time_ms
        
    logger.debug(f"⏱️ Temps de réponse: {response_time_ms}ms (TTFB: {ttfb_ms}ms)")
    
    # Sauvegarder la réponse avec le score RAG et le temps de réponse
    msg_result = MessagesDB.create(
        conversation_id=conversation_id,
        role="assistant",
        content=full_response,
        rag_score=rag_score,
        sources=sources,
        response_time_ms=response_time_ms,
        ttfb_ms=ttfb_ms
    )
    
    message_id = msg_result["id"]
    
    # Signal de fin avec session_id et message_id pour le feedback
    yield f"data: {json.dumps({'type': 'done', 'session_id': conversation_id, 'message_id': message_id, 'rag_score': rag_score})}\n\n"


def _increment_analytics(workspace_id: str, visitor_id: str):
    """Incrémente les compteurs analytics quotidiens"""
    from datetime import date
    from app.core.database import get_db
    
    today = date.today().isoformat()
    new_visitors = 0
    
    # Vérifier si c'est un visiteur unique aujourd'hui
    # C'est un visiteur unique s'il n'a pas encore eu de conversation activée aujourd'hui
    if visitor_id:
        db = get_db()
        with db.cursor() as cursor:
            # On vérifie si ce visiteur a déjà interagi aujourd'hui
            # On regarde analytics_daily pour voir si on a déjà compté ce visiteur ? 
            # Non, analytics_daily est agrégé.
            # On doit regarder la table conversations.
            # ATTENTION: Cette fonction est appelée APRES l'insertion du message
            # Donc il y a AU MOINS une conversation (celle en cours).
            # On doit vérifier s'il y a d'AUTRES conversations pour ce visitor_id aujourd'hui AVANT celle-ci ?
            # Ou simplement: est-ce que c'est le PREMIER message de la PREMIERE conversation du jour ?
            
            # Approche simplifiée : On compte un visiteur unique si c'est la première fois qu'on voit ce visitor_id aujourd'hui
            cursor.execute("""
                SELECT COUNT(*) FROM conversations 
                WHERE workspace_id = ? 
                AND visitor_id = ? 
                AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
            """, (workspace_id, visitor_id))
            
            count = cursor.fetchone()[0]
            # Si count == 1, c'est la conversation qu'on vient de créer/utiliser pour ce message (si elle est nouvelle)
            # Mais attention, _get_or_create_conversation est appelée avant.
            # Si on réutilise une conversation existante du jour, count >= 1.
            # Si on crée une nouvelle, count >= 1.
            
            # On va considérer que c'est un nouveau visiteur SI c'est sa TOUTE PREMIÈRE interaction (message) de la journée.
            # Pour ça, il faudrait qu'on sache si on vient d'incrémenter le messages_count de 0 à 1 sur sa PREMIERE conversation du jour.
            
            # Simplification robuste :
            # On utilise une table de tracking journalier des visiteurs en mémoire ou une requête plus fine ?
            # Trop complexe pour maintenant.
            
            # Alternative : On fait confiance au frontend pour le compteur ? Non.
            
            # On va dire : Si count == 1 (c'est la seule conversation du jour) ET que cette conversation n'a que ce message (messages_count=1)
            # Alors c'est un nouveau visiteur.
            pass

            # Update: La logique ci-dessus est trop couplée.
            # Mieux : On utilise le fait que AnalyticsDB.increment_stats fait un UPDATE.
            # Mais on ne sait pas si on doit incrémenter unique_visitors.
            
            # Re-simplifions : On vérifie juste s'il y a d'autres conversations "anciennes" (> 1 min ?) ou si c'est la seule.
            if count == 1:
                # C'est potentiellement la première. Vérifions le nombre de messages de cette conv.
                # Si messages_count == 1, c'est le tout premier message de la journée.
                 cursor.execute("""
                    SELECT messages_count FROM conversations 
                    WHERE workspace_id = ? AND visitor_id = ? AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
                """, (workspace_id, visitor_id))
                 rows = cursor.fetchall()
                 # Si toutes les conversations du jour ont somme(messages_count) == 1, alors c'est le premier message.
                 total_msgs_today = sum(r[0] for r in rows if r[0] is not None)
                 
                 if total_msgs_today <= 1:
                     new_visitors = 1

    
    AnalyticsDB.increment_stats(
        workspace_id=workspace_id,
        date=today,
        new_messages=1,
        new_conversations=0, # TODO: Détecter nouvelle conv
        new_visitors=new_visitors
    )


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
