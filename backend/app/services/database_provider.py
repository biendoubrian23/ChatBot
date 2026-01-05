"""
Database Provider - Système de switch entre bases de données.
Fonctionne comme le LLM provider : on configure dans .env et ça switch automatiquement.

Usage:
    from app.services.database_provider import get_database_service, DatabaseProvider
    
    # Récupérer le service configuré (selon DB_PROVIDER dans .env)
    db = get_database_service()
    
    # Ou forcer un provider spécifique
    db = get_database_service(provider="chrono24")
"""
import pyodbc
from typing import Optional, Dict, Any, Literal
from enum import Enum
import os
import sys

# Ajouter le chemin backend au path pour les imports
backend_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import des configs
from DBCoollibri.config import DB_CONFIG as COOLLIBRI_CONFIG
from DBChrono24.config import DB_CONFIG as CHRONO24_CONFIG


class DatabaseProvider(str, Enum):
    """Providers de base de données disponibles."""
    COOLLIBRI = "coollibri"
    CHRONO24 = "chrono24"


# Configuration par défaut
DEFAULT_PROVIDER = DatabaseProvider.COOLLIBRI


class BaseDatabaseService:
    """Service de base pour les opérations database."""
    
    provider: str = "base"
    display_name: str = "Base"
    
    def __init__(self, config: dict):
        self.config = config
        self.connection_string = self._build_connection_string()
        self.connection = None
        
    def _build_connection_string(self) -> str:
        """Construit la chaîne de connexion."""
        return (
            f"DRIVER={{{self.config['driver']}}};"
            f"SERVER={self.config['host']},{self.config['port']};"
            f"DATABASE={self.config['database']};"
            f"UID={self.config['username']};"
            f"PWD={self.config['password']};"
            "TrustServerCertificate=yes;"
        )
    
    def connect(self) -> bool:
        """Établir la connexion à la base de données."""
        try:
            self.connection = pyodbc.connect(
                self.connection_string, 
                timeout=self.config.get('timeout', 10)
            )
            print(f"✅ Connexion {self.display_name} établie")
            return True
        except pyodbc.Error as e:
            print(f"❌ Erreur connexion {self.display_name}: {e}")
            return False
    
    def disconnect(self):
        """Fermer la connexion."""
        if self.connection:
            self.connection.close()
            self.connection = None
            print(f"🔌 Connexion {self.display_name} fermée")
    
    def test_connection(self) -> Dict[str, Any]:
        """Tester la connexion et retourner des infos."""
        if not self.connect():
            return {"success": False, "provider": self.provider, "error": "Connexion impossible"}
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT @@VERSION, DB_NAME()")
            row = cursor.fetchone()
            
            result = {
                "success": True,
                "provider": self.provider,
                "display_name": self.display_name,
                "database": row[1] if row else "Unknown",
                "server_version": row[0][:100] if row else "Unknown"  # Tronquer
            }
            cursor.close()
            return result
        except pyodbc.Error as e:
            return {"success": False, "provider": self.provider, "error": str(e)}
        finally:
            self.disconnect()
    
    def execute_query(self, query: str, params: tuple = None) -> Optional[list]:
        """Exécuter une requête SELECT et retourner les résultats."""
        if not self.connect():
            return None
        
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            columns = [column[0] for column in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            cursor.close()
            return results
        except pyodbc.Error as e:
            print(f"❌ Erreur SQL: {e}")
            return None
        finally:
            self.disconnect()
    
    def get_tables(self) -> Optional[list]:
        """Lister toutes les tables de la base."""
        query = """
            SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        """
        return self.execute_query(query)
    
    def get_table_columns(self, table_name: str, schema: str = "dbo") -> Optional[list]:
        """Récupérer les colonnes d'une table."""
        query = """
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                CHARACTER_MAXIMUM_LENGTH,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        """
        return self.execute_query(query, (schema, table_name))


class CoollibriDatabaseService(BaseDatabaseService):
    """Service database spécifique à Coollibri."""
    
    provider = "coollibri"
    display_name = "CoolLibri"
    
    def __init__(self):
        super().__init__(COOLLIBRI_CONFIG)
    
    def get_order_tracking(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupérer le tracking d'une commande Coollibri."""
        query = """
            SELECT 
                o.OrderId, o.OrderDate, o.PaymentDate, o.PriceTTC,
                os.Name as StatusName, os.Stage
            FROM [Order] o
            LEFT JOIN OrderStatus os ON o.OrderStatusId = os.OrderStatusId
            WHERE o.OrderId = ?
        """
        results = self.execute_query(query, (order_number,))
        return results[0] if results else None


class Chrono24DatabaseService(BaseDatabaseService):
    """Service database spécifique à Chrono24."""
    
    provider = "chrono24"
    display_name = "Chrono24"
    
    def __init__(self):
        super().__init__(CHRONO24_CONFIG)
    
    def get_order_tracking(self, order_number: str) -> Optional[Dict[str, Any]]:
        """Récupérer le tracking d'une commande Chrono24."""
        # TODO: Adapter la requête selon le schéma Chrono24
        # Pour l'instant, requête basique sur Order
        query = """
            SELECT TOP 1 *
            FROM [Order]
            WHERE OrderId = ? OR CardId = ?
        """
        results = self.execute_query(query, (order_number, order_number))
        return results[0] if results else None
    
    def get_card_details(self, card_id: str) -> Optional[Dict[str, Any]]:
        """Récupérer les détails d'une carte Chrono24."""
        query = """
            SELECT TOP 1 *
            FROM Card
            WHERE CardId = ?
        """
        results = self.execute_query(query, (card_id,))
        return results[0] if results else None


# ============================================
# FACTORY - Créer le bon service selon le provider
# ============================================

_db_service_instance: Optional[BaseDatabaseService] = None


def get_database_service(
    provider: Optional[str] = None,
    force_new: bool = False
) -> BaseDatabaseService:
    """
    Factory pour obtenir le service database configuré.
    
    Args:
        provider: Forcer un provider ("coollibri" ou "chrono24"). 
                  Si None, utilise DB_PROVIDER de l'env.
        force_new: Forcer la création d'une nouvelle instance.
    
    Returns:
        Instance du service database approprié.
    """
    global _db_service_instance
    
    # Si on veut une nouvelle instance ou on force un provider différent
    if force_new or _db_service_instance is None or provider is not None:
        # Déterminer le provider
        if provider is None:
            import os
            provider = os.getenv("DB_PROVIDER", DEFAULT_PROVIDER.value).lower()
        
        # Créer le bon service
        if provider == DatabaseProvider.CHRONO24.value:
            _db_service_instance = Chrono24DatabaseService()
            print(f"🔌 Database Provider: CHRONO24")
        else:
            _db_service_instance = CoollibriDatabaseService()
            print(f"🔌 Database Provider: COOLLIBRI")
    
    return _db_service_instance


def test_all_connections():
    """Tester toutes les connexions disponibles."""
    print("\n" + "="*50)
    print("🧪 TEST DE TOUTES LES CONNEXIONS DATABASE")
    print("="*50)
    
    results = {}
    
    # Test Coollibri
    print("\n📚 Test Coollibri...")
    coollibri = CoollibriDatabaseService()
    results["coollibri"] = coollibri.test_connection()
    
    # Test Chrono24
    print("\n⏱️ Test Chrono24...")
    chrono24 = Chrono24DatabaseService()
    results["chrono24"] = chrono24.test_connection()
    
    print("\n" + "="*50)
    print("📊 RÉSULTATS:")
    for name, result in results.items():
        status = "✅" if result["success"] else "❌"
        print(f"  {status} {name}: {result.get('database', result.get('error', 'Unknown'))}")
    print("="*50)
    
    return results


# Test direct si exécuté comme script
if __name__ == "__main__":
    test_all_connections()
