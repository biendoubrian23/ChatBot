-- =====================================================
-- MONITORA - Schéma Base de Données SQL Server
-- =====================================================
-- Converti depuis PostgreSQL/Supabase vers T-SQL
-- Compatible avec Microsoft SQL Server Management Studio
-- =====================================================

-- =====================================================
-- TABLE: profiles
-- Profils utilisateurs
-- =====================================================
CREATE TABLE profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255),
    full_name NVARCHAR(255),
    avatar_url NVARCHAR(500),
    [plan] NVARCHAR(50) DEFAULT 'free',
    workspaces_limit INT DEFAULT 3,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    
    CONSTRAINT CHK_profiles_plan CHECK ([plan] IN ('free', 'pro', 'enterprise'))
);
GO

-- =====================================================
-- TABLE: workspaces
-- Un workspace = un chatbot pour un site
-- =====================================================
CREATE TABLE workspaces (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    domain NVARCHAR(255), -- domaine autorisé pour le widget (optionnel)
    api_key NVARCHAR(255) UNIQUE DEFAULT CONVERT(NVARCHAR(255), NEWID()),
    settings NVARCHAR(MAX) DEFAULT N'{
        "color_accent": "#000000",
        "position": "bottom-right",
        "welcome_message": "Bonjour ! Comment puis-je vous aider ?",
        "chatbot_name": "Assistant"
    }',
    rag_config NVARCHAR(MAX) DEFAULT N'{
        "temperature": 0.1,
        "max_tokens": 900,
        "top_k": 8,
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "llm_model": "mistral-small-latest"
    }',
    is_active BIT DEFAULT 1,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    
    CONSTRAINT FK_workspaces_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
GO

-- =====================================================
-- TABLE: documents
-- Documents uploadés par workspace
-- =====================================================
CREATE TABLE documents (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL,
    filename NVARCHAR(500) NOT NULL,
    file_path NVARCHAR(1000) NOT NULL,
    file_size INT,
    mime_type NVARCHAR(100),
    [status] NVARCHAR(50) DEFAULT 'pending',
    chunks_count INT DEFAULT 0,
    error_message NVARCHAR(MAX),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    indexed_at DATETIMEOFFSET,
    
    CONSTRAINT FK_documents_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT CHK_documents_status CHECK ([status] IN ('pending', 'indexing', 'indexed', 'error'))
);
GO

-- =====================================================
-- TABLE: conversations
-- Conversations des visiteurs
-- =====================================================
CREATE TABLE conversations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL,
    visitor_id NVARCHAR(255), -- fingerprint ou session ID du visiteur
    started_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    ended_at DATETIMEOFFSET,
    messages_count INT DEFAULT 0,
    satisfaction INT,
    
    CONSTRAINT FK_conversations_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT CHK_conversations_satisfaction CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 5))
);
GO

-- =====================================================
-- TABLE: messages
-- Messages d'une conversation
-- =====================================================
CREATE TABLE messages (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    conversation_id UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(50) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    sources NVARCHAR(MAX), -- sources utilisées pour la réponse (JSON)
    response_time_ms INT,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    
    CONSTRAINT FK_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT CHK_messages_role CHECK ([role] IN ('user', 'assistant'))
);
GO

-- =====================================================
-- TABLE: analytics_daily
-- Statistiques agrégées par jour (pour performance)
-- =====================================================
CREATE TABLE analytics_daily (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL,
    [date] DATE NOT NULL,
    conversations_count INT DEFAULT 0,
    messages_count INT DEFAULT 0,
    avg_response_time_ms INT,
    unique_visitors INT DEFAULT 0,
    
    CONSTRAINT FK_analytics_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT UQ_analytics_workspace_date UNIQUE (workspace_id, [date])
);
GO

-- =====================================================
-- INDEXES
-- =====================================================
CREATE NONCLUSTERED INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE NONCLUSTERED INDEX idx_workspaces_api_key ON workspaces(api_key);
CREATE NONCLUSTERED INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE NONCLUSTERED INDEX idx_documents_status ON documents([status]);
CREATE NONCLUSTERED INDEX idx_conversations_workspace_id ON conversations(workspace_id);
CREATE NONCLUSTERED INDEX idx_conversations_started_at ON conversations(started_at);
CREATE NONCLUSTERED INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE NONCLUSTERED INDEX idx_analytics_workspace_date ON analytics_daily(workspace_id, [date]);
GO

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at automatiquement sur profiles
CREATE TRIGGER trg_profiles_updated_at
ON profiles
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE profiles 
    SET updated_at = SYSDATETIMEOFFSET()
    FROM profiles p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

-- Trigger pour mettre à jour updated_at automatiquement sur workspaces
CREATE TRIGGER trg_workspaces_updated_at
ON workspaces
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE workspaces 
    SET updated_at = SYSDATETIMEOFFSET()
    FROM workspaces w
    INNER JOIN inserted i ON w.id = i.id;
END;
GO

-- Trigger pour incrémenter le compteur de messages
CREATE TRIGGER trg_messages_increment_count
ON messages
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conversations
    SET messages_count = messages_count + 1
    FROM conversations c
    INNER JOIN inserted i ON c.id = i.conversation_id;
END;
GO

-- =====================================================
-- STORED PROCEDURES (optionnel)
-- Pour simuler certaines fonctions Supabase
-- =====================================================

-- Procédure pour créer un profil utilisateur
CREATE PROCEDURE sp_create_user_profile
    @user_id UNIQUEIDENTIFIER,
    @email NVARCHAR(255),
    @full_name NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @name NVARCHAR(255);
    
    -- Si full_name est NULL, extraire la partie avant @ de l'email
    IF @full_name IS NULL
        SET @name = LEFT(@email, CHARINDEX('@', @email) - 1);
    ELSE
        SET @name = @full_name;
    
    INSERT INTO profiles (id, email, full_name)
    VALUES (@user_id, @email, @name);
END;
GO

-- =====================================================
-- VUES (pour faciliter les requêtes)
-- =====================================================

-- Vue pour obtenir les workspaces avec les infos du propriétaire
CREATE VIEW vw_workspaces_with_owner AS
SELECT 
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.domain,
    w.api_key,
    w.settings,
    w.rag_config,
    w.is_active,
    w.created_at AS workspace_created_at,
    w.updated_at AS workspace_updated_at,
    p.id AS owner_id,
    p.email AS owner_email,
    p.full_name AS owner_name,
    p.[plan] AS owner_plan
FROM workspaces w
INNER JOIN profiles p ON w.user_id = p.id;
GO

-- Vue pour les statistiques par workspace
CREATE VIEW vw_workspace_stats AS
SELECT 
    w.id AS workspace_id,
    w.name AS workspace_name,
    (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id) AS total_documents,
    (SELECT COUNT(*) FROM documents d WHERE d.workspace_id = w.id AND d.[status] = 'indexed') AS indexed_documents,
    (SELECT COUNT(*) FROM conversations c WHERE c.workspace_id = w.id) AS total_conversations,
    (SELECT ISNULL(SUM(c.messages_count), 0) FROM conversations c WHERE c.workspace_id = w.id) AS total_messages
FROM workspaces w;
GO

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================
/*
DIFFERENCES AVEC LA VERSION SUPABASE:

1. AUTHENTIFICATION:
   - La version Supabase utilise auth.users et auth.uid() pour l'authentification
   - Sur SQL Server, vous devez gérer l'authentification séparément
   - Considérez utiliser Windows Authentication ou une table users personnalisée

2. ROW LEVEL SECURITY (RLS):
   - PostgreSQL/Supabase a un RLS natif avec CREATE POLICY
   - SQL Server n'a pas cette fonctionnalité
   - Alternatives:
     * Utiliser des vues avec filtre WHERE
     * Implémenter la logique de sécurité dans l'application
     * Utiliser des procédures stockées pour l'accès aux données

3. JSON:
   - Les colonnes JSONB de PostgreSQL sont stockées en NVARCHAR(MAX)
   - Utilisez JSON_VALUE() et JSON_QUERY() pour accéder aux données
   - Exemple: SELECT JSON_VALUE(settings, '$.color_accent') FROM workspaces

4. UUID vs UNIQUEIDENTIFIER:
   - Fonctionnellement similaires
   - NEWID() génère un nouveau GUID

5. DATES:
   - TIMESTAMPTZ -> DATETIMEOFFSET (avec fuseau horaire)
   - NOW() -> SYSDATETIMEOFFSET() ou GETDATE()
*/
