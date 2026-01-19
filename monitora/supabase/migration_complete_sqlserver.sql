-- =====================================================
-- MONITORA - Migration Complète vers SQL Server
-- =====================================================
-- Ce script complète le schéma initial avec toutes les
-- tables, triggers, stored procedures et authentification
-- =====================================================
-- À exécuter dans Microsoft SQL Server Management Studio
-- Base de données: Monitora_dev
-- =====================================================

USE Monitora_dev;
GO

-- =====================================================
-- PARTIE 1: TABLES MANQUANTES
-- =====================================================

-- Vérifier et créer workspace_databases
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'workspace_databases')
BEGIN
    CREATE TABLE workspace_databases (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        db_type NVARCHAR(50) DEFAULT 'sqlserver',
        db_host NVARCHAR(255) NOT NULL,
        db_name NVARCHAR(255) NOT NULL,
        db_user NVARCHAR(255) NOT NULL,
        db_password_encrypted NVARCHAR(500) NOT NULL,
        db_port INT DEFAULT 1433,
        schema_type NVARCHAR(50) DEFAULT 'generic',
        is_enabled BIT DEFAULT 1,
        last_test_status NVARCHAR(50),
        last_test_at DATETIMEOFFSET,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_workspace_databases_workspace FOREIGN KEY (workspace_id) 
            REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT CHK_db_type CHECK (db_type IN ('sqlserver', 'mysql', 'postgres'))
    );
    PRINT 'Table workspace_databases créée';
END
ELSE
    PRINT 'Table workspace_databases existe déjà';
GO

-- Vérifier et créer document_chunks
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'document_chunks')
BEGIN
    CREATE TABLE document_chunks (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        document_id UNIQUEIDENTIFIER NOT NULL,
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        metadata NVARCHAR(MAX), -- JSON
        chunk_index INT NOT NULL,
        embedding_id NVARCHAR(255), -- Référence pour FAISS
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_chunks_document FOREIGN KEY (document_id) 
            REFERENCES documents(id) ON DELETE CASCADE
    );
    PRINT 'Table document_chunks créée';
END
ELSE
    PRINT 'Table document_chunks existe déjà';
GO

-- Vérifier et créer insights_cache
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'insights_cache')
BEGIN
    CREATE TABLE insights_cache (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
        satisfaction_rate FLOAT,
        avg_rag_score FLOAT,
        avg_messages_per_conversation FLOAT,
        low_confidence_count INT DEFAULT 0,
        total_conversations INT DEFAULT 0,
        total_messages INT DEFAULT 0,
        calculated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_insights_workspace FOREIGN KEY (workspace_id) 
            REFERENCES workspaces(id) ON DELETE CASCADE
    );
    PRINT 'Table insights_cache créée';
END
ELSE
    PRINT 'Table insights_cache existe déjà';
GO

-- Vérifier et créer message_topics
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'message_topics')
BEGIN
    CREATE TABLE message_topics (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        topic_name NVARCHAR(255) NOT NULL,
        message_count INT DEFAULT 1,
        sample_questions NVARCHAR(MAX), -- JSON array
        last_updated DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_topics_workspace FOREIGN KEY (workspace_id) 
            REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT UQ_workspace_topic UNIQUE (workspace_id, topic_name)
    );
    PRINT 'Table message_topics créée';
END
ELSE
    PRINT 'Table message_topics existe déjà';
GO

-- Vérifier et créer response_cache
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'response_cache')
BEGIN
    CREATE TABLE response_cache (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        question_hash NVARCHAR(64) NOT NULL,
        question NVARCHAR(MAX) NOT NULL,
        response NVARCHAR(MAX) NOT NULL,
        sources NVARCHAR(MAX), -- JSON
        similarity_score FLOAT,
        hit_count INT DEFAULT 1,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        expires_at DATETIMEOFFSET,
        
        CONSTRAINT FK_cache_workspace FOREIGN KEY (workspace_id) 
            REFERENCES workspaces(id) ON DELETE CASCADE
    );
    PRINT 'Table response_cache créée';
END
ELSE
    PRINT 'Table response_cache existe déjà';
GO

-- =====================================================
-- PARTIE 2: MODIFICATIONS SUR TABLES EXISTANTES
-- =====================================================

-- Ajouter allowed_domains sur workspaces
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('workspaces') AND name = 'allowed_domains')
BEGIN
    ALTER TABLE workspaces ADD allowed_domains NVARCHAR(MAX);
    PRINT 'Colonne allowed_domains ajoutée à workspaces';
END
GO

-- Ajouter description sur workspaces (utilisée dans le code)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('workspaces') AND name = 'description')
BEGIN
    ALTER TABLE workspaces ADD description NVARCHAR(MAX);
    PRINT 'Colonne description ajoutée à workspaces';
END
GO

-- Ajouter rag_score sur messages
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'rag_score')
BEGIN
    ALTER TABLE messages ADD rag_score FLOAT;
    PRINT 'Colonne rag_score ajoutée à messages';
END
GO

-- Ajouter feedback sur messages
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'feedback')
BEGIN
    ALTER TABLE messages ADD feedback SMALLINT;
    PRINT 'Colonne feedback ajoutée à messages';
END
GO

-- Ajouter is_resolved sur messages
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'is_resolved')
BEGIN
    ALTER TABLE messages ADD is_resolved BIT DEFAULT 0;
    PRINT 'Colonne is_resolved ajoutée à messages';
END
GO

-- Contrainte pour feedback (si elle n'existe pas)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_messages_feedback')
BEGIN
    ALTER TABLE messages ADD CONSTRAINT CHK_messages_feedback 
        CHECK (feedback IS NULL OR feedback IN (-1, 1));
    PRINT 'Contrainte CHK_messages_feedback ajoutée';
END
GO

-- Contrainte pour rag_score (si elle n'existe pas)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_messages_rag_score')
BEGIN
    ALTER TABLE messages ADD CONSTRAINT CHK_messages_rag_score 
        CHECK (rag_score IS NULL OR (rag_score >= 0 AND rag_score <= 1));
    PRINT 'Contrainte CHK_messages_rag_score ajoutée';
END
GO

-- Supprimer plan et workspaces_limit de profiles (comme demandé)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('profiles') AND name = 'plan')
BEGIN
    -- D'abord supprimer la contrainte si elle existe
    IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_profiles_plan')
        ALTER TABLE profiles DROP CONSTRAINT CHK_profiles_plan;
    
    ALTER TABLE profiles DROP COLUMN [plan];
    PRINT 'Colonne plan supprimée de profiles';
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('profiles') AND name = 'workspaces_limit')
BEGIN
    ALTER TABLE profiles DROP COLUMN workspaces_limit;
    PRINT 'Colonne workspaces_limit supprimée de profiles';
END
GO

-- Ajouter role sur profiles
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('profiles') AND name = 'role')
BEGIN
    ALTER TABLE profiles ADD [role] NVARCHAR(50) DEFAULT 'admin';
    PRINT 'Colonne role ajoutée à profiles';
END
GO

-- =====================================================
-- PARTIE 3: TABLES D'AUTHENTIFICATION
-- =====================================================

-- Table des utilisateurs (authentification)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_users')
BEGIN
    CREATE TABLE app_users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(500) NOT NULL,
        password_salt NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255),
        [role] NVARCHAR(50) DEFAULT 'admin',
        is_active BIT DEFAULT 1,
        email_verified BIT DEFAULT 0,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        last_login_at DATETIMEOFFSET,
        failed_login_attempts INT DEFAULT 0,
        locked_until DATETIMEOFFSET,
        
        CONSTRAINT CHK_user_role CHECK ([role] IN ('admin', 'lecteur'))
    );
    PRINT 'Table app_users créée';
END
ELSE
    PRINT 'Table app_users existe déjà';
GO

-- Table des sessions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_sessions')
BEGIN
    CREATE TABLE app_sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token_hash NVARCHAR(500) NOT NULL,
        refresh_token_hash NVARCHAR(500),
        expires_at DATETIMEOFFSET NOT NULL,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        ip_address NVARCHAR(50),
        user_agent NVARCHAR(500),
        
        CONSTRAINT FK_sessions_user FOREIGN KEY (user_id) 
            REFERENCES app_users(id) ON DELETE CASCADE
    );
    PRINT 'Table app_sessions créée';
END
ELSE
    PRINT 'Table app_sessions existe déjà';
GO

-- =====================================================
-- PARTIE 4: INDEX SUPPLÉMENTAIRES
-- =====================================================

-- Index pour workspace_databases
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_workspace_databases_workspace')
    CREATE NONCLUSTERED INDEX idx_workspace_databases_workspace ON workspace_databases(workspace_id);

-- Index pour document_chunks
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_document_chunks_document')
    CREATE NONCLUSTERED INDEX idx_document_chunks_document ON document_chunks(document_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_document_chunks_workspace')
    CREATE NONCLUSTERED INDEX idx_document_chunks_workspace ON document_chunks(workspace_id);

-- Index pour message_topics
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_message_topics_workspace')
    CREATE NONCLUSTERED INDEX idx_message_topics_workspace ON message_topics(workspace_id);

-- Index pour response_cache
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_response_cache_workspace')
    CREATE NONCLUSTERED INDEX idx_response_cache_workspace ON response_cache(workspace_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_response_cache_hash')
    CREATE NONCLUSTERED INDEX idx_response_cache_hash ON response_cache(workspace_id, question_hash);

-- Index pour sessions
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sessions_token')
    CREATE NONCLUSTERED INDEX idx_sessions_token ON app_sessions(token_hash);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sessions_user')
    CREATE NONCLUSTERED INDEX idx_sessions_user ON app_sessions(user_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_sessions_expires')
    CREATE NONCLUSTERED INDEX idx_sessions_expires ON app_sessions(expires_at);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_conversations_visitor')
    CREATE NONCLUSTERED INDEX idx_conversations_visitor ON conversations(workspace_id, visitor_id);

PRINT 'Index créés';
GO

-- =====================================================
-- PARTIE 5: TRIGGERS SUPPLÉMENTAIRES
-- =====================================================

-- Trigger pour workspace_databases updated_at
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_workspace_databases_updated_at')
    DROP TRIGGER trg_workspace_databases_updated_at;
GO

CREATE TRIGGER trg_workspace_databases_updated_at
ON workspace_databases
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE workspace_databases 
    SET updated_at = SYSDATETIMEOFFSET()
    FROM workspace_databases wd
    INNER JOIN inserted i ON wd.id = i.id;
END;
GO

PRINT 'Trigger trg_workspace_databases_updated_at créé';
GO

-- =====================================================
-- PARTIE 6: STORED PROCEDURES
-- =====================================================

-- Procédure pour calculer les insights
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_calculate_workspace_insights')
    DROP PROCEDURE sp_calculate_workspace_insights;
GO

CREATE PROCEDURE sp_calculate_workspace_insights
    @workspace_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @satisfaction_rate FLOAT;
    DECLARE @avg_rag_score FLOAT;
    DECLARE @avg_messages FLOAT;
    DECLARE @low_confidence INT;
    DECLARE @total_conversations INT;
    DECLARE @total_messages INT;
    DECLARE @feedback_count INT;
    DECLARE @positive_feedback INT;
    
    -- Taux de satisfaction
    SELECT 
        @feedback_count = COUNT(*),
        @positive_feedback = ISNULL(SUM(CASE WHEN feedback = 1 THEN 1 ELSE 0 END), 0)
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id 
      AND m.[role] = 'assistant' 
      AND m.feedback IS NOT NULL;
    
    IF @feedback_count > 0
        SET @satisfaction_rate = (CAST(@positive_feedback AS FLOAT) / @feedback_count) * 100;
    ELSE
        SET @satisfaction_rate = NULL;
    
    -- Score RAG moyen
    SELECT @avg_rag_score = AVG(rag_score)
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id 
      AND m.[role] = 'assistant' 
      AND m.rag_score IS NOT NULL;
    
    -- Questions à faible confiance (non résolues)
    SELECT @low_confidence = COUNT(*)
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id 
      AND m.[role] = 'assistant' 
      AND m.rag_score IS NOT NULL 
      AND m.rag_score < 0.5
      AND (m.is_resolved = 0 OR m.is_resolved IS NULL);
    
    -- Totaux
    SELECT @total_conversations = COUNT(*)
    FROM conversations 
    WHERE workspace_id = @workspace_id;
    
    SELECT @total_messages = COUNT(*)
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id;
    
    -- Messages par conversation en moyenne
    IF @total_conversations > 0
        SET @avg_messages = CAST(@total_messages AS FLOAT) / @total_conversations;
    ELSE
        SET @avg_messages = 0;
    
    -- Upsert dans le cache
    IF EXISTS (SELECT 1 FROM insights_cache WHERE workspace_id = @workspace_id)
    BEGIN
        UPDATE insights_cache SET
            satisfaction_rate = @satisfaction_rate,
            avg_rag_score = @avg_rag_score,
            avg_messages_per_conversation = @avg_messages,
            low_confidence_count = ISNULL(@low_confidence, 0),
            total_conversations = ISNULL(@total_conversations, 0),
            total_messages = ISNULL(@total_messages, 0),
            calculated_at = SYSDATETIMEOFFSET()
        WHERE workspace_id = @workspace_id;
    END
    ELSE
    BEGIN
        INSERT INTO insights_cache (
            workspace_id, satisfaction_rate, avg_rag_score, 
            avg_messages_per_conversation, low_confidence_count,
            total_conversations, total_messages
        ) VALUES (
            @workspace_id, @satisfaction_rate, @avg_rag_score,
            @avg_messages, ISNULL(@low_confidence, 0), 
            ISNULL(@total_conversations, 0), ISNULL(@total_messages, 0)
        );
    END
    
    -- Retourner les résultats
    SELECT 
        @satisfaction_rate AS satisfaction_rate,
        @avg_rag_score AS avg_rag_score,
        @avg_messages AS avg_messages_per_conversation,
        @low_confidence AS low_confidence_count,
        @total_conversations AS total_conversations,
        @total_messages AS total_messages;
END;
GO

PRINT 'Stored procedure sp_calculate_workspace_insights créée';
GO

-- Procédure pour créer un utilisateur
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_create_user')
    DROP PROCEDURE sp_create_user;
GO

CREATE PROCEDURE sp_create_user
    @email NVARCHAR(255),
    @password_hash NVARCHAR(500),
    @password_salt NVARCHAR(255),
    @full_name NVARCHAR(255) = NULL,
    @role NVARCHAR(50) = 'admin'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Vérifier si l'email existe déjà
    IF EXISTS (SELECT 1 FROM app_users WHERE email = @email)
    BEGIN
        SELECT 0 AS success, 'Email déjà utilisé' AS message, NULL AS user_id;
        RETURN;
    END
    
    DECLARE @user_id UNIQUEIDENTIFIER = NEWID();
    DECLARE @name NVARCHAR(255);
    
    -- Générer le nom si non fourni
    IF @full_name IS NULL OR @full_name = ''
        SET @name = LEFT(@email, CHARINDEX('@', @email) - 1);
    ELSE
        SET @name = @full_name;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Créer l'utilisateur dans app_users
        INSERT INTO app_users (id, email, password_hash, password_salt, full_name, [role])
        VALUES (@user_id, @email, @password_hash, @password_salt, @name, @role);
        
        -- Créer le profil associé
        INSERT INTO profiles (id, email, full_name, [role])
        VALUES (@user_id, @email, @name, @role);
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS success, 'Compte créé avec succès' AS message, @user_id AS user_id;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 0 AS success, ERROR_MESSAGE() AS message, NULL AS user_id;
    END CATCH
END;
GO

PRINT 'Stored procedure sp_create_user créée';
GO

-- Procédure pour authentifier un utilisateur
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_user_for_auth')
    DROP PROCEDURE sp_get_user_for_auth;
GO

CREATE PROCEDURE sp_get_user_for_auth
    @email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Récupérer l'utilisateur avec toutes ses infos
    SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.password_salt,
        u.full_name,
        u.[role],
        u.is_active,
        u.email_verified,
        u.failed_login_attempts,
        u.locked_until,
        u.last_login_at
    FROM app_users u
    WHERE u.email = @email;
END;
GO

PRINT 'Stored procedure sp_get_user_for_auth créée';
GO

-- Procédure pour mettre à jour la dernière connexion
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_update_last_login')
    DROP PROCEDURE sp_update_last_login;
GO

CREATE PROCEDURE sp_update_last_login
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE app_users 
    SET 
        last_login_at = SYSDATETIMEOFFSET(),
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = @user_id;
END;
GO

PRINT 'Stored procedure sp_update_last_login créée';
GO

-- Procédure pour créer une session
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_create_session')
    DROP PROCEDURE sp_create_session;
GO

CREATE PROCEDURE sp_create_session
    @user_id UNIQUEIDENTIFIER,
    @token_hash NVARCHAR(500),
    @refresh_token_hash NVARCHAR(500) = NULL,
    @expires_at DATETIMEOFFSET,
    @ip_address NVARCHAR(50) = NULL,
    @user_agent NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @session_id UNIQUEIDENTIFIER = NEWID();
    
    INSERT INTO app_sessions (id, user_id, token_hash, refresh_token_hash, expires_at, ip_address, user_agent)
    VALUES (@session_id, @user_id, @token_hash, @refresh_token_hash, @expires_at, @ip_address, @user_agent);
    
    SELECT @session_id AS session_id;
END;
GO

PRINT 'Stored procedure sp_create_session créée';
GO

-- Procédure pour valider une session
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_validate_session')
    DROP PROCEDURE sp_validate_session;
GO

CREATE PROCEDURE sp_validate_session
    @token_hash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        u.email,
        u.full_name,
        u.[role],
        u.is_active
    FROM app_sessions s
    JOIN app_users u ON s.user_id = u.id
    WHERE s.token_hash = @token_hash
      AND s.expires_at > SYSDATETIMEOFFSET()
      AND u.is_active = 1;
END;
GO

PRINT 'Stored procedure sp_validate_session créée';
GO

-- Procédure pour supprimer une session (logout)
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_delete_session')
    DROP PROCEDURE sp_delete_session;
GO

CREATE PROCEDURE sp_delete_session
    @token_hash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM app_sessions WHERE token_hash = @token_hash;
    
    SELECT @@ROWCOUNT AS deleted_count;
END;
GO

PRINT 'Stored procedure sp_delete_session créée';
GO

-- Procédure pour nettoyer les sessions expirées
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_cleanup_expired_sessions')
    DROP PROCEDURE sp_cleanup_expired_sessions;
GO

CREATE PROCEDURE sp_cleanup_expired_sessions
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM app_sessions 
    WHERE expires_at < SYSDATETIMEOFFSET();
    
    SELECT @@ROWCOUNT AS deleted_count;
END;
GO

PRINT 'Stored procedure sp_cleanup_expired_sessions créée';
GO

-- =====================================================
-- PARTIE 7: VUES UTILITAIRES
-- =====================================================

-- Supprimer et recréer la vue vw_workspace_stats
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_workspace_stats')
    DROP VIEW vw_workspace_stats;
GO

CREATE VIEW vw_workspace_stats AS
SELECT 
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.user_id,
    (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id) AS total_documents,
    (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id AND d.[status] = 'indexed') AS indexed_documents,
    (SELECT COUNT(*) FROM conversations c WHERE c.workspace_id = w.id) AS total_conversations,
    (SELECT ISNULL(SUM(c.messages_count), 0) FROM conversations c WHERE c.workspace_id = w.id) AS total_messages,
    (SELECT COUNT(DISTINCT c.visitor_id) FROM conversations c WHERE c.workspace_id = w.id) AS unique_visitors
FROM workspaces w;
GO

PRINT 'Vue vw_workspace_stats créée';
GO

-- Vue pour les utilisateurs avec leurs workspaces
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_user_workspaces')
    DROP VIEW vw_user_workspaces;
GO

CREATE VIEW vw_user_workspaces AS
SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    u.[role],
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.domain,
    w.is_active AS workspace_active,
    w.created_at AS workspace_created_at
FROM app_users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN workspaces w ON p.id = w.user_id
WHERE u.is_active = 1;
GO

PRINT 'Vue vw_user_workspaces créée';
GO

-- =====================================================
-- PARTIE 8: CONFIGURATION FK profiles -> app_users
-- =====================================================

-- Ajouter une contrainte FK entre profiles et app_users
-- (optionnel, mais recommandé pour l'intégrité)
-- Note: Cela ne fonctionnera que si les données sont cohérentes

-- D'abord, vérifier si la FK existe déjà
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_profiles_app_users')
BEGIN
    -- Ajouter la FK seulement si app_users a des données correspondantes
    -- Pour le moment, on commente car les tables sont vides
    -- ALTER TABLE profiles ADD CONSTRAINT FK_profiles_app_users 
    --     FOREIGN KEY (id) REFERENCES app_users(id);
    PRINT 'FK profiles -> app_users: À activer après migration des données';
END
GO

-- =====================================================
-- RÉSUMÉ DE LA MIGRATION
-- =====================================================

PRINT '';
PRINT '=====================================================';
PRINT 'MIGRATION TERMINÉE';
PRINT '=====================================================';
PRINT '';

-- Afficher les tables créées
SELECT 
    t.name AS table_name,
    (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS column_count
FROM sys.tables t
WHERE t.is_ms_shipped = 0
ORDER BY t.name;

PRINT '';
PRINT 'Prochaines étapes:';
PRINT '1. Adapter le backend Python pour utiliser SQL Server';
PRINT '2. Adapter le frontend pour la nouvelle API d''authentification';
PRINT '3. Migrer les données existantes de Supabase (si nécessaire)';
PRINT '=====================================================';
GO
