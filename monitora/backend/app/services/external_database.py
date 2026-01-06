"""
Service de connexion aux bases de données externes des clients.
Multi-tenant : chaque workspace peut avoir sa propre BDD.
Format de réponse identique au chatbot CoolLibri original.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, date

logger = logging.getLogger(__name__)

# Import pyodbc optionnel (pas disponible sur tous les environnements cloud)
try:
    import pyodbc
    PYODBC_AVAILABLE = True
except ImportError:
    PYODBC_AVAILABLE = False
    logger.warning("⚠️ pyodbc non disponible - fonctionnalités SQL Server désactivées")


# =====================================================
# MAPPING DES STATUTS (identique à CoolLibri original)
# =====================================================
STATUS_MESSAGES = {
    1: {"name": "Commande reçue", "message": "Votre commande a été reçue et va être prise en charge prochainement.", "emoji": "📥"},
    2: {"name": "En cours de traitement", "message": "Votre commande est en cours de traitement par nos équipes.", "emoji": "⚙️"},
    3: {"name": "Prépresse (PAO)", "message": "Votre livre est en cours de préparation technique (mise en page, vérification des fichiers).", "emoji": "🖥️"},
    4: {"name": "Bon à tirer", "message": "Un bon à tirer vous a été envoyé. Merci de le valider pour lancer l'impression.", "emoji": "✅"},
    5: {"name": "Prépresse numérique", "message": "Vos fichiers sont en cours de préparation pour l'impression numérique.", "emoji": "💻"},
    6: {"name": "Prépresse offset", "message": "Vos fichiers sont en cours de préparation pour l'impression offset.", "emoji": "🖨️"},
    7: {"name": "Impression numérique", "message": "Votre livre est actuellement en cours d'impression (numérique).", "emoji": "🖨️"},
    8: {"name": "Impression offset", "message": "Votre livre est actuellement en cours d'impression (offset).", "emoji": "🖨️"},
    9: {"name": "Reliure", "message": "Votre livre est en cours de reliure et assemblage.", "emoji": "📖"},
    10: {"name": "Façonnage/finition", "message": "Les finitions de votre livre sont en cours (découpe, pelliculage...).", "emoji": "✂️"},
    11: {"name": "Expédition", "message": "Votre livre est en cours d'expédition.", "emoji": "📦"},
    12: {"name": "Prêt à expédier", "message": "Votre livre est terminé et prêt pour expédition.", "emoji": "📦"},
    13: {"name": "Anomalie", "message": "Une anomalie a été détectée sur votre commande. Notre équipe vous contactera.", "emoji": "⚠️"},
    14: {"name": "Validation Transport", "message": "Votre colis est en cours de validation par le transporteur.", "emoji": "🚚"},
    15: {"name": "Annulée", "message": "Cette commande a été annulée.", "emoji": "❌"},
    16: {"name": "Terminée", "message": "Votre commande est terminée. Merci pour votre confiance !", "emoji": "✅"},
}


class ExternalDatabaseService:
    """
    Service pour se connecter aux bases de données externes des clients.
    Chaque workspace peut avoir sa propre configuration de BDD.
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        """
        Initialise le service avec la configuration de BDD.
        
        Args:
            db_config: {
                "db_type": "sqlserver",  # sqlserver, mysql, postgres
                "db_host": "server.example.com",
                "db_port": 1433,
                "db_name": "Database",
                "db_user": "user",
                "db_password": "password",
                "schema_type": "coollibri"  # Type de schéma (coollibri, generic)
            }
        """
        self.config = db_config
        self.connection = None
        self.db_type = db_config.get("db_type", "sqlserver")
        self.schema_type = db_config.get("schema_type", "coollibri")
    
    def _build_connection_string(self) -> str:
        """Construit la chaîne de connexion selon le type de BDD."""
        if self.db_type == "sqlserver":
            return (
                f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                f"SERVER={self.config['db_host']},{self.config.get('db_port', 1433)};"
                f"DATABASE={self.config['db_name']};"
                f"UID={self.config['db_user']};"
                f"PWD={self.config['db_password']};"
                "TrustServerCertificate=yes;"
                "Encrypt=yes;"
                "Connection Timeout=10;"
            )
        else:
            raise ValueError(f"Type de BDD non supporté: {self.db_type}")
    
    def connect(self) -> bool:
        """Établit la connexion à la base de données."""
        if not PYODBC_AVAILABLE:
            logger.error("pyodbc non disponible")
            return False
        
        try:
            conn_string = self._build_connection_string()
            self.connection = pyodbc.connect(conn_string, timeout=10)
            logger.info(f"✅ Connexion {self.db_type} établie")
            return True
        except pyodbc.Error as e:
            logger.error(f"❌ Erreur connexion: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Erreur inattendue: {e}")
            return False
    
    def disconnect(self):
        """Ferme la connexion."""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def test_connection(self) -> Dict[str, Any]:
        """Teste la connexion et retourne des infos."""
        if not PYODBC_AVAILABLE:
            return {"success": False, "error": "pyodbc non disponible"}
        
        if not self.connect():
            return {"success": False, "error": "Impossible de se connecter"}
        
        try:
            cursor = self.connection.cursor()
            # Utiliser des alias sans mots réservés SQL Server
            cursor.execute("SELECT @@VERSION as ServerVersion, DB_NAME() as CurrentDB")
            row = cursor.fetchone()
            
            result = {
                "success": True,
                "message": "Connexion réussie !",
                "server_version": row.ServerVersion[:50] + "..." if row and row.ServerVersion else "Unknown",
                "database": row.CurrentDB if row and row.CurrentDB else "Unknown"
            }
            cursor.close()
            return result
        except Exception as e:
            return {"success": False, "error": str(e), "message": f"Échec de connexion: {str(e)}"}
        finally:
            self.disconnect()


class CoolLibriOrderService:
    """
    Service spécifique pour les commandes CoolLibri.
    Format de réponse identique au chatbot CoolLibri original.
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db = ExternalDatabaseService(db_config)
    
    def get_order_details(self, order_number: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les détails complets d'une commande CoolLibri.
        Requête identique au chatbot original.
        """
        if not self.db.connect():
            return None
        
        try:
            cursor = self.db.connection.cursor()
            
            query = """
                SELECT 
                    o.OrderId, o.OrderDate, o.PaymentDate, o.PriceTTC,
                    o.ShippingAmount, o.OrderStatusId, o.Paid,
                    os.Name as StatusName, os.Stage as StatusStage,
                    ol.OrderLineId, ol.Quantity, ol.PriceHT, ol.PriceTTC as LineTTC,
                    ol.ChronoNumber, ol.DateProduction, ol.DateShippingEstimatedFinal,
                    ol.DateShippingConfirmed, ol.NumberPagesTotal, ol.TrackingUrl,
                    p.ProductId, p.Name as ProductName,
                    addr.Name as CustomerName, addr.AddressLine1, addr.City, addr.Zip,
                    addr.Phone, addr.Company,
                    sc.Name as ShippingCompanyName, sc.DelayMin, sc.DelayMax
                FROM dbo.[Order] o
                INNER JOIN dbo.OrderLine ol ON o.OrderId = ol.OrderId
                LEFT JOIN dbo.Product p ON ol.ProductId = p.ProductId
                LEFT JOIN dbo.Address addr ON o.AddressShippingId = addr.AddressId
                LEFT JOIN dbo.OrderStatus os ON o.OrderStatusId = os.OrderStatusId
                LEFT JOIN dbo.ShippingCompany sc ON ol.ShippingCompanyId = sc.ShippingCompanyId
                WHERE o.OrderId = ?
            """
            
            cursor.execute(query, (order_number,))
            rows = cursor.fetchall()
            
            if not rows:
                return None
            
            first_row = rows[0]
            order_data = {
                "order_id": first_row.OrderId,
                "order_date": first_row.OrderDate,
                "payment_date": first_row.PaymentDate,
                "total": float(first_row.PriceTTC) if first_row.PriceTTC else 0,
                "status_id": first_row.OrderStatusId,
                "status_name": first_row.StatusName,
                "paid": bool(first_row.Paid),
                "customer": {
                    "name": first_row.CustomerName,
                    "city": first_row.City,
                    "zip": first_row.Zip,
                    "phone": first_row.Phone,
                    "company": first_row.Company
                },
                "items": []
            }
            
            for row in rows:
                item = {
                    "product_name": row.ProductName,
                    "quantity": row.Quantity,
                    "pages": row.NumberPagesTotal,
                    "production_date": row.DateProduction,
                    "estimated_shipping": row.DateShippingEstimatedFinal,
                    "confirmed_shipping": row.DateShippingConfirmed,
                    "tracking_url": row.TrackingUrl,
                    "shipping_company": row.ShippingCompanyName,
                    "delay_min": row.DelayMin,
                    "delay_max": row.DelayMax
                }
                order_data["items"].append(item)
            
            cursor.close()
            return order_data
            
        except Exception as e:
            logger.error(f"Erreur requête commande: {e}")
            return None
        finally:
            self.db.disconnect()
    
    def format_order_response(self, order_data: Dict[str, Any]) -> str:
        """
        Formate une réponse EXACTEMENT comme le chatbot CoolLibri original.
        Inclut: validation paiement, gestion retards, personnalisation.
        """
        order_id = order_data["order_id"]
        customer_name = order_data["customer"]["name"]
        payment_date = order_data.get("payment_date")
        total = order_data.get("total", 0)
        status_id = order_data.get("status_id", 1)
        
        # Extraire le prénom
        first_name = customer_name.split()[0] if customer_name else "Client"
        
        # Obtenir les infos du statut
        status_info = STATUS_MESSAGES.get(status_id, STATUS_MESSAGES[1])
        status_name = status_info["name"]
        status_emoji = status_info["emoji"]
        status_message = status_info["message"]
        
        # Infos produit
        item = order_data["items"][0] if order_data.get("items") else {}
        product_name = item.get("product_name", "Livre")
        quantity = item.get("quantity", 1)
        pages = item.get("pages", "N/A")
        
        # ⚠️ VALIDATION DU PAIEMENT - PRIORITÉ ABSOLUE (comme l'original)
        if not payment_date:
            response = f"Bonjour {first_name} ! 👋\n\n"
            response += f"J'ai bien retrouvé votre commande n°**{order_id}** concernant :\n"
            response += f"📖 **{product_name}** ({pages} pages) - {quantity} exemplaire(s)\n\n"
            response += "⏳ **Paiement en attente de validation**\n\n"
            response += "Je constate que votre paiement est encore en attente de validation. "
            response += "Votre commande sera mise en production dès que le paiement sera confirmé.\n\n"
            response += "Dès que votre paiement sera validé, vous recevrez un email de confirmation "
            response += "et je pourrai vous donner plus de détails sur l'avancement de votre commande.\n\n"
            response += "Si vous avez effectué votre paiement récemment (par virement ou chèque), "
            response += "pas d'inquiétude, la validation peut prendre quelques jours.\n\n"
            response += "À très bientôt ! 😊"
            return response
        
        # ✅ PAIEMENT VALIDÉ - Réponse standard
        response = f"Bonjour {first_name} ! 👋\n\n"
        response += f"J'ai bien retrouvé votre commande n°**{order_id}**.\n\n"
        
        # Formatage de la date de paiement
        if isinstance(payment_date, datetime):
            payment_str = payment_date.strftime("%d/%m/%Y")
        else:
            payment_str = str(payment_date).split()[0] if payment_date else "N/A"
        
        response += f"✅ Votre paiement de **{total:.2f}€** a bien été validé le {payment_str}.\n\n"
        
        # Infos produit
        response += f"📖 **Produit** : {product_name}\n"
        response += f"📄 **Pages** : {pages}\n"
        response += f"📦 **Quantité** : {quantity} exemplaire(s)\n\n"
        
        # Statut avec message personnalisé
        response += f"{status_emoji} **Statut actuel : {status_name}**\n"
        response += f"{status_message}\n\n"
        
        # Gestion des dates d'expédition et retards (comme SmartDateHandler)
        estimated_shipping = item.get("estimated_shipping")
        tracking_url = item.get("tracking_url")
        
        if tracking_url:
            response += f"🚚 **Suivi de votre colis** : {tracking_url}\n\n"
        
        if estimated_shipping:
            shipping_info = self._format_shipping_date_smart(estimated_shipping, order_id)
            response += shipping_info + "\n\n"
        
        response += "Besoin d'autre chose ? N'hésitez pas à demander ! 😊"
        
        return response
    
    def _format_shipping_date_smart(self, shipping_date, order_id: str) -> str:
        """
        Gestion intelligente des retards (comme SmartDateHandler original).
        """
        try:
            if isinstance(shipping_date, datetime):
                ship_date = shipping_date.date()
            elif isinstance(shipping_date, date):
                ship_date = shipping_date
            else:
                ship_date = datetime.strptime(str(shipping_date).split()[0], "%Y-%m-%d").date()
            
            today = date.today()
            delay = (today - ship_date).days
            date_str = ship_date.strftime("%d/%m/%Y")
            
            # À l'heure ou en avance
            if delay <= 0:
                return f"📅 **Expédition prévue** : {date_str}"
            
            # Petit retard (1-3 jours)
            elif 1 <= delay <= 3:
                return (
                    f"📅 **Expédition prévue** : {date_str}\n"
                    f"⏳ Votre commande a un léger retard de {delay} jour(s). "
                    f"Un délai supplémentaire de 1 à 2 semaines est possible. "
                    f"Nous faisons notre maximum !"
                )
            
            # Gros retard (> 3 jours) → Redirection hotline
            else:
                return (
                    f"📅 **Expédition initialement prévue** : {date_str}\n"
                    f"⚠️ Votre commande semble avoir pris du retard ({delay} jours).\n"
                    f"Pour des informations précises, merci de contacter notre service client :\n"
                    f"📧 **Email** : contact@coollibri.com\n"
                    f"📞 **Téléphone** : 05 31 61 60 42"
                )
                
        except Exception as e:
            logger.error(f"Erreur formatage date: {e}")
            return f"📅 **Date d'expédition** : {shipping_date}"


def get_order_service(db_config: Dict[str, Any]):
    """
    Factory pour obtenir le bon service de commandes selon le schéma.
    """
    schema_type = db_config.get("schema_type", "coollibri")
    
    # Pour l'instant, tous les sites d'impression utilisent le même schéma CoolLibri
    if schema_type in ["coollibri", "jimprimeenfrance", "monpackaging", "jedecore", "unjourunique"]:
        return CoolLibriOrderService(db_config)
    elif schema_type == "chrono24":
        # TODO: Implémenter Chrono24OrderService
        return CoolLibriOrderService(db_config)
    else:
        return CoolLibriOrderService(db_config)
