"""
Logique de réponse intelligente pour le suivi de commandes
Basé sur l'analyse de la base de données CoolLibri
"""

from datetime import datetime, timedelta
import re
from app.services.smart_date_handler import SmartDateHandler

# Correspondance des statuts avec des messages clients
STATUS_MESSAGES = {
    1: {
        "name": "Commande reçue",
        "message": "Votre commande a été reçue et va être prise en charge prochainement.",
        "emoji": "📥",
        "stage": "Réception"
    },
    2: {
        "name": "En cours de traitement", 
        "message": "Votre commande est en cours de traitement par nos équipes.",
        "emoji": "⚙️",
        "stage": "Traitement"
    },
    3: {
        "name": "Prépresse (PAO)",
        "message": "Votre livre est en cours de préparation technique (mise en page, vérifications).",
        "emoji": "🖥️", 
        "stage": "Prépresse"
    },
    4: {
        "name": "Bon à tirer",
        "message": "Votre livre est prêt pour validation avant impression.",
        "emoji": "✅",
        "stage": "Validation"
    },
    5: {
        "name": "Prépresse numérique",
        "message": "Préparation technique pour impression numérique en cours.",
        "emoji": "💻",
        "stage": "Prépresse"
    },
    6: {
        "name": "Prépresse offset", 
        "message": "Préparation technique pour impression offset en cours.",
        "emoji": "🖨️",
        "stage": "Prépresse"
    },
    7: {
        "name": "Impression numérique",
        "message": "Votre livre est actuellement en cours d'impression (numérique).",
        "emoji": "🖨️",
        "stage": "Impression"
    },
    8: {
        "name": "Impression offset",
        "message": "Votre livre est actuellement en cours d'impression (offset).",
        "emoji": "🖨️", 
        "stage": "Impression"
    },
    9: {
        "name": "Reliure",
        "message": "Votre livre est en cours de reliure et assemblage.",
        "emoji": "📖",
        "stage": "Finition"
    },
    10: {
        "name": "Façonnage",
        "message": "Dernières finitions de votre livre en cours (découpe, reliure finale).",
        "emoji": "✂️",
        "stage": "Finition"
    },
    11: {
        "name": "Contrôle qualité",
        "message": "Votre livre passe les contrôles qualité avant expédition.",
        "emoji": "🔍",
        "stage": "Contrôle"
    },
    12: {
        "name": "Prêt à expédier",
        "message": "Votre livre est terminé et prêt pour expédition.",
        "emoji": "📦",
        "stage": "Expédition"
    }
}

# Messages selon les dates de production/expédition
def get_shipping_status_message(order_data):
    """Génère un message de statut basé sur les dates de l'order avec gestion intelligente des retards."""
    
    current_date = datetime.now()
    order_number = str(order_data.get("order_id", "INCONNU"))
    
    for item in order_data["items"]:
        production_date = item.get("production_date")
        estimated_shipping = item.get("estimated_shipping") 
        confirmed_shipping = item.get("confirmed_shipping")
        tracking_url = item.get("tracking_url")
        
        # Si expédition confirmée
        if confirmed_shipping:
            if tracking_url:
                return f"📦 **Expédié !** Votre commande a été expédiée le {confirmed_shipping[:10]}. Suivi: {tracking_url}"
            else:
                return f"📦 **Expédié !** Votre commande a été expédiée le {confirmed_shipping[:10]}."
        
        # ⚡ GESTION INTELLIGENTE DES DATES - Si date d'expédition estimée existe
        if estimated_shipping:
            # Utiliser SmartDateHandler pour gérer les retards
            date_result = SmartDateHandler.format_shipping_date_smart(
                shipping_date=estimated_shipping[:10],
                order_number=order_number,
                current_date=current_date
            )
            
            # Retourner le message approprié selon le statut
            if date_result["status"] == "on_time":
                # Date future ou dans les temps
                return f"🚚 **Bientôt expédié !** {date_result['message']}"
            elif date_result["status"] == "minor_delay":
                # Retard 1-3 jours - Information avec délai supplémentaire possible
                return f"⏱️ **Petit retard** {date_result['message']}"
            elif date_result["status"] == "major_delay":
                # Retard > 3 jours - Redirection vers hotline
                return f"🚨 **Veuillez contacter le service client**\n\n{date_result['message']}"
        
        # Si date de production passée mais pas encore expédié (et pas de estimated_shipping)
        if production_date and production_date < current_date.isoformat():
            return "🚚 **En préparation d'expédition** Production terminée, préparation de l'envoi en cours."
        
        # Si en cours de production
        if production_date:
            return f"⚙️ **En production** Votre livre est en cours de fabrication. Expédition prévue prochainement."
    
    return "📥 **En cours de traitement** Votre commande est prise en charge par nos équipes."

# Templates de réponse complète
def generate_order_status_response(order_data, current_status_id=None):
    """Génère une réponse naturelle et conversationnelle pour le statut de commande."""
    
    order_id = order_data["order_id"]
    customer_name = order_data["customer"]["name"]
    first_name = customer_name.split()[0] if customer_name else "Client"
    total = order_data["total"]
    payment_date = order_data.get("payment_date")
    status_id = order_data.get("status_id", 1)
    
    # Récupérer les infos des produits
    items = order_data.get("items", [])
    first_item = items[0] if items else {}
    
    num_pages = first_item.get("num_pages", 0)
    quantity = first_item.get("quantity", 1)
    production_date = first_item.get("production_date")
    estimated_shipping = first_item.get("estimated_shipping")
    confirmed_shipping = first_item.get("confirmed_shipping")
    shipping_info = first_item.get("shipping", {})
    delay_min = shipping_info.get("delay_min", 2)
    delay_max = shipping_info.get("delay_max", 3)
    
    # ⚠️ VALIDATION DU PAIEMENT - PRIORITÉ ABSOLUE
    if not payment_date:
        response = f"Bonjour {first_name} ! 👋\n\n"
        response += f"J'ai bien retrouvé votre commande n°{order_id}"
        
        # Mentionner les détails du livre
        if num_pages and quantity:
            if quantity == 1:
                response += f" pour votre livre de {num_pages} pages"
            else:
                response += f" pour {quantity} exemplaires de votre livre de {num_pages} pages"
        
        response += f", d'un montant de {total}€.\n\n"
        
        response += "Cependant, je constate que votre paiement est encore en attente de validation par nos services. Cela arrive notamment pour les paiements par chèque ou par virement bancaire, qui nécessitent un délai de traitement.\n\n"
        
        response += "Dès que votre paiement sera confirmé, vous recevrez un email et votre commande entrera en production. C'est important de noter que les délais de livraison commenceront à partir de cette validation.\n\n"
        
        response += "Si vous avez effectué votre paiement récemment, pas d'inquiétude, nos équipes le valideront sous peu ! En cas de question, n'hésitez pas à contacter notre service client par email à contact@coollibri.com ou par téléphone au 05 31 61 60 42.\n\n"
        
        response += "À très bientôt ! 😊"
        
        return response
    
    # Construire la réponse naturelle (paiement validé)
    response = f"Bonjour {first_name} ! 👋\n\n"
    response += f"J'ai bien retrouvé votre commande n°{order_id}. "
    
    # Mentionner les détails du livre de manière naturelle
    if num_pages and quantity:
        if quantity == 1:
            response += f"Il s'agit de votre livre de {num_pages} pages. "
        else:
            response += f"Il s'agit de {quantity} exemplaires de votre livre de {num_pages} pages. "
    elif quantity > 1:
        response += f"Il s'agit de {quantity} exemplaires. "
    
    # Mentionner le paiement validé avec la date
    payment_date_obj = datetime.fromisoformat(payment_date[:10]) if isinstance(payment_date, str) else payment_date
    response += f"Votre paiement de {total}€ a bien été validé le {payment_date_obj.strftime('%d/%m/%Y')}.\n\n\n"
    
    # Message selon le statut avec langage naturel
    if status_id in STATUS_MESSAGES:
        status_info = STATUS_MESSAGES[status_id]
        
        if status_id == 1:
            response += "Votre commande vient d'être réceptionnée par nos équipes. Elle va être prise en charge très prochainement pour entrer en production"
            if production_date:
                prod_date = datetime.fromisoformat(production_date[:10])
                response += f", normalement dès le {prod_date.strftime('%d/%m/%Y')}"
            response += ".\n\n"
        elif status_id == 2:
            response += "Bonne nouvelle, votre commande est actuellement en cours de traitement ! Nos équipes sont en train de préparer tout le nécessaire pour lancer la production.\n\n"
        elif status_id == 3:
            response += "Votre livre est en phase de prépresse, c'est-à-dire que nos graphistes travaillent sur la mise en page et vérifient que tout est parfait avant l'impression.\n\n"
        elif status_id == 4:
            response += "Votre livre est au stade du bon à tirer ! Cela signifie qu'il est prêt pour une dernière validation avant de passer en impression.\n\n"
        elif status_id in [5, 6]:
            response += "Votre livre est en cours de préparation technique pour l'impression. Tout est vérifié minutieusement pour garantir un résultat de qualité.\n\n"
        elif status_id in [7, 8]:
            response += "Excellente nouvelle ! Votre livre est actuellement en cours d'impression. Les machines tournent pour créer votre ouvrage ! 🖨️\n\n"
        elif status_id == 9:
            response += "Votre livre est passé à l'étape de la reliure. C'est là qu'on assemble toutes les pages pour donner vie à votre livre.\n\n"
        elif status_id == 10:
            response += "Nous sommes à l'étape du façonnage, c'est-à-dire les dernières finitions de votre livre (découpe, reliure finale). C'est presque terminé !\n\n"
        elif status_id == 11:
            response += "Votre livre passe actuellement les contrôles qualité. Nos équipes s'assurent que tout est impeccable avant l'expédition.\n\n"
        elif status_id == 12:
            response += "Super ! Votre livre est terminé et prêt pour l'expédition. Il va bientôt partir vers vous.\n\n"
    
    # Informations sur l'expédition avec calculs de dates précises
    current_date = datetime.now()
    
    if confirmed_shipping:
        ship_date = datetime.fromisoformat(confirmed_shipping[:10])
        response += f"Votre commande a été expédiée le {ship_date.strftime('%d/%m/%Y')}. "
        
        # Calculer la date de livraison estimée
        delivery_date_min = ship_date + timedelta(days=delay_min)
        delivery_date_max = ship_date + timedelta(days=delay_max)
        
        if delivery_date_min.date() == delivery_date_max.date():
            response += f"Elle devrait arriver chez vous le {delivery_date_min.strftime('%d/%m/%Y')} ! 📦\n\n"
        else:
            response += f"Elle devrait arriver chez vous entre le {delivery_date_min.strftime('%d/%m/%Y')} et le {delivery_date_max.strftime('%d/%m/%Y')} ! 📦\n\n"
    
    elif estimated_shipping:
        ship_date = datetime.fromisoformat(estimated_shipping[:10])
        order_number = str(order_id)
        
        # Utiliser SmartDateHandler pour gérer les retards
        date_result = SmartDateHandler.format_shipping_date_smart(
            shipping_date=estimated_shipping[:10],
            order_number=order_number,
            current_date=current_date
        )
        
        # Calculer la date de livraison estimée à partir de la date d'expédition
        delivery_date_min = ship_date + timedelta(days=delay_min)
        delivery_date_max = ship_date + timedelta(days=delay_max)
        
        if date_result["status"] == "on_time":
            # Date future - donner l'estimation complète
            days_until_shipping = (ship_date.date() - current_date.date()).days
            
            if days_until_shipping > 0:
                response += f"Votre livre devrait être expédié le {ship_date.strftime('%d/%m/%Y')} (dans {days_until_shipping} jour{'s' if days_until_shipping > 1 else ''}). "
            else:
                response += f"Votre livre devrait être expédié très bientôt (normalement le {ship_date.strftime('%d/%m/%Y')}). "
            
            # Estimation de livraison
            if delivery_date_min.date() == delivery_date_max.date():
                response += f"Vous devriez le recevoir vers le {delivery_date_min.strftime('%d/%m/%Y')}.\n\n"
            else:
                response += f"Vous devriez le recevoir entre le {delivery_date_min.strftime('%d/%m/%Y')} et le {delivery_date_max.strftime('%d/%m/%Y')}.\n\n"
        
        elif date_result["status"] == "minor_delay":
            # Petit retard - recalculer avec le délai supplémentaire
            delay_days = date_result["delay_days"]
            new_shipping_estimate = ship_date + timedelta(days=delay_days)
            new_delivery_min = new_shipping_estimate + timedelta(days=delay_min)
            new_delivery_max = new_shipping_estimate + timedelta(days=delay_max)
            
            response += f"Je note un petit retard de {delay_days} jour{'s' if delay_days > 1 else ''}. "
            response += f"Votre livre devrait maintenant être expédié vers le {new_shipping_estimate.strftime('%d/%m/%Y')}, "
            
            if new_delivery_min.date() == new_delivery_max.date():
                response += f"et vous devriez le recevoir aux alentours du {new_delivery_min.strftime('%d/%m/%Y')}. "
            else:
                response += f"et vous devriez le recevoir entre le {new_delivery_min.strftime('%d/%m/%Y')} et le {new_delivery_max.strftime('%d/%m/%Y')}. "
            
            response += "Pas d'inquiétude, un délai supplémentaire de quelques jours peut parfois être nécessaire !\n\n"
        
        elif date_result["status"] == "major_delay":
            response += f"Je constate que votre commande a pris du retard par rapport à la date d'expédition initialement prévue ({ship_date.strftime('%d/%m/%Y')}). "
            response += f"Je vous invite vivement à contacter notre service client par email à contact@coollibri.com ou par téléphone au 05 31 61 60 42 en mentionnant votre numéro de commande #{order_number}. "
            response += "Ils pourront vous donner des informations précises et actualisées sur votre situation.\n\n"
    
    elif production_date:
        # Si on a une date de production mais pas d'expédition estimée
        prod_date = datetime.fromisoformat(production_date[:10])
        days_until_prod = (prod_date.date() - current_date.date()).days
        
        if days_until_prod > 0:
            response += f"La production de votre livre est prévue pour le {prod_date.strftime('%d/%m/%Y')} (dans {days_until_prod} jour{'s' if days_until_prod > 1 else ''}). "
        else:
            response += f"La production de votre livre devrait avoir démarré (prévue le {prod_date.strftime('%d/%m/%Y')}). "
        
        response += "L'expédition sera effectuée dès que votre livre sera prêt.\n\n"
    else:
        response += "L'expédition sera effectuée dès que votre livre sera prêt. Je n'ai pas encore de date précise à vous communiquer.\n\n"
    
    # Message de fin naturel
    response += "Si vous avez la moindre question sur votre commande, je suis là pour vous aider ! 😊"
    
    return response

# Détection automatique des demandes de suivi
ORDER_TRACKING_KEYWORDS = [
    "commande", "commandes", "numéro", "statut", "où en est", "livraison", 
    "expédition", "tracking", "suivi", "en cours", "reçu",
    "impression", "délai", "chronopost", "gls"
]

def detect_order_inquiry(user_message):
    """Détecte si l'utilisateur demande des infos sur sa commande."""
    message_lower = user_message.lower()
    
    # Mots-clés de base
    has_order_keyword = any(keyword in message_lower for keyword in ORDER_TRACKING_KEYWORDS)
    
    # Patterns spécifiques
    order_patterns = [
        r"commande\s*#?\s*\d+",  # "commande 12345" ou "commande #12345"
        r"numéro\s+\d+",         # "numéro 12345" 
        r"où\s+en\s+est",        # "où en est ma commande"
        r"livraison\s+de",       # "livraison de ma commande"
        r"reçu\s+ma\s+commande", # "reçu ma commande"
    ]
    
    import re
    has_pattern = any(re.search(pattern, message_lower) for pattern in order_patterns)
    
    return has_order_keyword or has_pattern

# Extraction du numéro de commande depuis un message
def extract_order_number(user_message):
    """Extrait le numéro de commande d'un message utilisateur."""
    
    # Recherche de patterns numériques
    patterns = [
        r"commande\s*#?\s*(\d+)",     # "commande 12345" 
        r"numéro\s*#?\s*(\d+)",       # "numéro 12345"
        r"#(\d+)",                    # "#12345"
        r"\b(\d{4,})\b"               # tout nombre de 4+ chiffres
    ]
    
    for pattern in patterns:
        match = re.search(pattern, user_message, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None