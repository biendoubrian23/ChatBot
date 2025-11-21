"""
Service intelligent de suivi de commandes avec réponses contextuelles
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pyodbc
from app.services.database import db_service

class OrderTrackingService:
    """Service pour le suivi intelligent des commandes"""
    
    # Mapping des statuts vers des messages clients
    STATUS_MESSAGES = {
        1: {
            "stage": "Commande non commencée",
            "message": "📋 Votre commande n'a pas encore démarré le processus de production.",
            "emoji": "⏳",
            "color": "gray"
        },
        2: {
            "stage": "Commande commencée",
            "message": "🎯 Votre commande a été prise en charge et est en cours de traitement.",
            "emoji": "✅",
            "color": "blue"
        },
        3: {
            "stage": "Phase PAO (Prépresse)",
            "message": "🎨 Votre commande est en phase PAO (Prépresse). Nos graphistes préparent vos fichiers pour l'impression.",
            "emoji": "🎨",
            "color": "purple"
        },
        4: {
            "stage": "Bon À Tirer (BAT)",
            "message": "✅ Le Bon À Tirer (BAT) a été validé. Vos fichiers sont prêts pour la production.",
            "emoji": "📄",
            "color": "green"
        },
        5: {
            "stage": "Prépresse numérique",
            "message": "⚙️ Vos fichiers sont en prépresse numérique, préparation finale avant impression.",
            "emoji": "⚙️",
            "color": "blue"
        },
        6: {
            "stage": "Prépresse offset",
            "message": "⚙️ Vos fichiers sont en prépresse offset, préparation des plaques d'impression.",
            "emoji": "🔧",
            "color": "blue"
        },
        7: {
            "stage": "Impression numérique",
            "message": "🖨️ Votre commande est en cours d'impression numérique.",
            "emoji": "🖨️",
            "color": "orange"
        },
        8: {
            "stage": "Impression offset",
            "message": "🖨️ Votre commande est en cours d'impression offset.",
            "emoji": "🖨️",
            "color": "orange"
        },
        9: {
            "stage": "Reliure",
            "message": "📚 Votre livre est en cours de reliure.",
            "emoji": "📚",
            "color": "orange"
        },
        10: {
            "stage": "Façonnage/Finition",
            "message": "✨ Votre commande est en phase de façonnage et finition. Dernières étapes avant expédition !",
            "emoji": "✨",
            "color": "green"
        }
    }
    
    def __init__(self):
        self.db = db_service
    
    def validate_customer_name(self, order_number: str, customer_input: str) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Valide le nom/prénom du client pour une commande.
        
        Returns:
            tuple (is_valid, full_name, error_message)
        """
        if not self.db.connect():
            return False, None, "Erreur de connexion à la base de données."
        
        try:
            cursor = self.db.connection.cursor()
            query = """
            SELECT 
                addr.Name as CustomerName,
                addr.Company
            FROM dbo.[Order] o
            LEFT JOIN dbo.Address addr ON o.AddressShippingId = addr.AddressId
            WHERE o.OrderId = ?
            """
            
            cursor.execute(query, (order_number,))
            row = cursor.fetchone()
            
            if not row:
                return False, None, "Commande introuvable."
            
            # Le nom complet du client (ex: "Sébastien PAAS")
            customer_name = (row.CustomerName or '').strip()
            company = (row.Company or '').strip()
            full_name = customer_name if customer_name else company
            
            # Séparer le prénom et nom si possible
            name_parts = customer_name.split() if customer_name else []
            first_name = name_parts[0].upper() if len(name_parts) > 0 else ""
            last_name = " ".join(name_parts[1:]).upper() if len(name_parts) > 1 else ""
            
            # Fonction pour normaliser les chaînes (supprimer accents, casse, espaces)
            def normalize_string(s):
                if not s:
                    return ""
                # Supprimer les accents simples
                s = s.replace('É', 'E').replace('È', 'E').replace('Ê', 'E').replace('Ë', 'E')
                s = s.replace('À', 'A').replace('Á', 'A').replace('Â', 'A').replace('Ã', 'A').replace('Ä', 'A')
                s = s.replace('Ù', 'U').replace('Ú', 'U').replace('Û', 'U').replace('Ü', 'U')
                s = s.replace('Ì', 'I').replace('Í', 'I').replace('Î', 'I').replace('Ï', 'I')
                s = s.replace('Ò', 'O').replace('Ó', 'O').replace('Ô', 'O').replace('Õ', 'O').replace('Ö', 'O')
                s = s.replace('Ç', 'C')
                return s.strip().upper()
            
            # Normaliser toutes les entrées
            customer_input_normalized = normalize_string(customer_input)
            first_name_normalized = normalize_string(first_name)
            last_name_normalized = normalize_string(last_name)
            full_name_normalized = normalize_string(full_name)
            
            # Validation très flexible :
            is_valid = False
            
            if len(customer_input_normalized) >= 3:
                is_valid = (
                    # Correspondance exacte
                    customer_input_normalized == first_name_normalized or
                    customer_input_normalized == last_name_normalized or
                    # Nom complet dans les deux ordres
                    customer_input_normalized == f"{first_name_normalized} {last_name_normalized}" or
                    customer_input_normalized == f"{last_name_normalized} {first_name_normalized}" or
                    # Correspondance partielle (l'entrée est contenue dans le prénom/nom)
                    customer_input_normalized in first_name_normalized or
                    customer_input_normalized in last_name_normalized or
                    # Le prénom/nom est contenu dans l'entrée
                    first_name_normalized in customer_input_normalized or
                    last_name_normalized in customer_input_normalized
                )
            
            if is_valid:
                return True, full_name, None
            else:
                # Message d'erreur avec exemples clairs
                examples = []
                if first_name:
                    examples.append(f"• `{first_name.title()}`")
                if last_name:
                    examples.append(f"• `{last_name.title()}`")
                if first_name and last_name:
                    examples.append(f"• `{first_name.title()} {last_name.title()}`")
                    examples.append(f"• `{last_name.title()} {first_name.title()}`")
                
                error_msg = (
                    f"❌ **Le nom saisi ne correspond pas à cette commande.**\n\n"
                    f"🔒 **Sécurité** : Pour protéger vos données, nous devons vérifier votre identité.\n\n"
                    f"✨ **Bonne nouvelle** : Le système n'est pas sensible aux majuscules/minuscules !\n\n"
                    f"📝 **Vous pouvez entrer** :\n"
                    + "\n".join(examples) + "\n\n"
                    f"💡 **Astuce** : Même une partie de votre nom suffit (minimum 3 caractères).\n\n"
                    f"🔄 **Veuillez réessayer avec l'un des formats ci-dessus.**"
                )
                return False, None, error_msg
            
            cursor.close()
                
        except Exception as e:
            print(f"Erreur validation client: {e}")
            return False, None, "Erreur lors de la validation. Veuillez réessayer."
        finally:
            self.db.disconnect()
    
    def get_order_tracking_info(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupère toutes les informations de suivi d'une commande"""
        # Utiliser la méthode existante du database service
        order_data = self.db.get_order_by_number(order_number)
        return order_data
    
    def generate_tracking_response(self, order_data: Dict[str, Any]) -> str:
        """Génère une réponse intelligente et contextuelle sur le suivi de commande"""
        
        status_id = order_data['status_id']
        status_info = self.STATUS_MESSAGES.get(status_id, {
            "stage": "Statut inconnu",
            "message": "Nous traitons votre commande.",
            "emoji": "📦",
            "color": "gray"
        })
        
        today = datetime.now()
        
        # Construction de la réponse
        response_parts = []
        
        # En-tête avec gestion sécurisée des valeurs
        customer_name = order_data.get('customer', {}).get('name', 'Client')
        response_parts.append(f"# 📦 Suivi de votre commande #{order_data['order_id']}")
        response_parts.append("")
        response_parts.append(f"**Client** : {customer_name}")
        response_parts.append(f"**Date de commande** : {self._format_date(order_data.get('order_date'))}")
        response_parts.append(f"**Montant total** : {order_data.get('total', 0):.2f}€ TTC")
        response_parts.append("")
        
        # Statut actuel
        response_parts.append("## 🎯 Statut actuel")
        response_parts.append("")
        response_parts.append(f"{status_info['emoji']} **{status_info['stage']}**")
        response_parts.append(f"{status_info['message']}")
        response_parts.append("")
        
        # Détails des produits
        response_parts.append("## 📚 Détails de votre commande")
        response_parts.append("")
        
        items = order_data.get('items', [])
        for item in items:
            product_name = item.get('product_name', 'Produit')
            response_parts.append(f"### {product_name}")
            response_parts.append(f"• **Quantité** : {item.get('quantity', 1)}")
            if item.get('num_pages'):
                response_parts.append(f"• **Nombre de pages** : {item['num_pages']}")
            if item.get('chrono_number'):
                response_parts.append(f"• **Numéro Chrono** : {item['chrono_number']}")
            
            # Dates de production et expédition
            production_date = self._parse_date(item.get('production_date'))
            estimated_shipping = self._parse_date(item.get('estimated_shipping'))
            confirmed_shipping = self._parse_date(item.get('confirmed_shipping'))
            
            response_parts.append("")
            response_parts.append("**📅 Planning :**")
            
            if production_date:
                if production_date <= today:
                    response_parts.append(f"• ✅ Production : Terminée le {self._format_date(item.get('production_date'))}")
                else:
                    days_until = (production_date - today).days
                    response_parts.append(f"• ⏳ Production prévue : {self._format_date(item.get('production_date'))} (dans {days_until} jour{'s' if days_until > 1 else ''})")
            
            # Gestion de l'expédition
            if confirmed_shipping:
                response_parts.append(f"• ✅ **Expédié le** : {self._format_date(item.get('confirmed_shipping'))}")
                delivery_date = confirmed_shipping + timedelta(days=2)
                if delivery_date <= today:
                    response_parts.append(f"• 📬 **Livraison** : Devrait être arrivée")
                else:
                    days_until = (delivery_date - today).days
                    response_parts.append(f"• 📬 **Livraison estimée** : {self._format_date(delivery_date)} (dans {days_until} jour{'s' if days_until > 1 else ''})")
                
                if item.get('tracking_url'):
                    response_parts.append(f"• 🔍 [Suivre votre colis]({item['tracking_url']})")
                    
            elif estimated_shipping:
                if estimated_shipping < today:
                    # Retard détecté
                    delay_days = (today - estimated_shipping).days
                    response_parts.append(f"• ⚠️ **Expédition prévue** : {self._format_date(item.get('estimated_shipping'))}")
                    response_parts.append(f"• 🕐 **Retard estimé** : {delay_days} jour{'s' if delay_days > 1 else ''}")
                    response_parts.append(f"• 💡 Votre commande sera expédiée très prochainement. Nous nous excusons pour ce léger retard.")
                else:
                    days_until = (estimated_shipping - today).days
                    response_parts.append(f"• 📦 **Expédition prévue** : {self._format_date(item.get('estimated_shipping'))} (dans {days_until} jour{'s' if days_until > 1 else ''})")
                    
                    # Estimation de livraison
                    delivery_date = estimated_shipping + timedelta(days=2)
                    delivery_days = (delivery_date - today).days
                    response_parts.append(f"• 📬 **Livraison estimée** : {self._format_date(delivery_date)} (dans {delivery_days} jour{'s' if delivery_days > 1 else ''})")
            
            response_parts.append("")
        
        # Adresse de livraison
        response_parts.append("## 🏠 Adresse de livraison")
        response_parts.append("")
        customer = order_data.get('customer', {})
        if customer.get('address'):
            response_parts.append(f"{customer['address']}")
        if customer.get('address2'):
            response_parts.append(f"{customer['address2']}")
        if customer.get('zip_code') and customer.get('city'):
            response_parts.append(f"{customer['zip_code']} {customer['city']}")
        if customer.get('phone'):
            response_parts.append(f"📞 {customer['phone']}")
        response_parts.append("")
        
        # Message de clôture
        response_parts.append("---")
        response_parts.append("")
        response_parts.append("💡 **Besoin d'aide ?** N'hésitez pas à nous contacter si vous avez des questions sur votre commande.")
        
        return "\n".join(response_parts)
    
    def _parse_date(self, date_value) -> Optional[datetime]:
        """Parse une date depuis différents formats"""
        if not date_value:
            return None
        
        if isinstance(date_value, datetime):
            return date_value
        
        try:
            if isinstance(date_value, str):
                return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        except:
            pass
        
        return None
    
    def _format_date(self, date_value) -> str:
        """Formate une date en français"""
        date_obj = self._parse_date(date_value)
        if not date_obj:
            return "Date inconnue"
        
        return date_obj.strftime("%d/%m/%Y")
