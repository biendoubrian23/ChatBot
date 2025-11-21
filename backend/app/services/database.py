"""SQL Server database service for CoolLibri orders."""
import pyodbc
from typing import Optional, Dict, Any, List
from app.core.config import Settings

settings = Settings()


class DatabaseService:
    """Service pour interagir avec la base de données SQL Server CoolLibri."""
    
    def __init__(self):
        """Initialize database connection."""
        self.connection_string = (
            f"DRIVER={{{settings.sql_server_driver}}};"
            f"SERVER={settings.sql_server_host},{settings.sql_server_port};"
            f"DATABASE={settings.sql_server_database};"
            f"UID={settings.sql_server_username};"
            f"PWD={settings.sql_server_password};"
            "TrustServerCertificate=yes;"
        )
        self.connection = None
    
    def connect(self) -> bool:
        """Établir la connexion à la base de données."""
        try:
            self.connection = pyodbc.connect(self.connection_string, timeout=10)
            print("✅ Connexion SQL Server établie avec succès")
            return True
        except pyodbc.Error as e:
            print(f"❌ Erreur de connexion SQL Server: {e}")
            return False
    
    def disconnect(self):
        """Fermer la connexion à la base de données."""
        if self.connection:
            self.connection.close()
            print("🔌 Connexion SQL Server fermée")
    
    def test_connection(self) -> Dict[str, Any]:
        """Tester la connexion et retourner des infos sur le serveur."""
        if not self.connect():
            return {"success": False, "error": "Impossible de se connecter"}
        
        try:
            cursor = self.connection.cursor()
            
            # Test query
            cursor.execute("SELECT @@VERSION as ServerVersion, DB_NAME() as DatabaseName")
            row = cursor.fetchone()
            
            result = {
                "success": True,
                "server_version": row.ServerVersion if row else "Unknown",
                "database": row.DatabaseName if row else "Unknown"
            }
            
            cursor.close()
            return result
            
        except pyodbc.Error as e:
            return {"success": False, "error": str(e)}
        finally:
            self.disconnect()
    
    def get_order_tracking_details(self, order_number: str) -> Optional[Dict[str, Any]]:
        """
        Récupérer TOUS les détails de tracking d'une commande avec jointures complètes.
        
        Args:
            order_number: Numéro de commande (OrderId)
        
        Returns:
            Dictionnaire avec les détails complets de tracking ou None
        """
        if not self.connect():
            return None
        
        try:
            cursor = self.connection.cursor()
            
            # Requête complète avec TOUTES les jointures nécessaires
            query = """
                SELECT 
                    -- Infos commande
                    o.OrderId,
                    o.OrderDate,
                    o.PaymentDate,
                    o.PriceTTC as OrderTotal,
                    o.ShippingAmount,
                    o.OrderStatusId,
                    o.Paid,
                    -- Infos statut
                    os.Name as StatusName,
                    os.Stage as StatusStage,
                    -- Infos ligne de commande
                    ol.OrderLineId,
                    ol.Quantity,
                    ol.PriceHT,
                    ol.PriceTTC as LineTTC,
                    ol.ChronoNumber,
                    ol.DateProduction,
                    ol.DateShippingEstimatedFinal,
                    ol.DateShippingConfirmed,
                    ol.NumberPagesTotal,
                    ol.TrackingUrl,
                    ol.ReadyToReproduce,
                    ol.GetFiles,
                    -- Infos produit
                    p.ProductId,
                    p.Name as ProductName,
                    -- Infos client
                    addr.Name as CustomerName,
                    addr.AddressLine1,
                    addr.AddressLine2,
                    addr.City,
                    addr.Zip,
                    addr.CountryId,
                    addr.Phone,
                    addr.Company,
                    -- Infos transporteur
                    sc.ShippingCompanyId,
                    sc.Name as ShippingCompanyName,
                    sc.Label as ShippingCompanyLabel,
                    sc.DelayMin,
                    sc.DelayMax,
                    sc.IsEnabled as ShippingEnabled,
                    sc.IsExpress as ShippingExpress
                FROM dbo.[Order] o
                INNER JOIN dbo.OrderLine ol ON o.OrderId = ol.OrderId
                LEFT JOIN dbo.Product p ON ol.ProductId = p.ProductId
                LEFT JOIN dbo.Address addr ON o.AddressShippingId = addr.AddressId
                LEFT JOIN dbo.OrderStatus os ON o.OrderStatusId = os.OrderStatusId
                LEFT JOIN dbo.ShippingCompany sc ON ol.ShippingCompanyId = sc.ShippingCompanyId
                WHERE o.OrderId = ?
            """
            
            cursor.execute(query, (order_number,))
            
            # Récupérer toutes les lignes
            rows = cursor.fetchall()
            
            if not rows:
                cursor.close()
                return None
            
            # Construire le résultat structuré COMPLET
            first_row = rows[0]
            order_data = {
                "order_id": first_row.OrderId,
                "order_date": str(first_row.OrderDate) if first_row.OrderDate else None,
                "payment_date": str(first_row.PaymentDate) if first_row.PaymentDate else None,
                "total": float(first_row.OrderTotal) if first_row.OrderTotal else 0,
                "shipping": float(first_row.ShippingAmount) if first_row.ShippingAmount else 0,
                "status_id": first_row.OrderStatusId,
                "status_name": first_row.StatusName,
                "status_stage": first_row.StatusStage,
                "paid": bool(first_row.Paid),
                "customer": {
                    "name": first_row.CustomerName,
                    "address": first_row.AddressLine1,
                    "address2": first_row.AddressLine2,
                    "city": first_row.City,
                    "zip_code": first_row.Zip,
                    "country_id": first_row.CountryId,
                    "phone": first_row.Phone,
                    "company": first_row.Company
                },
                "items": []
            }
            
            # Ajouter chaque ligne de commande avec infos complètes
            for row in rows:
                item = {
                    "line_id": row.OrderLineId,
                    "product_id": row.ProductId,
                    "product_name": row.ProductName,
                    "quantity": row.Quantity,
                    "price_ht": float(row.PriceHT) if row.PriceHT else 0,
                    "price_ttc": float(row.LineTTC) if row.LineTTC else 0,
                    "chrono_number": row.ChronoNumber,
                    "production_date": str(row.DateProduction) if row.DateProduction else None,
                    "estimated_shipping": str(row.DateShippingEstimatedFinal) if row.DateShippingEstimatedFinal else None,
                    "confirmed_shipping": str(row.DateShippingConfirmed) if row.DateShippingConfirmed else None,
                    "num_pages": row.NumberPagesTotal,
                    "tracking_url": row.TrackingUrl,
                    "ready_to_reproduce": bool(row.ReadyToReproduce) if row.ReadyToReproduce is not None else False,
                    "files_retrieved": row.GetFiles if row.GetFiles is not None else 0,
                    "shipping": {
                        "company_id": row.ShippingCompanyId,
                        "company_name": row.ShippingCompanyName,
                        "label": row.ShippingCompanyLabel,
                        "delay_min": row.DelayMin,
                        "delay_max": row.DelayMax,
                        "enabled": bool(row.ShippingEnabled) if row.ShippingEnabled is not None else False,
                        "express": bool(row.ShippingExpress) if row.ShippingExpress is not None else False
                    }
                }
                order_data["items"].append(item)
            
            cursor.close()
            return order_data
            
        except pyodbc.Error as e:
            print(f"❌ Erreur SQL: {e}")
            return None
        finally:
            self.disconnect()
    
    def get_order_by_number(self, order_number: str, last_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Méthode simplifiée pour compatibilité - utilise get_order_tracking_details en interne.
        """
        return self.get_order_tracking_details(order_number)
    
    def list_tables(self) -> List[str]:
        """Lister toutes les tables de la base de données."""
        if not self.connect():
            return []
        
        try:
            cursor = self.connection.cursor()
            
            query = """
                SELECT TABLE_SCHEMA + '.' + TABLE_NAME as FullTableName
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            """
            
            cursor.execute(query)
            tables = [row.FullTableName for row in cursor.fetchall()]
            
            cursor.close()
            return tables
            
        except pyodbc.Error as e:
            print(f"❌ Erreur SQL: {e}")
            return []
        finally:
            self.disconnect()
    
    def get_table_schema(self, table_name: str) -> List[Dict[str, str]]:
        """Obtenir le schéma d'une table (colonnes et types)."""
        if not self.connect():
            return []
        
        try:
            cursor = self.connection.cursor()
            
            query = """
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            """
            
            cursor.execute(query, (table_name,))
            
            columns = []
            for row in cursor.fetchall():
                columns.append({
                    "name": row.COLUMN_NAME,
                    "type": row.DATA_TYPE,
                    "nullable": row.IS_NULLABLE,
                    "max_length": row.CHARACTER_MAXIMUM_LENGTH
                })
            
            cursor.close()
            return columns
            
        except pyodbc.Error as e:
            print(f"❌ Erreur SQL: {e}")
            return []
        finally:
            self.disconnect()


# Singleton instance
db_service = DatabaseService()
