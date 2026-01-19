"""
Database Layer - Abstraction pour SQL Server
Remplace complètement Supabase
"""
import pyodbc
import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# =====================================================
# CONNECTION MANAGER
# =====================================================

class DatabaseConnection:
    """Gestionnaire de connexion SQL Server"""
    
    _instance = None
    _connection_string = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @property
    def connection_string(self) -> str:
        if self._connection_string is None:
            self._connection_string = (
                f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                f"SERVER={settings.MSSQL_HOST},{settings.MSSQL_PORT};"
                f"DATABASE={settings.MSSQL_DATABASE};"
                f"UID={settings.MSSQL_USER};"
                f"PWD={settings.MSSQL_PASSWORD};"
                f"TrustServerCertificate=yes"
            )
        return self._connection_string
    
    def get_connection(self) -> pyodbc.Connection:
        """Crée une nouvelle connexion"""
        return pyodbc.connect(self.connection_string)
    
    @contextmanager
    def cursor(self):
        """Context manager pour obtenir un curseur"""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()


# Instance globale
_db = DatabaseConnection()

def get_db() -> DatabaseConnection:
    """Retourne l'instance de base de données"""
    return _db


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def dict_from_row(cursor, row) -> dict:
    """Convertit une row pyodbc en dictionnaire"""
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def rows_to_list(cursor, rows) -> List[dict]:
    """Convertit plusieurs rows en liste de dictionnaires"""
    return [dict_from_row(cursor, row) for row in rows]


def parse_json(value: str) -> Any:
    """Parse une colonne JSON"""
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def to_json(value: Any) -> Optional[str]:
    """Convertit en JSON pour stockage"""
    if value is None:
        return None
    return json.dumps(value, default=str)


def new_uuid() -> str:
    """Génère un nouveau UUID"""
    return str(uuid.uuid4())


# =====================================================
# TABLE: WORKSPACES
# =====================================================

class WorkspacesDB:
    """Opérations sur la table workspaces"""
    
    @staticmethod
    def get_by_id(workspace_id: str) -> Optional[dict]:
        """Récupère un workspace par son ID"""
        with _db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM workspaces WHERE id = ?",
                (workspace_id,)
            )
            row = cursor.fetchone()
            if row:
                result = dict_from_row(cursor, row)
                result['rag_config'] = parse_json(result.get('rag_config'))
                result['widget_config'] = parse_json(result.get('widget_config'))
                return result
            return None
    
    @staticmethod
    def get_by_user(user_id: str) -> List[dict]:
        """Récupère tous les workspaces d'un utilisateur"""
        with _db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM workspaces WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cursor.fetchall()
            results = rows_to_list(cursor, rows)
            for r in results:
                r['rag_config'] = parse_json(r.get('rag_config'))
                r['widget_config'] = parse_json(r.get('widget_config'))
            return results
    
    @staticmethod
    def get_by_id_and_user(workspace_id: str, user_id: str) -> Optional[dict]:
        """Récupère un workspace par son ID et user_id"""
        with _db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM workspaces WHERE id = ? AND user_id = ?",
                (workspace_id, user_id)
            )
            row = cursor.fetchone()
            if row:
                result = dict_from_row(cursor, row)
                result['rag_config'] = parse_json(result.get('rag_config'))
                result['widget_config'] = parse_json(result.get('widget_config'))
                return result
            return None
    
    @staticmethod
    def create(user_id: str, name: str, description: str = None) -> dict:
        """Crée un nouveau workspace"""
        workspace_id = new_uuid()
        with _db.cursor() as cursor:
            cursor.execute("""
                INSERT INTO workspaces (id, user_id, name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, GETDATE(), GETDATE())
            """, (workspace_id, user_id, name, description))
            
            cursor.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
            row = cursor.fetchone()
            return dict_from_row(cursor, row)
    
    @staticmethod
    def update(workspace_id: str, **kwargs) -> Optional[dict]:
        """Met à jour un workspace"""
        allowed_fields = ['name', 'description', 'rag_config', 'widget_config', 'is_active']
        updates = []
        params = []
        
        for field in allowed_fields:
            if field in kwargs:
                value = kwargs[field]
                if field in ['rag_config', 'widget_config']:
                    value = to_json(value)
                updates.append(f"{field} = ?")
                params.append(value)
        
        if not updates:
            return WorkspacesDB.get_by_id(workspace_id)
        
        updates.append("updated_at = GETDATE()")
        params.append(workspace_id)
        
        with _db.cursor() as cursor:
            cursor.execute(f"""
                UPDATE workspaces SET {', '.join(updates)} WHERE id = ?
            """, params)
            
            cursor.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
            row = cursor.fetchone()
            if row:
                result = dict_from_row(cursor, row)
                result['rag_config'] = parse_json(result.get('rag_config'))
                result['widget_config'] = parse_json(result.get('widget_config'))
                return result
            return None
    
    @staticmethod
    def delete(workspace_id: str) -> bool:
        """Supprime un workspace"""
        with _db.cursor() as cursor:
            cursor.execute("DELETE FROM workspaces WHERE id = ?", (workspace_id,))
            return cursor.rowcount > 0


# =====================================================
# TABLE: DOCUMENTS
# =====================================================

class DocumentsDB:
    """Opérations sur la table documents"""
    
    @staticmethod
    def get_by_id(document_id: str) -> Optional[dict]:
        """Récupère un document par son ID"""
        with _db.cursor() as cursor:
            cursor.execute("SELECT * FROM documents WHERE id = ?", (document_id,))
            row = cursor.fetchone()
            return dict_from_row(cursor, row) if row else None
    
    @staticmethod
    def get_by_workspace(workspace_id: str) -> List[dict]:
        """Récupère tous les documents d'un workspace"""
        with _db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM documents WHERE workspace_id = ? ORDER BY created_at DESC",
                (workspace_id,)
            )
            return rows_to_list(cursor, cursor.fetchall())
    
    @staticmethod
    def create(workspace_id: str, filename: str, file_path: str, 
               file_size: int, file_type: str, status: str = "pending") -> dict:
        """Crée un nouveau document"""
        doc_id = new_uuid()
        with _db.cursor() as cursor:
            cursor.execute("""
                INSERT INTO documents (id, workspace_id, filename, file_path, file_size, file_type, status, chunk_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, GETDATE())
            """, (doc_id, workspace_id, filename, file_path, file_size, file_type, status))
            
            cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
            return dict_from_row(cursor, cursor.fetchone())
    
    @staticmethod
    def update_status(document_id: str, status: str, chunk_count: int = None) -> bool:
        """Met à jour le statut d'un document"""
        with _db.cursor() as cursor:
            if chunk_count is not None:
                cursor.execute(
                    "UPDATE documents SET status = ?, chunk_count = ? WHERE id = ?",
                    (status, chunk_count, document_id)
                )
            else:
                cursor.execute(
                    "UPDATE documents SET status = ? WHERE id = ?",
                    (status, document_id)
                )
            return cursor.rowcount > 0
    
    @staticmethod
    def delete(document_id: str) -> bool:
        """Supprime un document"""
        with _db.cursor() as cursor:
            cursor.execute("DELETE FROM documents WHERE id = ?", (document_id,))
            return cursor.rowcount > 0
    
    @staticmethod
    def get_with_workspace_owner(document_id: str) -> Optional[dict]:
        """Récupère un document avec les infos du workspace owner"""
        with _db.cursor() as cursor:
            cursor.execute("""
                SELECT d.*, w.user_id as workspace_user_id
                FROM documents d
                INNER JOIN workspaces w ON d.workspace_id = w.id
                WHERE d.id = ?
            """, (document_id,))
            row = cursor.fetchone()
            return dict_from_row(cursor, row) if row else None


# =====================================================
# TABLE: CONVERSATIONS
# =====================================================

class ConversationsDB:
    """Opérations sur la table conversations"""
    
    @staticmethod
    def get_by_id(conversation_id: str) -> Optional[dict]:
        """Récupère une conversation par son ID"""
        with _db.cursor() as cursor:
            cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
            row = cursor.fetchone()
            return dict_from_row(cursor, row) if row else None
    
    @staticmethod
    def get_by_workspace(workspace_id: str) -> List[dict]:
        """Récupère toutes les conversations d'un workspace"""
        with _db.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM conversations WHERE workspace_id = ? ORDER BY created_at DESC",
                (workspace_id,)
            )
            return rows_to_list(cursor, cursor.fetchall())
    
    @staticmethod
    def create(workspace_id: str, title: str = None, session_id: str = None) -> dict:
        """Crée une nouvelle conversation"""
        conv_id = new_uuid()
        with _db.cursor() as cursor:
            cursor.execute("""
                INSERT INTO conversations (id, workspace_id, title, session_id, created_at)
                VALUES (?, ?, ?, ?, GETDATE())
            """, (conv_id, workspace_id, title, session_id))
            
            cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
            return dict_from_row(cursor, cursor.fetchone())
    
    @staticmethod
    def get_with_workspace_owner(conversation_id: str) -> Optional[dict]:
        """Récupère une conversation avec les infos du workspace owner"""
        with _db.cursor() as cursor:
            cursor.execute("""
                SELECT c.*, w.user_id as workspace_user_id
                FROM conversations c
                INNER JOIN workspaces w ON c.workspace_id = w.id
                WHERE c.id = ?
            """, (conversation_id,))
            row = cursor.fetchone()
            return dict_from_row(cursor, row) if row else None
    
    @staticmethod
    def delete(conversation_id: str) -> bool:
        """Supprime une conversation"""
        with _db.cursor() as cursor:
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
            return cursor.rowcount > 0


# =====================================================
# TABLE: MESSAGES
# =====================================================

class MessagesDB:
    """Opérations sur la table messages"""
    
    @staticmethod
    def get_by_conversation(conversation_id: str, limit: int = None) -> List[dict]:
        """Récupère les messages d'une conversation"""
        with _db.cursor() as cursor:
            if limit:
                cursor.execute(f"""
                    SELECT TOP {limit} * FROM messages 
                    WHERE conversation_id = ? 
                    ORDER BY created_at
                """, (conversation_id,))
            else:
                cursor.execute(
                    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at",
                    (conversation_id,)
                )
            results = rows_to_list(cursor, cursor.fetchall())
            for r in results:
                r['metadata'] = parse_json(r.get('metadata'))
            return results
    
    @staticmethod
    def create(conversation_id: str, role: str, content: str, 
               metadata: dict = None, rag_score: float = None) -> dict:
        """Crée un nouveau message"""
        msg_id = new_uuid()
        with _db.cursor() as cursor:
            cursor.execute("""
                INSERT INTO messages (id, conversation_id, role, content, metadata, rag_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, GETDATE())
            """, (msg_id, conversation_id, role, content, to_json(metadata), rag_score))
            
            cursor.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
            result = dict_from_row(cursor, cursor.fetchone())
            result['metadata'] = parse_json(result.get('metadata'))
            return result
    
    @staticmethod
    def update_feedback(message_id: str, feedback: int) -> bool:
        """Met à jour le feedback d'un message"""
        with _db.cursor() as cursor:
            cursor.execute(
                "UPDATE messages SET feedback = ? WHERE id = ?",
                (feedback, message_id)
            )
            return cursor.rowcount > 0
    
    @staticmethod
    def mark_resolved(message_id: str) -> bool:
        """Marque un message comme résolu"""
        with _db.cursor() as cursor:
            cursor.execute(
                "UPDATE messages SET is_resolved = 1 WHERE id = ?",
                (message_id,)
            )
            return cursor.rowcount > 0


# =====================================================
# TABLE: ANALYTICS_DAILY
# =====================================================

class AnalyticsDB:
    """Opérations sur la table analytics_daily"""
    
    @staticmethod
    def get_by_workspace(workspace_id: str, days: int = 30) -> List[dict]:
        """Récupère les analytics d'un workspace"""
        with _db.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM analytics_daily 
                WHERE workspace_id = ? 
                AND date >= DATEADD(day, ?, GETDATE())
                ORDER BY date DESC
            """, (workspace_id, -days))
            return rows_to_list(cursor, cursor.fetchall())
    
    @staticmethod
    def upsert(workspace_id: str, date: str, metrics: dict) -> dict:
        """Crée ou met à jour les analytics d'un jour"""
        with _db.cursor() as cursor:
            # Vérifier si existe
            cursor.execute(
                "SELECT id FROM analytics_daily WHERE workspace_id = ? AND date = ?",
                (workspace_id, date)
            )
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("""
                    UPDATE analytics_daily 
                    SET conversations_count = ?, messages_count = ?, 
                        avg_response_time = ?, satisfaction_rate = ?
                    WHERE workspace_id = ? AND date = ?
                """, (
                    metrics.get('conversations_count', 0),
                    metrics.get('messages_count', 0),
                    metrics.get('avg_response_time'),
                    metrics.get('satisfaction_rate'),
                    workspace_id, date
                ))
            else:
                analytics_id = new_uuid()
                cursor.execute("""
                    INSERT INTO analytics_daily (id, workspace_id, date, conversations_count, 
                        messages_count, avg_response_time, satisfaction_rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    analytics_id, workspace_id, date,
                    metrics.get('conversations_count', 0),
                    metrics.get('messages_count', 0),
                    metrics.get('avg_response_time'),
                    metrics.get('satisfaction_rate')
                ))
            
            cursor.execute(
                "SELECT * FROM analytics_daily WHERE workspace_id = ? AND date = ?",
                (workspace_id, date)
            )
            return dict_from_row(cursor, cursor.fetchone())


# =====================================================
# TABLE: PROFILES
# =====================================================

class ProfilesDB:
    """Opérations sur la table profiles"""
    
    @staticmethod
    def get_by_user(user_id: str) -> Optional[dict]:
        """Récupère le profil d'un utilisateur"""
        with _db.cursor() as cursor:
            cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return dict_from_row(cursor, row) if row else None
    
    @staticmethod
    def create_or_update(user_id: str, full_name: str = None, avatar_url: str = None) -> dict:
        """Crée ou met à jour un profil"""
        with _db.cursor() as cursor:
            cursor.execute("SELECT id FROM profiles WHERE user_id = ?", (user_id,))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("""
                    UPDATE profiles SET full_name = ?, avatar_url = ?, updated_at = GETDATE()
                    WHERE user_id = ?
                """, (full_name, avatar_url, user_id))
            else:
                profile_id = new_uuid()
                cursor.execute("""
                    INSERT INTO profiles (id, user_id, full_name, avatar_url, created_at, updated_at)
                    VALUES (?, ?, ?, ?, GETDATE(), GETDATE())
                """, (profile_id, user_id, full_name, avatar_url))
            
            cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
            return dict_from_row(cursor, cursor.fetchone())


# =====================================================
# INSIGHTS HELPERS
# =====================================================

class InsightsDB:
    """Opérations pour les insights"""
    
    @staticmethod
    def calculate_metrics(workspace_id: str) -> dict:
        """Calcule les métriques d'un workspace"""
        with _db.cursor() as cursor:
            # Total conversations
            cursor.execute(
                "SELECT COUNT(*) FROM conversations WHERE workspace_id = ?",
                (workspace_id,)
            )
            total_conversations = cursor.fetchone()[0]
            
            # Total messages
            cursor.execute("""
                SELECT COUNT(*) FROM messages m
                INNER JOIN conversations c ON m.conversation_id = c.id
                WHERE c.workspace_id = ?
            """, (workspace_id,))
            total_messages = cursor.fetchone()[0]
            
            # Total documents
            cursor.execute(
                "SELECT COUNT(*) FROM documents WHERE workspace_id = ?",
                (workspace_id,)
            )
            total_documents = cursor.fetchone()[0]
            
            # Satisfaction rate
            cursor.execute("""
                SELECT 
                    COUNT(CASE WHEN feedback = 1 THEN 1 END) as positive,
                    COUNT(*) as total
                FROM messages m
                INNER JOIN conversations c ON m.conversation_id = c.id
                WHERE c.workspace_id = ? AND m.role = 'assistant' AND m.feedback IS NOT NULL
            """, (workspace_id,))
            feedback_row = cursor.fetchone()
            satisfaction_rate = None
            if feedback_row and feedback_row[1] > 0:
                satisfaction_rate = (feedback_row[0] / feedback_row[1]) * 100
            
            # Avg messages per conversation
            avg_messages = total_messages / total_conversations if total_conversations > 0 else 0
            
            return {
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "total_documents": total_documents,
                "satisfaction_rate": satisfaction_rate,
                "avg_messages_per_conversation": round(avg_messages, 1),
                "calculated_at": datetime.utcnow().isoformat()
            }
    
    @staticmethod
    def get_low_confidence_questions(workspace_id: str, threshold: float = 0.5, limit: int = 10) -> List[dict]:
        """Récupère les questions à faible confiance"""
        with _db.cursor() as cursor:
            cursor.execute(f"""
                SELECT TOP {limit} m.id, m.content, m.rag_score, m.created_at, m.is_resolved
                FROM messages m
                INNER JOIN conversations c ON m.conversation_id = c.id
                WHERE c.workspace_id = ? 
                AND m.role = 'user'
                AND (m.is_resolved IS NULL OR m.is_resolved = 0)
                AND m.rag_score < ?
                ORDER BY m.created_at DESC
            """, (workspace_id, threshold))
            return rows_to_list(cursor, cursor.fetchall())


# =====================================================
# EXPORT ALL
# =====================================================

__all__ = [
    'get_db',
    'DatabaseConnection',
    'WorkspacesDB',
    'DocumentsDB',
    'ConversationsDB',
    'MessagesDB',
    'AnalyticsDB',
    'ProfilesDB',
    'InsightsDB',
    'new_uuid',
    'parse_json',
    'to_json'
]
