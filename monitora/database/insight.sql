-- ============================================================
-- SCRIPT DE CORRECTION - À exécuter avec un compte ADMIN
-- ============================================================

USE Monitora_dev;
GO

-- ============================================================
-- 1. AJOUTER LES COLONNES MANQUANTES À LA TABLE messages
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'rag_score')
BEGIN
    ALTER TABLE messages ADD rag_score FLOAT;
    PRINT 'Colonne rag_score ajoutée à messages';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'feedback')
BEGIN
    ALTER TABLE messages ADD feedback INT;
    PRINT 'Colonne feedback ajoutée à messages';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'is_resolved')
BEGIN
    ALTER TABLE messages ADD is_resolved BIT DEFAULT 0;
    PRINT 'Colonne is_resolved ajoutée à messages';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'rag_sources')
BEGIN
    ALTER TABLE messages ADD rag_sources NVARCHAR(MAX);
    PRINT 'Colonne rag_sources ajoutée à messages';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'tokens_used')
BEGIN
    ALTER TABLE messages ADD tokens_used INT;
    PRINT 'Colonne tokens_used ajoutée à messages';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'response_time_ms')
BEGIN
    ALTER TABLE messages ADD response_time_ms INT;
    PRINT 'Colonne response_time_ms ajoutée à messages';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('messages') AND name = 'metadata')
BEGIN
    ALTER TABLE messages ADD metadata NVARCHAR(MAX);
    PRINT 'Colonne metadata ajoutée à messages';
END
GO

-- ============================================================
-- 2. CRÉER LES 3 TABLES MANQUANTES
-- ============================================================

-- Table insights_cache
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
        calculated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    PRINT 'Table insights_cache créée';
END
GO

-- Table message_topics
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'message_topics')
BEGIN
    CREATE TABLE message_topics (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        topic_name NVARCHAR(255) NOT NULL,
        message_count INT DEFAULT 0,
        sample_questions NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_topics_workspace_id ON message_topics(workspace_id);
    PRINT 'Table message_topics créée';
END
GO

-- Table api_keys
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'api_keys')
BEGIN
    CREATE TABLE api_keys (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        key_prefix NVARCHAR(20) NOT NULL,
        key_hash NVARCHAR(255) NOT NULL,
        last_used_at DATETIME2,
        expires_at DATETIME2,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_api_keys_workspace_id ON api_keys(workspace_id);
    CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
    PRINT 'Table api_keys créée';
END
GO

-- ============================================================
-- 3. RECRÉER LA PROCÉDURE STOCKÉE
-- ============================================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_calculate_workspace_insights')
    DROP PROCEDURE sp_calculate_workspace_insights;
GO

CREATE PROCEDURE sp_calculate_workspace_insights
    @workspace_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @total_conv INT, @total_msg INT, @avg_rag FLOAT, @avg_sat FLOAT;
    DECLARE @low_conf INT, @avg_msg_per_conv FLOAT;
    
    SELECT @total_conv = COUNT(*) FROM conversations WHERE workspace_id = @workspace_id;
    
    SELECT 
        @total_msg = COUNT(*),
        @avg_rag = AVG(rag_score),
        @avg_sat = AVG(CAST(feedback AS FLOAT))
    FROM messages m
    INNER JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id;
    
    SELECT @low_conf = COUNT(*)
    FROM messages m
    INNER JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id
      AND m.role = 'user'
      AND (m.rag_score < 0.5 OR m.feedback = -1);
    
    SET @avg_msg_per_conv = CASE WHEN @total_conv > 0 
        THEN CAST(@total_msg AS FLOAT) / @total_conv ELSE 0 END;
    
    IF EXISTS (SELECT 1 FROM insights_cache WHERE workspace_id = @workspace_id)
        UPDATE insights_cache SET
            satisfaction_rate = CASE WHEN @avg_sat IS NOT NULL THEN (@avg_sat + 1) * 50 ELSE NULL END,
            avg_rag_score = @avg_rag,
            avg_messages_per_conversation = @avg_msg_per_conv,
            low_confidence_count = @low_conf,
            total_conversations = @total_conv,
            total_messages = @total_msg,
            calculated_at = GETUTCDATE()
        WHERE workspace_id = @workspace_id;
    ELSE
        INSERT INTO insights_cache (workspace_id, satisfaction_rate, avg_rag_score,
            avg_messages_per_conversation, low_confidence_count, total_conversations, 
            total_messages, calculated_at)
        VALUES (@workspace_id, CASE WHEN @avg_sat IS NOT NULL THEN (@avg_sat + 1) * 50 ELSE NULL END,
            @avg_rag, @avg_msg_per_conv, @low_conf, @total_conv, @total_msg, GETUTCDATE());
END;
GO

PRINT 'Procédure sp_calculate_workspace_insights créée';
GO

-- ============================================================
-- 4. ACCORDER LES PERMISSIONS À chatbot
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_daily TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON insights_cache TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_topics TO chatbot;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO chatbot;
GRANT EXECUTE ON sp_calculate_workspace_insights TO chatbot;

PRINT 'Permissions accordées à chatbot';
GO

-- ============================================================
-- 5. VÉRIFICATION
-- ============================================================
PRINT '';
PRINT '=== TABLES ===';
SELECT name FROM sys.tables WHERE name IN (
    'profiles', 'workspaces', 'documents', 'conversations', 
    'messages', 'analytics_daily', 'insights_cache', 'message_topics', 'api_keys'
) ORDER BY name;

PRINT '';
PRINT '=== COLONNES DE messages ===';
SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('messages') ORDER BY column_id;

PRINT '';
PRINT '============================================================';
PRINT 'CORRECTION TERMINÉE!';
PRINT '============================================================';
GO