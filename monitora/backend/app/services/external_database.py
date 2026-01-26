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
                    o.ShippingAmount, o.OrderStatusId, o.Paid, o.UserId,
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
                "customer_id": str(first_row.UserId) if hasattr(first_row, "UserId") and first_row.UserId else None,
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
        
        # ⚠️ VALIDATION DU PAIEMENT - PRIORITÉ ABSOLUE
        if not payment_date:
            response = f"Bonjour {first_name} ! 👋\n\n"
            response += f"J'ai retrouvé votre commande n°**{order_id}** pour "
            response += f"un livre de {pages} pages.\n\n"
            response += "⏳ Je vois que le paiement est encore en attente de validation. "
            response += "Dès qu'il sera confirmé, votre commande passera en production !\n\n"
            response += "Si vous avez payé récemment (virement ou chèque), pas d'inquiétude — "
            response += "la validation peut prendre quelques jours.\n\n"
            response += "Je reste à votre disposition ! 😊"
            return response
        
        # ✅ PAIEMENT VALIDÉ - Récupérer infos d'expédition
        estimated_shipping = item.get("estimated_shipping")
        tracking_url = item.get("tracking_url")
        
        # Calculer si retard
        is_late = False
        delay_days = 0
        if estimated_shipping:
            try:
                if isinstance(estimated_shipping, datetime):
                    ship_date = estimated_shipping.date()
                elif isinstance(estimated_shipping, date):
                    ship_date = estimated_shipping
                else:
                    ship_date = datetime.strptime(str(estimated_shipping).split()[0], "%Y-%m-%d").date()
                
                today = date.today()
                delay_days = (today - ship_date).days
                is_late = delay_days > 0
                date_str = ship_date.strftime("%d/%m/%Y")
            except Exception:
                ship_date = None
                date_str = str(estimated_shipping)
        
        # Construire la réponse
        response = f"Bonjour {first_name} ! 👋\n\n"
        
        if is_late:
            # ⚠️ CAS RETARD - Ton rassurant
            response += f"J'ai retrouvé votre commande n°**{order_id}** !\n\n"
            response += f"Votre livre de {pages} pages était prévu pour le **{date_str}**. "
            response += "Je vois qu'il y a un petit décalage, mais pas d'inquiétude - "
            response += "votre commande est bien en cours et devrait arriver très prochainement ! 📬\n\n"
            response += "Pour avoir des nouvelles précises sur la livraison, notre équipe sera ravie de vous aider :\n"
            response += "📧 contact@coollibri.com\n"
            response += "📞 05 31 61 60 42\n\n"
            response += "On reste disponible si vous avez d'autres questions ! 😊"
        else:
            # ✅ CAS NORMAL - Tout va bien
            response += f"Bonne nouvelle, j'ai retrouvé votre commande n°**{order_id}** ! 🎉\n\n"
            
            # Description concise du produit + statut
            response += f"Tout est en ordre : votre livre de {pages} pages est actuellement en **{status_name.lower()}**"
            if status_message:
                # Ajouter une précision courte sur le statut
                if status_id == 6:  # Façonnage
                    response += " (découpe, pelliculage...)"
                elif status_id == 7:  # Livraison
                    response += " et en route vers vous"
            response += ".\n\n"
            
            # Date d'expédition
            if tracking_url:
                response += f"🚚 **Suivez votre colis** : {tracking_url}\n\n"
            elif estimated_shipping:
                response += f"📦 **Expédition prévue le {date_str}** — vous devriez le recevoir très bientôt !\n\n"
            
            response += "Besoin d'autre chose ? Je suis là ! 😊"
        
        return response
    
    def _format_shipping_date_smart(self, shipping_date, order_id: str) -> str:
        """
        Gestion intelligente des retards (conservée pour compatibilité).
        La logique principale est maintenant dans format_order_response.
        """
        try:
            if isinstance(shipping_date, datetime):
                ship_date = shipping_date.date()
            elif isinstance(shipping_date, date):
                ship_date = shipping_date
            else:
                ship_date = datetime.strptime(str(shipping_date).split()[0], "%Y-%m-%d").date()
            
            date_str = ship_date.strftime("%d/%m/%Y")
            return f"📦 Expédition prévue le {date_str}"
                
        except Exception as e:
            logger.error(f"Erreur formatage date: {e}")
            return f"📅 **Date d'expédition** : {shipping_date}"


# =====================================================
# CLASSES DE SERVICE POUR LES AUTRES SITES
# (Bientôt disponible - schéma de BDD spécifique à chaque site)
# =====================================================

class JimprimeEnFranceOrderService:
    """
    Service de suivi de commandes pour J'imprime en France.
    
    TODO: Implémenter quand le schéma de BDD sera défini.
    - Tables: à définir
    - Colonnes: à définir
    - Statuts: à définir
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.db = ExternalDatabaseService(db_config)
    
    def get_order_by_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupère une commande par son numéro."""
        # TODO: Implémenter avec le schéma de BDD de J'imprime en France
        logger.warning("JimprimeEnFranceOrderService: schéma de BDD non encore implémenté")
        return None
    
    def format_order_response(self, order: Dict[str, Any]) -> str:
        """Formate la réponse pour le chatbot."""
        # TODO: Implémenter le formatage spécifique
        return "Le suivi des commandes pour J'imprime en France sera bientôt disponible."


class MonPackagingOrderService:
    """
    Service de suivi de commandes pour Mon Packaging.
    
    TODO: Implémenter quand le schéma de BDD sera défini.
    - Tables: à définir
    - Colonnes: à définir
    - Statuts: à définir
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.db = ExternalDatabaseService(db_config)
    
    def get_order_by_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupère une commande par son numéro."""
        # TODO: Implémenter avec le schéma de BDD de Mon Packaging
        logger.warning("MonPackagingOrderService: schéma de BDD non encore implémenté")
        return None
    
    def format_order_response(self, order: Dict[str, Any]) -> str:
        """Formate la réponse pour le chatbot."""
        # TODO: Implémenter le formatage spécifique
        return "Le suivi des commandes pour Mon Packaging sera bientôt disponible."


class JeDecoreOrderService:
    """
    Service de suivi de commandes pour Je Décore.
    
    TODO: Implémenter quand le schéma de BDD sera défini.
    - Tables: à définir
    - Colonnes: à définir
    - Statuts: à définir
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.db = ExternalDatabaseService(db_config)
    
    def get_order_by_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupère une commande par son numéro."""
        # TODO: Implémenter avec le schéma de BDD de Je Décore
        logger.warning("JeDecoreOrderService: schéma de BDD non encore implémenté")
        return None
    
    def format_order_response(self, order: Dict[str, Any]) -> str:
        """Formate la réponse pour le chatbot."""
        # TODO: Implémenter le formatage spécifique
        return "Le suivi des commandes pour Je Décore sera bientôt disponible."


class UnJourUniqueOrderService:
    """
    Service de suivi de commandes pour Un Jour Unique.
    
    TODO: Implémenter quand le schéma de BDD sera défini.
    - Tables: à définir
    - Colonnes: à définir
    - Statuts: à définir
    """
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.db = ExternalDatabaseService(db_config)
    
    def get_order_by_number(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupère une commande par son numéro."""
        # TODO: Implémenter avec le schéma de BDD de Un Jour Unique
        logger.warning("UnJourUniqueOrderService: schéma de BDD non encore implémenté")
        return None
    
    def format_order_response(self, order: Dict[str, Any]) -> str:
        """Formate la réponse pour le chatbot."""
        # TODO: Implémenter le formatage spécifique
        return "Le suivi des commandes pour Un Jour Unique sera bientôt disponible."


def get_order_service(db_config: Dict[str, Any]):
    """
    Factory pour obtenir le bon service de commandes selon le schéma.
    Chaque site a sa propre classe de service adaptée à son schéma de BDD.
    """
    schema_type = db_config.get("schema_type", "coollibri")
    
    if schema_type == "coollibri":
        return CoolLibriOrderService(db_config)
    elif schema_type == "jimprimeenfrance":
        return JimprimeEnFranceOrderService(db_config)
    elif schema_type == "monpackaging":
        return MonPackagingOrderService(db_config)
    elif schema_type == "jedecore":
        return JeDecoreOrderService(db_config)
    elif schema_type == "unjourunique":
        return UnJourUniqueOrderService(db_config)
    else:
        # Schéma générique - utilise le format CoolLibri par défaut
        return CoolLibriOrderService(db_config)
