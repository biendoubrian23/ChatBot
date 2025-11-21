"""
Logique de réponse intelligente pour le suivi de commandes
Basé sur l'analyse de la base de données CoolLibri
"""

from datetime import datetime
import re

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
    """Génère un message de statut basé sur les dates de l'order."""
    
    current_date = datetime.now()
    
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
        
        # Si date de production passée mais pas encore expédié
        if production_date and production_date < current_date.isoformat():
            if estimated_shipping:
                return f"🚚 **Bientôt expédié !** Production terminée. Expédition prévue le {estimated_shipping[:10]}."
            else:
                return "🚚 **En préparation d'expédition** Production terminée, préparation de l'envoi en cours."
        
        # Si en cours de production
        if production_date:
            return f"⚙️ **En production** Votre livre est en cours de fabrication. Expédition prévue le {estimated_shipping[:10] if estimated_shipping else 'prochainement'}."
    
    return "📥 **En cours de traitement** Votre commande est prise en charge par nos équipes."

# Templates de réponse complète
def generate_order_status_response(order_data, current_status_id=None):
    """Génère une réponse complète de statut de commande."""
    
    order_id = order_data["order_id"]
    customer_name = order_data["customer"]["name"]
    total = order_data["total"]
    
    # En-tête
    response = f"📋 **Statut de votre commande #{order_id}**\n\n"
    response += f"👤 Client: {customer_name}\n"
    response += f"💰 Montant: {total}€\n\n"
    
    # Statut principal
    if current_status_id and current_status_id in STATUS_MESSAGES:
        status_info = STATUS_MESSAGES[current_status_id]
        response += f"{status_info['emoji']} **{status_info['name']}**\n"
        response += f"{status_info['message']}\n\n"
    
    # Informations détaillées par produit
    response += "📦 **Détails des produits:**\n"
    for item in order_data["items"]:
        response += f"• {item['product_name']} - {item['quantity']} exemplaire(s)\n"
        if item.get('chrono_number'):
            response += f"  🔢 Numéro Chrono: {item['chrono_number']}\n"
        if item.get('num_pages'):
            response += f"  📄 Pages: {item['num_pages']}\n"
    
    response += "\n"
    
    # Message de statut d'expédition
    shipping_message = get_shipping_status_message(order_data)
    response += shipping_message + "\n\n"
    
    # Adresse de livraison
    address = order_data["customer"]
    response += f"🏠 **Adresse de livraison:**\n"
    response += f"{address['address']}\n"
    if address.get('address2'):
        response += f"{address['address2']}\n"
    response += f"{address['zip_code']} {address['city']}\n\n"
    
    # Message de fin
    response += "❓ **Vous avez des questions ?** N'hésitez pas à me demander plus d'informations !"
    
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