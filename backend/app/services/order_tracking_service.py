"""Service pour le tracking intelligent des commandes avec calcul de dates."""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from app.services.database import DatabaseService


class OrderTrackingService:
    """Service pour récupérer et formater les informations de tracking."""
    
    # Mapping des statuts en français
    STATUS_LABELS = {
        1: "Commande non commencée",
        2: "Commande commencée",
        3: "Phase PAO (Prépresse)",
        4: "Bon À Tirer (BAT)",
        5: "Prépresse numérique",
        6: "Prépresse offset",
        7: "Impression numérique",
        8: "Impression offset",
        9: "Reliure",
        10: "Façonnage/finition",
        11: "Expédition",
        12: "Livrée",
        13: "Anomalie",
        14: "Validation Transport",
        15: "Annulée",
        16: "Terminée"
    }
    
    # Étapes du workflow
    WORKFLOW_STAGES = {
        1: "Initialisation",
        2: "Préparation fichiers",
        3: "Validation",
        4: "Impression",
        5: "Finition",
        6: "Expédition",
        7: "Livraison"
    }
    
    def __init__(self):
        self.db = DatabaseService()
    
    def get_order_tracking_info(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupère les infos complètes de tracking."""
        return self.db.get_order_tracking_details(order_number)
    
    def calculate_delivery_estimate(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule l'estimation de livraison basée sur les dates actuelles et les délais.
        
        Returns:
            Dict avec dates estimées et messages formatés
        """
        today = datetime.now().date()
        
        # Récupérer les infos du premier item (principal)
        if not order_data.get("items"):
            return {}
        
        first_item = order_data["items"][0]
        
        # Dates de production et expédition prévues
        production_date_str = first_item.get("production_date")
        estimated_shipping_str = first_item.get("estimated_shipping")
        confirmed_shipping_str = first_item.get("confirmed_shipping")
        
        # Convertir en objets date
        production_date = None
        estimated_shipping_date = None
        confirmed_shipping_date = None
        
        if production_date_str:
            production_date = datetime.fromisoformat(production_date_str.split()[0]).date()
        
        if estimated_shipping_str:
            estimated_shipping_date = datetime.fromisoformat(estimated_shipping_str.split()[0]).date()
        
        if confirmed_shipping_str:
            confirmed_shipping_date = datetime.fromisoformat(confirmed_shipping_str.split()[0]).date()
        
        # Délai de livraison depuis l'expédition
        shipping_info = first_item.get("shipping", {})
        delay_min = shipping_info.get("delay_min", 2)
        delay_max = shipping_info.get("delay_max", 3)
        
        # Calculer la date de livraison estimée
        delivery_date_min = None
        delivery_date_max = None
        
        if confirmed_shipping_date:
            # Si expédition confirmée, on calcule depuis cette date
            delivery_date_min = confirmed_shipping_date + timedelta(days=delay_min)
            delivery_date_max = confirmed_shipping_date + timedelta(days=delay_max)
        elif estimated_shipping_date:
            # Sinon depuis l'estimation
            delivery_date_min = estimated_shipping_date + timedelta(days=delay_min)
            delivery_date_max = estimated_shipping_date + timedelta(days=delay_max)
        
        # Calculer le nombre de jours restants
        days_until_production = None
        days_until_shipping = None
        days_until_delivery = None
        
        if production_date and production_date > today:
            days_until_production = (production_date - today).days
        
        if estimated_shipping_date and estimated_shipping_date > today:
            days_until_shipping = (estimated_shipping_date - today).days
        
        if delivery_date_min and delivery_date_min > today:
            days_until_delivery = (delivery_date_min - today).days
        
        return {
            "today": today,
            "production_date": production_date,
            "estimated_shipping_date": estimated_shipping_date,
            "confirmed_shipping_date": confirmed_shipping_date,
            "delivery_date_min": delivery_date_min,
            "delivery_date_max": delivery_date_max,
            "days_until_production": days_until_production,
            "days_until_shipping": days_until_shipping,
            "days_until_delivery": days_until_delivery,
            "delay_min": delay_min,
            "delay_max": delay_max
        }
    
    def generate_tracking_response(self, order_data: Dict[str, Any]) -> str:
        """
        Génère une réponse formatée en Markdown avec toutes les informations de tracking.
        
        Args:
            order_data: Données complètes de la commande
        
        Returns:
            Réponse formatée en Markdown
        """
        # Infos de base
        order_id = order_data["order_id"]
        customer_name = order_data["customer"]["name"]
        status_id = order_data["status_id"]
        status_name = order_data.get("status_name", "")
        status_stage = order_data.get("status_stage", 1)
        
        # Label français du statut
        status_label = self.STATUS_LABELS.get(status_id, status_name)
        
        # Calcul des dates
        dates = self.calculate_delivery_estimate(order_data)
        
        # Items
        items = order_data.get("items", [])
        first_item = items[0] if items else {}
        
        # Construction du message conversationnel
        lines = []
        
        # En-tête personnalisé
        # Extraire le prénom du nom complet
        first_name = customer_name.split()[0] if customer_name else "Client"
        
        lines.append(f"# Suivi de votre commande #{order_id}")
        lines.append("")
        lines.append(f"Bonjour {first_name} ! 👋")
        lines.append("")
        
        # État actuel avec emoji
        stage_emoji = {
            1: "🟡", 2: "🟠", 3: "🔵", 4: "🟣",
            5: "🟢", 6: "🚚", 7: "✅"
        }
        emoji = stage_emoji.get(status_stage, "⚪")
        
        lines.append(f"{emoji} **État actuel : {status_label}**")
        
        # Message personnalisé selon le statut
        if status_id in [1, 2]:
            lines.append("Votre commande est en cours de préparation initiale. Nous allons bientôt commencer à travailler dessus. ⏳")
        elif status_id in [3, 4]:
            lines.append("Vos fichiers sont en cours de validation et préparation. Nos graphistes s'assurent que tout est parfait pour l'impression. 🎨")
        elif status_id in [5, 6, 7, 8]:
            lines.append("Votre commande est en cours d'impression. Les machines tournent pour créer votre ouvrage ! 🖨️")
        elif status_id in [9, 10]:
            lines.append("Votre commande est en phase de finition, c'est-à-dire que la reliure et le façonnage sont en cours. Tout est sur la bonne voie pour que vous la receviez rapidement. ✂️")
        elif status_id == 11:
            lines.append("Bonne nouvelle ! Votre commande a été expédiée et est en route vers vous. 📮")
        elif status_id == 12:
            lines.append("Parfait ! Votre commande a été livrée. Nous espérons que vous en êtes satisfait ! ✅")
        elif status_id == 13:
            lines.append("Une anomalie a été détectée sur votre commande. Notre équipe travaille activement à la résoudre. Nous vous tiendrons informé. ⚠️")
        
        lines.append("")
        
        # Dates clés
        lines.append("## 📅 Dates clés")
        lines.append("")
        
        # Production
        if dates.get("production_date"):
            prod_date = dates["production_date"]
            formatted_prod = prod_date.strftime("%d/%m/%Y")
            
            if dates.get("days_until_production") and dates["days_until_production"] > 0:
                lines.append(f"🏭 **Production** : le {formatted_prod} (dans {dates['days_until_production']} jours)")
                lines.append("→ La production commencera officiellement à cette date.")
            else:
                lines.append(f"🏭 **Production** : le {formatted_prod}")
                lines.append("→ La production a déjà commencé ou est terminée.")
            
            lines.append("")
        
        # Expédition
        if dates.get("estimated_shipping_date"):
            ship_date = dates["estimated_shipping_date"]
            formatted_ship = ship_date.strftime("%d/%m/%Y")
            
            if dates.get("days_until_shipping") and dates["days_until_shipping"] > 0:
                lines.append(f"📦 **Expédition prévue** : le {formatted_ship} (dans {dates['days_until_shipping']} jours)")
                lines.append("→ Votre commande sera expédiée ce jour-là.")
            else:
                lines.append(f"📦 **Expédition prévue** : le {formatted_ship}")
                lines.append("→ L'expédition est imminente ou déjà effectuée.")
            
            lines.append("")
        
        # Livraison avec info transporteur
        if dates.get("delivery_date_min") and dates.get("delivery_date_max"):
            del_min = dates["delivery_date_min"]
            del_max = dates["delivery_date_max"]
            
            formatted_min = del_min.strftime("%d/%m/%Y")
            formatted_max = del_max.strftime("%d/%m/%Y")
            
            shipping = first_item.get("shipping", {})
            company_name = shipping.get("company_name", "")
            company_label = shipping.get("label", "Livraison standard")
            delay_min = shipping.get("delay_min", 0)
            delay_max = shipping.get("delay_max", 0)
            
            if del_min == del_max:
                if dates.get("days_until_delivery"):
                    days = dates["days_until_delivery"]
                    lines.append(f"🚚 **Livraison estimée** : le {formatted_min} (dans environ {days} jours)")
                else:
                    lines.append(f"🚚 **Livraison estimée** : le {formatted_min}")
            else:
                if dates.get("days_until_delivery"):
                    days = dates["days_until_delivery"]
                    days_max = days + (dates['delay_max'] - dates['delay_min'])
                    lines.append(f"🚚 **Livraison estimée** : entre le {formatted_min} et le {formatted_max} (dans environ {days} à {days_max} jours)")
                else:
                    lines.append(f"🚚 **Livraison estimée** : entre le {formatted_min} et le {formatted_max}")
            
            # Info transporteur dans le texte
            if company_name:
                delivery_info = f"→ Vous la recevrez à domicile via {company_name}"
                if company_label and "standard" in company_label.lower():
                    delivery_info += " en livraison standard"
                elif company_label and "express" in company_label.lower():
                    delivery_info += " en livraison express"
                
                if delay_min and delay_max and delay_min == delay_max:
                    delivery_info += f", avec un délai de {delay_min} jour(s) après expédition."
                elif delay_min and delay_max:
                    delivery_info += f", avec un délai de {delay_min} à {delay_max} jours après expédition."
                else:
                    delivery_info += "."
                
                lines.append(delivery_info)
            
            lines.append("")
        
        # Détails de la commande (simplifié)
        lines.append("## 📚 Détails de votre commande")
        lines.append("")
        
        num_pages = first_item.get("num_pages", 0)
        quantity = first_item.get("quantity", 1)
        ready = first_item.get("ready_to_reproduce", False)
        files_retrieved = first_item.get("files_retrieved", 0)
        
        if num_pages:
            lines.append(f"**Pages** : {num_pages}")
            lines.append("")
        
        if quantity:
            lines.append(f"**Quantité** : {quantity}")
            lines.append("")
        
        if ready:
            lines.append(f"**Fichiers** : ✅ Prêt pour reproduction ({files_retrieved} fichier récupéré)")
        else:
            lines.append(f"**Fichiers** : ⏳ En attente ({files_retrieved} fichier récupéré)")
        
        lines.append("")
        
        # Récapitulatif financier
        lines.append("## 💰 Récapitulatif")
        lines.append("")
        
        total = order_data.get("total", 0)
        shipping_cost = order_data.get("shipping", 0)
        paid = order_data.get("paid", False)
        
        lines.append(f"**Montant total** : {total:.2f} €")
        lines.append("")
        lines.append(f"**Frais de port** : {shipping_cost:.2f} €")
        lines.append("")
        lines.append(f"**Paiement** : {'✅ Payé' if paid else '⏳ En attente'}")
        
        lines.append("")
        
        # Message de fin convivial
        lines.append("💡 Si vous avez des questions ou souhaitez plus de détails sur votre commande, n'hésitez pas à me demander ! Je peux également vous informer dès que l'expédition est confirmée. 🚀")
        
        return "\n".join(lines)
    
    def validate_customer_name(self, order_number: str, customer_name: str) -> tuple:
        """
        Valide le nom du client pour une commande.
        
        Returns:
            (is_valid, full_name, error_message)
        """
        order_data = self.get_order_tracking_info(order_number)
        
        if not order_data:
            return (False, None, "Commande introuvable")
        
        full_name = order_data["customer"]["name"]
        
        # Validation simple : vérifier si le nom saisi est dans le nom complet
        if customer_name.lower() in full_name.lower():
            return (True, full_name, None)
        else:
            return (False, None, "Le nom ne correspond pas à cette commande")
