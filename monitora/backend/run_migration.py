"""Script d'exécution de la migration SQL Server"""
import pyodbc

config = {
    "server": "alpha.messages.fr",
    "port": "1433",
    "database": "Monitora_dev",
    "user": "chatbot",
    "password": "M3ss4ges"
}

connection_string = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={config['server']},{config['port']};"
    f"DATABASE={config['database']};"
    f"UID={config['user']};"
    f"PWD={config['password']};"
    f"TrustServerCertificate=yes"
)

# Script SQL à exécuter
sql_statements = [
    # 1. Table workspace_databases
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'workspace_databases')
    CREATE TABLE workspace_databases (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        type NVARCHAR(50) NOT NULL CHECK (type IN ('postgresql', 'mysql', 'sqlserver', 'sqlite')),
        connection_string NVARCHAR(MAX) NOT NULL,
        schema_cache NVARCHAR(MAX) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
    """,
    
    # 2. Table document_chunks
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'document_chunks')
    CREATE TABLE document_chunks (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        document_id UNIQUEIDENTIFIER NOT NULL,
        chunk_index INT NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        metadata NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
    """,
    
    # 3. Table insights_cache
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'insights_cache')
    CREATE TABLE insights_cache (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        cache_key NVARCHAR(255) NOT NULL,
        cache_value NVARCHAR(MAX) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT UQ_insights_cache_key UNIQUE (workspace_id, cache_key)
    )
    """,
    
    # 4. Table message_topics
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'message_topics')
    CREATE TABLE message_topics (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        message_id UNIQUEIDENTIFIER NOT NULL,
        topic NVARCHAR(255) NOT NULL,
        confidence FLOAT DEFAULT 0.0,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
    """,
    
    # 5. Table response_cache
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'response_cache')
    CREATE TABLE response_cache (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        query_hash NVARCHAR(64) NOT NULL,
        response NVARCHAR(MAX) NOT NULL,
        hit_count INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )
    """,
    
    # 6. Table app_users (pour l'authentification)
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_users')
    CREATE TABLE app_users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255) NULL,
        role NVARCHAR(50) DEFAULT 'lecteur' CHECK (role IN ('admin', 'lecteur')),
        is_active BIT DEFAULT 1,
        email_verified BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        last_login DATETIME2 NULL
    )
    """,
    
    # 7. Table app_sessions
    """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_sessions')
    CREATE TABLE app_sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        refresh_token NVARCHAR(500) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        ip_address NVARCHAR(50) NULL,
        user_agent NVARCHAR(500) NULL,
        FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
    )
    """,
    
    # 8. Ajouter colonne user_id à profiles si elle n'existe pas
    """
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('profiles') AND name = 'user_id')
    ALTER TABLE profiles ADD user_id UNIQUEIDENTIFIER NULL
    """,
    
    # 9. Index sur documents
    """
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_documents_workspace')
    CREATE INDEX IX_documents_workspace ON documents(workspace_id)
    """,
    
    # 10. Index sur messages
    """
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_messages_conversation')
    CREATE INDEX IX_messages_conversation ON messages(conversation_id)
    """,
    
    # 11. Index sur conversations
    """
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_conversations_workspace')
    CREATE INDEX IX_conversations_workspace ON conversations(workspace_id)
    """,
    
    # 12. Index sur analytics_daily
    """
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_analytics_daily_workspace_date')
    CREATE INDEX IX_analytics_daily_workspace_date ON analytics_daily(workspace_id, date)
    """,
]

# Procédures stockées
stored_procedures = [
    # sp_create_user
    """
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_create_user')
        DROP PROCEDURE sp_create_user
    """,
    """
    CREATE PROCEDURE sp_create_user
        @email NVARCHAR(255),
        @password_hash NVARCHAR(255),
        @full_name NVARCHAR(255) = NULL,
        @role NVARCHAR(50) = 'lecteur'
    AS
    BEGIN
        SET NOCOUNT ON;
        
        IF EXISTS (SELECT 1 FROM app_users WHERE email = @email)
        BEGIN
            RAISERROR('Email already exists', 16, 1);
            RETURN;
        END
        
        DECLARE @user_id UNIQUEIDENTIFIER = NEWID();
        
        INSERT INTO app_users (id, email, password_hash, full_name, role)
        VALUES (@user_id, @email, @password_hash, @full_name, @role);
        
        SELECT id, email, full_name, role, is_active, created_at
        FROM app_users
        WHERE id = @user_id;
    END
    """,
    
    # sp_get_user_for_auth
    """
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_user_for_auth')
        DROP PROCEDURE sp_get_user_for_auth
    """,
    """
    CREATE PROCEDURE sp_get_user_for_auth
        @email NVARCHAR(255)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        SELECT id, email, password_hash, full_name, role, is_active
        FROM app_users
        WHERE email = @email AND is_active = 1;
    END
    """,
    
    # sp_create_session
    """
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_create_session')
        DROP PROCEDURE sp_create_session
    """,
    """
    CREATE PROCEDURE sp_create_session
        @user_id UNIQUEIDENTIFIER,
        @refresh_token NVARCHAR(500),
        @expires_at DATETIME2,
        @ip_address NVARCHAR(50) = NULL,
        @user_agent NVARCHAR(500) = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @session_id UNIQUEIDENTIFIER = NEWID();
        
        INSERT INTO app_sessions (id, user_id, refresh_token, expires_at, ip_address, user_agent)
        VALUES (@session_id, @user_id, @refresh_token, @expires_at, @ip_address, @user_agent);
        
        UPDATE app_users SET last_login = GETDATE() WHERE id = @user_id;
        
        SELECT @session_id AS session_id;
    END
    """,
    
    # sp_validate_session
    """
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_validate_session')
        DROP PROCEDURE sp_validate_session
    """,
    """
    CREATE PROCEDURE sp_validate_session
        @refresh_token NVARCHAR(500)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        SELECT s.id, s.user_id, s.expires_at, u.email, u.full_name, u.role
        FROM app_sessions s
        INNER JOIN app_users u ON s.user_id = u.id
        WHERE s.refresh_token = @refresh_token 
          AND s.expires_at > GETDATE()
          AND u.is_active = 1;
    END
    """,
    
    # sp_delete_session
    """
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_delete_session')
        DROP PROCEDURE sp_delete_session
    """,
    """
    CREATE PROCEDURE sp_delete_session
        @refresh_token NVARCHAR(500)
    AS
    BEGIN
        SET NOCOUNT ON;
        DELETE FROM app_sessions WHERE refresh_token = @refresh_token;
    END
    """,
    
    # sp_calculate_workspace_insights
    """
    IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_calculate_workspace_insights')
        DROP PROCEDURE sp_calculate_workspace_insights
    """,
    """
    CREATE PROCEDURE sp_calculate_workspace_insights
        @workspace_id UNIQUEIDENTIFIER
    AS
    BEGIN
        SET NOCOUNT ON;
        
        SELECT 
            (SELECT COUNT(*) FROM conversations WHERE workspace_id = @workspace_id) as total_conversations,
            (SELECT COUNT(*) FROM messages m 
             INNER JOIN conversations c ON m.conversation_id = c.id 
             WHERE c.workspace_id = @workspace_id) as total_messages,
            (SELECT COUNT(*) FROM documents WHERE workspace_id = @workspace_id) as total_documents,
            (SELECT AVG(CAST(satisfaction_score AS FLOAT)) FROM conversations 
             WHERE workspace_id = @workspace_id AND satisfaction_score IS NOT NULL) as avg_satisfaction
    END
    """,
]

print("🚀 Exécution de la migration SQL Server...")

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    # Exécuter les créations de tables
    print("\n📋 Création des tables manquantes...")
    for i, sql in enumerate(sql_statements, 1):
        try:
            cursor.execute(sql)
            conn.commit()
            print(f"  ✅ Statement {i}/{len(sql_statements)} exécuté")
        except pyodbc.Error as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print(f"  ⚠️ Statement {i} - Objet existe déjà (ignoré)")
            else:
                print(f"  ❌ Statement {i} - Erreur: {e}")
    
    # Exécuter les procédures stockées
    print("\n📦 Création des procédures stockées...")
    for i, sql in enumerate(stored_procedures, 1):
        try:
            cursor.execute(sql)
            conn.commit()
            print(f"  ✅ Procédure {i}/{len(stored_procedures)} exécutée")
        except pyodbc.Error as e:
            print(f"  ❌ Procédure {i} - Erreur: {e}")
    
    # Vérifier les tables finales
    print("\n📋 Tables finales dans Monitora_dev:")
    cursor.execute("""
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    """)
    for table in cursor.fetchall():
        print(f"  - {table[0]}")
    
    # Vérifier les procédures stockées
    print("\n📦 Procédures stockées:")
    cursor.execute("SELECT name FROM sys.procedures ORDER BY name")
    for proc in cursor.fetchall():
        print(f"  - {proc[0]}")
    
    conn.close()
    print("\n✅ Migration terminée avec succès!")
    
except pyodbc.Error as e:
    print(f"❌ Erreur: {e}")
