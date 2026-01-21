# 🔄 Plan de Migration Supabase → Microsoft SQL Server

## 📋 Vue d'ensemble

Ce document détaille le plan complet de migration de la base de données MONITORA de Supabase (PostgreSQL) vers Microsoft SQL Server Management Studio.

### 🔗 Connexion à la nouvelle base de données
```
Host: alpha.messages.fr
Port: 1433
Database: Monitora_dev
User: chatbot
Password: M3ss4ges
Driver: ODBC Driver 18 for SQL Server
```

---

## 📊 Analyse de l'existant

### Tables Supabase actuelles (schéma public)
| Table | Description | Status Migration |
|-------|-------------|------------------|
| `profiles` | Profils utilisateurs | ✅ Créée (SQL Server) |
| `workspaces` | Chatbots/espaces de travail | ✅ Créée (SQL Server) |
| `documents` | Documents uploadés | ✅ Créée (SQL Server) |
| `conversations` | Conversations visiteurs | ✅ Créée (SQL Server) |
| `messages` | Messages des conversations | ✅ Créée (SQL Server) |
| `analytics_daily` | Stats agrégées | ✅ Créée (SQL Server) |
| `workspace_databases` | Config BDD externes | ❌ À créer |
| `document_chunks` | Chunks vectorisés | ❌ À créer |
| `insights_cache` | Cache des insights | ❌ À créer |
| `message_topics` | Topics des messages | ❌ À créer |
| `response_cache` | Cache des réponses | ❌ À créer |

### Fonctions Supabase à migrer
| Fonction | Type | Description |
|----------|------|-------------|
| `handle_new_user` | Trigger Function | Crée profil après inscription |
| `calculate_workspace_insights` | Stored Procedure | Calcule les métriques |
| `match_documents` | Vector Search | Recherche sémantique |
| `search_response_cache` | Vector Search | Cache sémantique |
| `update_updated_at_column` | Trigger Function | MAJ auto du timestamp |
| `increment_messages_count` | Trigger Function | Incrémente compteur |

### Triggers Supabase
| Trigger | Table | Event | Status |
|---------|-------|-------|--------|
| `increment_messages_count` | messages | AFTER INSERT | ✅ Migré |
| `update_workspaces_updated_at` | workspaces | BEFORE UPDATE | ✅ Migré |
| `trigger_workspace_databases_updated_at` | workspace_databases | BEFORE UPDATE | ❌ À créer |

---

## 🏗️ Architecture de Migration

### Différences clés Supabase vs SQL Server

| Aspect | Supabase (PostgreSQL) | SQL Server | Solution |
|--------|----------------------|------------|----------|
| **Authentification** | `auth.users` + `auth.uid()` | Tables personnalisées | Créer tables `Users` + `Memberships` |
| **RLS (Row Level Security)** | Policies natives | Non supporté | Gérer dans l'application backend |
| **UUID** | `gen_random_uuid()` | `NEWID()` | ✅ Compatible |
| **JSON** | `JSONB` natif | `NVARCHAR(MAX)` + `JSON_VALUE()` | ✅ Adapté |
| **Vecteurs (pgvector)** | Extension native | Non supporté | Utiliser FAISS côté Python |
| **Real-time** | Subscriptions natives | Non supporté | Polling ou SignalR |
| **Dates** | `TIMESTAMPTZ` | `DATETIMEOFFSET` | ✅ Compatible |

---

## 📝 TODO Liste Détaillée

### Phase 1: Schéma de Base de Données ✅ (Partiellement fait)
- [x] Créer table `profiles`
- [x] Créer table `workspaces`  
- [x] Créer table `documents`
- [x] Créer table `conversations`
- [x] Créer table `messages`
- [x] Créer table `analytics_daily`
- [ ] Créer table `workspace_databases` (config BDD externes)
- [ ] Créer table `document_chunks` (pour stockage vecteurs)
- [ ] Créer table `insights_cache`
- [ ] Créer table `message_topics`
- [ ] Créer table `response_cache`
- [ ] Ajouter colonne `allowed_domains` sur `workspaces`
- [ ] Ajouter colonnes `rag_score`, `feedback`, `is_resolved` sur `messages`

### Phase 2: Système d'Authentification
- [ ] Créer table `Users` (basée sur dbo.Users existante)
- [ ] Créer table `Memberships` (gestion mots de passe SHA)
- [ ] Créer table `Sessions` (tokens JWT)
- [ ] Créer stored procedure `sp_authenticate_user`
- [ ] Créer stored procedure `sp_create_user`
- [ ] Créer stored procedure `sp_change_password`
- [ ] Supprimer le système de `plan` et `workspaces_limit` (comme demandé)
- [ ] Implémenter rôles `admin` et `lecteur`

### Phase 3: Triggers et Stored Procedures
- [x] Trigger `trg_profiles_updated_at`
- [x] Trigger `trg_workspaces_updated_at`
- [x] Trigger `trg_messages_increment_count`
- [ ] Trigger `trg_workspace_databases_updated_at`
- [ ] Stored Procedure `sp_calculate_workspace_insights`
- [ ] Stored Procedure `sp_get_user_workspaces`
- [ ] Vues utilitaires

### Phase 4: Adapter le Backend Python
- [ ] Créer nouveau fichier `app/core/sqlserver.py` (connexion MSSQL)
- [ ] Créer couche d'abstraction `app/core/database.py`
- [ ] Modifier `app/core/config.py` (nouvelles variables d'env)
- [ ] Adapter `app/api/workspaces.py`
- [ ] Adapter `app/api/documents.py`
- [ ] Adapter `app/api/insights.py`
- [ ] Adapter `app/api/database_config.py`
- [ ] Adapter `app/api/chat.py`
- [ ] Adapter `app/api/widget.py`
- [ ] Créer nouveau système d'auth `app/core/auth.py`
- [ ] Modifier `app/services/vectorstore.py` (utiliser FAISS local)

### Phase 5: Adapter le Frontend Next.js
- [ ] Créer `src/lib/api-sqlserver.ts` (nouveau client API)
- [ ] Modifier `src/lib/supabase.ts` → `src/lib/auth.ts`
- [ ] Adapter pages login/register pour nouvelle auth
- [ ] Adapter le contexte d'authentification
- [ ] Mettre à jour les appels API dans toutes les pages
- [ ] Tester toutes les fonctionnalités

### Phase 6: Migration des Données (si nécessaire)
- [ ] Script d'export des données Supabase
- [ ] Script d'import dans SQL Server
- [ ] Validation des données migrées

### Phase 7: Tests et Validation
- [ ] Tester création de compte
- [ ] Tester connexion/déconnexion
- [ ] Tester CRUD workspaces
- [ ] Tester upload documents
- [ ] Tester chat widget
- [ ] Tester analytics
- [ ] Tester insights
- [ ] Tester configuration BDD externe

---

## 🗄️ Schéma SQL Server Complet à Appliquer

### Tables Manquantes à Créer

```sql
-- =====================================================
-- TABLE: workspace_databases
-- Configuration des bases de données externes
-- =====================================================
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
GO

-- =====================================================
-- TABLE: document_chunks
-- Chunks de documents avec embeddings
-- =====================================================
CREATE TABLE document_chunks (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    document_id UNIQUEIDENTIFIER NOT NULL,
    workspace_id UNIQUEIDENTIFIER NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    metadata NVARCHAR(MAX), -- JSON
    chunk_index INT NOT NULL,
    -- Note: Les embeddings seront stockés côté FAISS (Python)
    -- embedding_id sert de référence pour FAISS
    embedding_id NVARCHAR(255),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    
    CONSTRAINT FK_chunks_document FOREIGN KEY (document_id) 
        REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT FK_chunks_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE NO ACTION
);
GO

-- =====================================================
-- TABLE: insights_cache
-- Cache des insights calculés
-- =====================================================
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
GO

-- =====================================================
-- TABLE: message_topics
-- Classification des messages par sujet
-- =====================================================
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
GO

-- =====================================================
-- TABLE: response_cache
-- Cache des réponses pour éviter les appels LLM répétitifs
-- =====================================================
CREATE TABLE response_cache (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workspace_id UNIQUEIDENTIFIER NOT NULL,
    question_hash NVARCHAR(64) NOT NULL, -- SHA256 de la question
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
GO

-- =====================================================
-- Modifications sur tables existantes
-- =====================================================

-- Ajouter allowed_domains sur workspaces
ALTER TABLE workspaces ADD allowed_domains NVARCHAR(MAX); -- JSON array
GO

-- Ajouter colonnes manquantes sur messages
ALTER TABLE messages ADD rag_score FLOAT;
ALTER TABLE messages ADD feedback SMALLINT;
ALTER TABLE messages ADD is_resolved BIT DEFAULT 0;
GO

-- Contrainte pour feedback
ALTER TABLE messages ADD CONSTRAINT CHK_messages_feedback 
    CHECK (feedback IS NULL OR feedback IN (-1, 1));
GO

-- Contrainte pour rag_score
ALTER TABLE messages ADD CONSTRAINT CHK_messages_rag_score 
    CHECK (rag_score IS NULL OR (rag_score >= 0 AND rag_score <= 1));
GO

-- =====================================================
-- INDEXES supplémentaires
-- =====================================================
CREATE NONCLUSTERED INDEX idx_workspace_databases_workspace ON workspace_databases(workspace_id);
CREATE NONCLUSTERED INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE NONCLUSTERED INDEX idx_document_chunks_workspace ON document_chunks(workspace_id);
CREATE NONCLUSTERED INDEX idx_message_topics_workspace ON message_topics(workspace_id);
CREATE NONCLUSTERED INDEX idx_response_cache_workspace ON response_cache(workspace_id);
CREATE NONCLUSTERED INDEX idx_response_cache_hash ON response_cache(workspace_id, question_hash);
GO

-- =====================================================
-- TRIGGER: workspace_databases updated_at
-- =====================================================
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

-- =====================================================
-- STORED PROCEDURE: Calculer les insights
-- =====================================================
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
        @positive_feedback = SUM(CASE WHEN feedback = 1 THEN 1 ELSE 0 END)
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
    
    -- Questions à faible confiance
    SELECT @low_confidence = COUNT(*)
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id 
      AND m.[role] = 'assistant' 
      AND m.rag_score IS NOT NULL 
      AND m.rag_score < 0.5
      AND m.is_resolved = 0;
    
    -- Totaux
    SELECT @total_conversations = COUNT(*)
    FROM conversations 
    WHERE workspace_id = @workspace_id;
    
    SELECT @total_messages = COUNT(*)
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = @workspace_id;
    
    -- Messages par conversation
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
            low_confidence_count = @low_confidence,
            total_conversations = @total_conversations,
            total_messages = @total_messages,
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
            @avg_messages, @low_confidence, @total_conversations, @total_messages
        );
    END
END;
GO
```

---

## 🔐 Système d'Authentification SQL Server

### Tables d'Authentification

```sql
-- =====================================================
-- TABLE: Users (Authentification)
-- Équivalent de auth.users de Supabase
-- =====================================================
CREATE TABLE app_users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(500) NOT NULL,
    password_salt NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(255),
    [role] NVARCHAR(50) DEFAULT 'admin', -- admin ou lecteur
    is_active BIT DEFAULT 1,
    email_verified BIT DEFAULT 0,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    last_login_at DATETIMEOFFSET,
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIMEOFFSET,
    
    CONSTRAINT CHK_user_role CHECK ([role] IN ('admin', 'lecteur'))
);
GO

-- =====================================================
-- TABLE: Sessions (Tokens JWT)
-- =====================================================
CREATE TABLE app_sessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(500) NOT NULL,
    expires_at DATETIMEOFFSET NOT NULL,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    
    CONSTRAINT FK_sessions_user FOREIGN KEY (user_id) 
        REFERENCES app_users(id) ON DELETE CASCADE
);
GO

-- Index pour la recherche de sessions
CREATE NONCLUSTERED INDEX idx_sessions_token ON app_sessions(token_hash);
CREATE NONCLUSTERED INDEX idx_sessions_user ON app_sessions(user_id);
CREATE NONCLUSTERED INDEX idx_sessions_expires ON app_sessions(expires_at);
GO

-- =====================================================
-- STORED PROCEDURE: Authentification
-- =====================================================
CREATE PROCEDURE sp_authenticate_user
    @email NVARCHAR(255),
    @password_hash NVARCHAR(500), -- Le hash sera calculé côté Python
    @ip_address NVARCHAR(50) = NULL,
    @user_agent NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @user_id UNIQUEIDENTIFIER;
    DECLARE @stored_hash NVARCHAR(500);
    DECLARE @is_active BIT;
    DECLARE @locked_until DATETIMEOFFSET;
    DECLARE @failed_attempts INT;
    
    -- Récupérer l'utilisateur
    SELECT 
        @user_id = id,
        @stored_hash = password_hash,
        @is_active = is_active,
        @locked_until = locked_until,
        @failed_attempts = failed_login_attempts
    FROM app_users 
    WHERE email = @email;
    
    -- Utilisateur non trouvé
    IF @user_id IS NULL
    BEGIN
        SELECT 0 AS success, 'Utilisateur non trouvé' AS message;
        RETURN;
    END
    
    -- Compte verrouillé
    IF @locked_until IS NOT NULL AND @locked_until > SYSDATETIMEOFFSET()
    BEGIN
        SELECT 0 AS success, 'Compte temporairement verrouillé' AS message;
        RETURN;
    END
    
    -- Compte désactivé
    IF @is_active = 0
    BEGIN
        SELECT 0 AS success, 'Compte désactivé' AS message;
        RETURN;
    END
    
    -- Vérification du mot de passe (le hash est comparé côté Python)
    -- Ici on retourne les infos pour que Python vérifie
    SELECT 
        1 AS success,
        u.id AS user_id,
        u.email,
        u.full_name,
        u.[role],
        u.password_hash,
        u.password_salt
    FROM app_users u
    WHERE u.id = @user_id;
END;
GO

-- =====================================================
-- STORED PROCEDURE: Créer un utilisateur
-- =====================================================
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
        SELECT 0 AS success, 'Email déjà utilisé' AS message;
        RETURN;
    END
    
    DECLARE @user_id UNIQUEIDENTIFIER = NEWID();
    DECLARE @name NVARCHAR(255);
    
    -- Générer le nom si non fourni
    IF @full_name IS NULL
        SET @name = LEFT(@email, CHARINDEX('@', @email) - 1);
    ELSE
        SET @name = @full_name;
    
    -- Créer l'utilisateur
    INSERT INTO app_users (id, email, password_hash, password_salt, full_name, [role])
    VALUES (@user_id, @email, @password_hash, @password_salt, @name, @role);
    
    -- Créer le profil associé
    INSERT INTO profiles (id, email, full_name)
    VALUES (@user_id, @email, @name);
    
    SELECT 1 AS success, @user_id AS user_id, 'Compte créé avec succès' AS message;
END;
GO
```

---

## 🔌 Architecture Backend Modifiée

### Nouvelle structure des fichiers

```
monitora/backend/app/
├── core/
│   ├── config.py          # Configuration (modifié)
│   ├── database.py         # Nouveau: abstraction BDD
│   ├── sqlserver.py        # Nouveau: connexion SQL Server
│   ├── auth.py             # Nouveau: système d'authentification
│   └── supabase.py         # À garder pour transition
├── api/
│   ├── auth.py             # Nouveau: routes auth
│   ├── workspaces.py       # À adapter
│   ├── documents.py        # À adapter
│   ├── insights.py         # À adapter
│   └── ...
└── services/
    ├── vectorstore_local.py  # Utiliser FAISS local
    └── ...
```

### Variables d'environnement à ajouter

```env
# SQL Server (Monitora)
MSSQL_HOST=alpha.messages.fr
MSSQL_PORT=1433
MSSQL_DATABASE=Monitora_dev
MSSQL_USER=chatbot
MSSQL_PASSWORD=M3ss4ges
MSSQL_DRIVER=ODBC Driver 18 for SQL Server

# Mode de stockage
STORAGE_MODE=local  # Utiliser FAISS au lieu de pgvector
AUTH_MODE=sqlserver  # Utiliser SQL Server au lieu de Supabase auth

# JWT
JWT_SECRET=votre_secret_jwt_ici
JWT_EXPIRY_HOURS=24
```

---

## 🎯 Ordre d'Exécution Recommandé

### Semaine 1: Base de données
1. ✅ Exécuter le schéma SQL Server de base (déjà fait)
2. Exécuter les tables manquantes (workspace_databases, document_chunks, etc.)
3. Créer les tables d'authentification (app_users, app_sessions)
4. Créer les stored procedures et triggers

### Semaine 2: Backend
1. Créer le module de connexion SQL Server
2. Créer le système d'authentification JWT
3. Adapter les routes API une par une
4. Tester chaque endpoint

### Semaine 3: Frontend
1. Remplacer le client Supabase par un client API custom
2. Adapter les pages d'authentification
3. Tester toutes les fonctionnalités UI

### Semaine 4: Tests et finalisation
1. Tests d'intégration complets
2. Migration des données (si existantes)
3. Documentation finale

---

## 📌 Notes Importantes

### Concernant les vecteurs (embeddings)
Supabase utilise pgvector pour stocker les embeddings directement en base. SQL Server ne supporte pas cela nativement. 

**Solution retenue**: Utiliser FAISS (Facebook AI Similarity Search) côté Python:
- Les embeddings sont générés et stockés dans des fichiers FAISS locaux
- La table `document_chunks` stocke le contenu texte et un `embedding_id` pour référence
- Le service `vectorstore_local.py` gère la recherche sémantique

### Concernant les quotas/plans
Comme demandé, le système de `plan` (free/pro/enterprise) et `workspaces_limit` est supprimé. 
- Tous les utilisateurs sont soit `admin` soit `lecteur`
- Pas de limite sur le nombre de workspaces

### Concernant le Row Level Security (RLS)
SQL Server n'a pas de RLS natif comme PostgreSQL. La sécurité sera gérée:
- Dans le backend Python (vérification des permissions)
- Via des stored procedures qui vérifient l'ownership
- Via des vues filtrées si nécessaire

---

## ✅ Statut Actuel

| Composant | Statut |
|-----------|--------|
| Tables de base | ✅ Partiellement créées |
| Tables manquantes | ❌ À créer |
| Authentification | ❌ À créer |
| Backend adapté | ❌ À faire |
| Frontend adapté | ❌ À faire |
| Tests | ❌ À faire |

---

*Document créé le 13 janvier 2026*
*Branche: feature/sqlserver-migration*
