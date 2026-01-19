"""
Connexion à Microsoft SQL Server pour Monitora
Remplace la connexion Supabase pour la base de données principale
"""
import pyodbc
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import json
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SQLServerConnection:
    """Gestionnaire de connexion SQL Server"""
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        database: str = None,
        user: str = None,
        password: str = None,
        driver: str = None
    ):
        self.host = host or settings.MSSQL_HOST
        self.port = port or settings.MSSQL_PORT
        self.database = database or settings.MSSQL_DATABASE
        self.user = user or settings.MSSQL_USER
        self.password = password or settings.MSSQL_PASSWORD
        self.driver = driver or settings.MSSQL_DRIVER
        self._connection = None
    
    @property
    def connection_string(self) -> str:
        """Génère la chaîne de connexion ODBC"""
        return (
            f"DRIVER={{{self.driver}}};"
            f"SERVER={self.host},{self.port};"
            f"DATABASE={self.database};"
            f"UID={self.user};"
            f"PWD={self.password};"
            f"TrustServerCertificate=yes;"
            f"Encrypt=yes;"
        )
    
    def connect(self) -> pyodbc.Connection:
        """Établit une connexion à la base de données"""
        if self._connection is None:
            try:
                self._connection = pyodbc.connect(self.connection_string)
                logger.info(f"Connecté à SQL Server: {self.database}@{self.host}")
            except pyodbc.Error as e:
                logger.error(f"Erreur de connexion SQL Server: {e}")
                raise
        return self._connection
    
    def disconnect(self):
        """Ferme la connexion"""
        if self._connection:
            self._connection.close()
            self._connection = None
            logger.info("Déconnecté de SQL Server")
    
    @contextmanager
    def get_cursor(self):
        """Context manager pour obtenir un curseur"""
        conn = self.connect()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise
        finally:
            cursor.close()
    
    def execute(self, query: str, params: tuple = None) -> int:
        """Exécute une requête sans retour de données"""
        with self.get_cursor() as cursor:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.rowcount
    
    def fetch_one(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """Exécute une requête et retourne une ligne"""
        with self.get_cursor() as cursor:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                return dict(zip(columns, row))
            return None
    
    def fetch_all(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Exécute une requête et retourne toutes les lignes"""
        with self.get_cursor() as cursor:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            rows = cursor.fetchall()
            if rows:
                columns = [column[0] for column in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
            return []
    
    def call_procedure(
        self, 
        proc_name: str, 
        params: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Appelle une stored procedure et retourne les résultats"""
        with self.get_cursor() as cursor:
            if params:
                # Construire l'appel avec paramètres nommés
                param_str = ", ".join([f"@{k}=?" for k in params.keys()])
                query = f"EXEC {proc_name} {param_str}"
                cursor.execute(query, tuple(params.values()))
            else:
                cursor.execute(f"EXEC {proc_name}")
            
            rows = cursor.fetchall()
            if rows and cursor.description:
                columns = [column[0] for column in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
            return []
    
    def test_connection(self) -> Dict[str, Any]:
        """Teste la connexion et retourne les infos du serveur"""
        try:
            result = self.fetch_one("SELECT @@VERSION as version, DB_NAME() as database_name")
            return {
                "success": True,
                "server_version": result.get("version", "").split("\n")[0] if result else None,
                "database": result.get("database_name") if result else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Instance globale pour Monitora_dev
_sqlserver_connection: Optional[SQLServerConnection] = None


def get_sqlserver() -> SQLServerConnection:
    """Retourne la connexion SQL Server globale"""
    global _sqlserver_connection
    if _sqlserver_connection is None:
        _sqlserver_connection = SQLServerConnection()
    return _sqlserver_connection


def get_new_connection(**kwargs) -> SQLServerConnection:
    """Crée une nouvelle connexion avec des paramètres personnalisés"""
    return SQLServerConnection(**kwargs)


# =====================================================
# HELPERS POUR LES OPÉRATIONS COURANTES
# =====================================================

class SQLServerTable:
    """Helper pour les opérations CRUD sur une table"""
    
    def __init__(self, table_name: str, connection: SQLServerConnection = None):
        self.table_name = table_name
        self.conn = connection or get_sqlserver()
    
    def select(
        self, 
        columns: str = "*",
        where: Dict[str, Any] = None,
        order_by: str = None,
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """SELECT avec conditions"""
        query = f"SELECT {columns} FROM {self.table_name}"
        params = []
        
        if where:
            conditions = []
            for key, value in where.items():
                conditions.append(f"{key} = ?")
                params.append(value)
            query += " WHERE " + " AND ".join(conditions)
        
        if order_by:
            query += f" ORDER BY {order_by}"
        
        if limit:
            query += f" OFFSET 0 ROWS FETCH NEXT {limit} ROWS ONLY"
        
        return self.conn.fetch_all(query, tuple(params) if params else None)
    
    def select_one(self, where: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """SELECT une seule ligne"""
        results = self.select(where=where, limit=1)
        return results[0] if results else None
    
    def insert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """INSERT et retourne la ligne insérée"""
        columns = list(data.keys())
        placeholders = ["?" for _ in columns]
        
        query = f"""
            INSERT INTO {self.table_name} ({', '.join(columns)})
            OUTPUT INSERTED.*
            VALUES ({', '.join(placeholders)})
        """
        
        result = self.conn.fetch_one(query, tuple(data.values()))
        return result
    
    def update(self, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """UPDATE avec conditions"""
        set_parts = [f"{key} = ?" for key in data.keys()]
        where_parts = [f"{key} = ?" for key in where.keys()]
        
        query = f"""
            UPDATE {self.table_name}
            SET {', '.join(set_parts)}
            WHERE {' AND '.join(where_parts)}
        """
        
        params = list(data.values()) + list(where.values())
        return self.conn.execute(query, tuple(params))
    
    def delete(self, where: Dict[str, Any]) -> int:
        """DELETE avec conditions"""
        where_parts = [f"{key} = ?" for key in where.keys()]
        
        query = f"""
            DELETE FROM {self.table_name}
            WHERE {' AND '.join(where_parts)}
        """
        
        return self.conn.execute(query, tuple(where.values()))
    
    def count(self, where: Dict[str, Any] = None) -> int:
        """COUNT avec conditions optionnelles"""
        query = f"SELECT COUNT(*) as count FROM {self.table_name}"
        params = []
        
        if where:
            conditions = [f"{key} = ?" for key in where.keys()]
            query += " WHERE " + " AND ".join(conditions)
            params = list(where.values())
        
        result = self.conn.fetch_one(query, tuple(params) if params else None)
        return result.get("count", 0) if result else 0


# =====================================================
# HELPERS POUR JSON
# =====================================================

def parse_json_column(value: str) -> Any:
    """Parse une colonne JSON (stockée en NVARCHAR)"""
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def serialize_json(data: Any) -> str:
    """Sérialise des données en JSON pour stockage"""
    if data is None:
        return None
    if isinstance(data, str):
        return data
    return json.dumps(data, ensure_ascii=False)


# =====================================================
# CONVERSION UUID
# =====================================================

def format_uuid(uuid_value) -> str:
    """Formate un UUID pour SQL Server"""
    if uuid_value is None:
        return None
    return str(uuid_value).upper()
