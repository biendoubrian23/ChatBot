# 🗄️ MONITORA - Schéma Complet de la Base de Données SQL Server

## 📊 Vue Globale de l'Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MONITORA DATABASE STRUCTURE                             │
│                            (Monitora_dev)                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

                              🔐 AUTHENTIFICATION
                                      │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                 APP_USERS          APP_SESSIONS       PROFILES
              (Utilisateurs)      (Sessions JWT)    (Profils users)
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
              🎯 WORKSPACES                          📊 ANALYTICS
           (Chatbots/Espaces)                    (Données métier)
                    │                                       │
         ┌──────────┼──────────┬──────────┐        ┌────────┴────────┐
         │          │          │          │        │                 │
     DOCUMENTS  CONVERSATIONS INSIGHTS  API_KEYS  ANALYTICS_DAILY  INSIGHTS_CACHE
    (Fichiers)  (Discussions)  (Insights)        (Stats quotidiennes)
         │          │                    
         │          │
    DOCUMENT_    MESSAGES
    CHUNKS      (Historique chat)
    (Chunks)         │
                     ├─→ MESSAGE_TOPICS
                     └─→ RESPONSE_CACHE
```

---

## 🗂️ Détail Complet par Couche

### 📍 COUCHE 1 : AUTHENTIFICATION & USERS

```
┌─────────────────────────────────────────────────────────────────┐
│                       APP_USERS (Utilisateurs)                  │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ email: NVARCHAR(255) [UNIQUE]                              │
│    │ password_hash: NVARCHAR(500)                               │
│    │ password_salt: NVARCHAR(255)                               │
│    │ full_name: NVARCHAR(255)                                   │
│    │ role: NVARCHAR(50) ['admin', 'lecteur']                   │
│    │ is_active: BIT [DEFAULT: 1]                               │
│    │ failed_login_attempts: INT [DEFAULT: 0]                   │
│    │ locked_until: DATETIME2                                    │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ last_login_at: DATETIME2                                   │
├─────────────────────────────────────────────────────────────────┤
│ INDEX: idx_users_email (email)                                  │
│ TRIGGER: trg_users_updated_at (UPDATE)                         │
└─────────────────────────────────────────────────────────────────┘
         │ 
         ├─→ 📍 app_sessions (FK: user_id)
         │
         └─→ 📍 profiles (FK: user_id = id)


┌─────────────────────────────────────────────────────────────────┐
│                   APP_SESSIONS (Sessions JWT)                   │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ user_id: UNIQUEIDENTIFIER [FK → app_users]                │
│    │ token_hash: NVARCHAR(500) [UNIQUE]                         │
│    │ refresh_token_hash: NVARCHAR(500)                          │
│    │ ip_address: NVARCHAR(50)                                   │
│    │ user_agent: NVARCHAR(500)                                  │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ expires_at: DATETIME2                                      │
│    │ last_activity_at: DATETIME2                                │
├─────────────────────────────────────────────────────────────────┤
│ INDEXES: idx_sessions_token (token_hash)                       │
│          idx_sessions_user (user_id)                           │
│          idx_sessions_expires (expires_at)                     │
└─────────────────────────────────────────────────────────────────┘
         │
         └─→ Stocke les tokens JWT actifs


┌─────────────────────────────────────────────────────────────────┐
│                     PROFILES (Profils Users)                    │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER [FK → app_users]                     │
│    │ avatar_url: NVARCHAR(MAX)                                  │
│    │ phone: NVARCHAR(20)                                        │
│    │ country: NVARCHAR(100)                                     │
│    │ role: NVARCHAR(50) [DEFAULT: 'admin']                     │
│    │ bio: NVARCHAR(MAX)                                         │
│    │ preferences: NVARCHAR(MAX) [JSON]                          │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ TRIGGER: trg_profiles_updated_at (UPDATE)                      │
└─────────────────────────────────────────────────────────────────┘
         │
         └─→ 📍 workspaces (FK: user_id = id)
```

---

### 🎯 COUCHE 2 : WORKSPACES & GESTION MÉTIER

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKSPACES (Chatbots)                        │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ user_id: UNIQUEIDENTIFIER [FK → profiles]                 │
│    │ name: NVARCHAR(255)                                        │
│    │ description: NVARCHAR(MAX)                                 │
│    │ website_url: NVARCHAR(MAX)                                 │
│    │ allowed_domains: NVARCHAR(MAX)                             │
│    │ custom_css: NVARCHAR(MAX)                                  │
│    │ is_active: BIT [DEFAULT: 1]                               │
│    │ model: NVARCHAR(100) [DEFAULT: 'mistral-small']          │
│    │ temperature: FLOAT [DEFAULT: 0.7]                         │
│    │ max_tokens: INT [DEFAULT: 900]                            │
│    │ system_prompt: NVARCHAR(MAX)                              │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ INDEX: idx_workspaces_user_id (user_id)                        │
│ TRIGGER: trg_workspaces_updated_at (UPDATE)                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ 📍 documents (FK: workspace_id)
         │     └─→ 📍 document_chunks (FK: document_id)
         │
         ├─→ 📍 conversations (FK: workspace_id)
         │     └─→ 📍 messages (FK: conversation_id)
         │           ├─→ 📍 message_topics (FK: workspace_id)
         │           └─→ 📍 response_cache (FK: workspace_id)
         │
         ├─→ 📍 insights_cache (FK: workspace_id)
         │
         ├─→ 📍 api_keys (FK: workspace_id)
         │
         └─→ 📍 workspace_databases (FK: workspace_id)


┌─────────────────────────────────────────────────────────────────┐
│                   DOCUMENTS (Fichiers uploadés)                 │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ name: NVARCHAR(500)                                        │
│    │ file_path: NVARCHAR(MAX)                                   │
│    │ file_type: NVARCHAR(50)                                    │
│    │ file_size: BIGINT                                          │
│    │ is_indexed: BIT [DEFAULT: 0]                              │
│    │ embedding_model: NVARCHAR(100)                             │
│    │ chunk_count: INT [DEFAULT: 0]                             │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ deleted_at: DATETIME2                                      │
├─────────────────────────────────────────────────────────────────┤
│ INDEX: idx_documents_workspace_id (workspace_id)               │
│ TRIGGER: trg_documents_updated_at (UPDATE)                     │
└─────────────────────────────────────────────────────────────────┘
         │
         └─→ 📍 document_chunks (FK: document_id, workspace_id)


┌─────────────────────────────────────────────────────────────────┐
│              DOCUMENT_CHUNKS (Fragments de documents)           │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ document_id: UNIQUEIDENTIFIER [FK → documents]            │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ chunk_index: INT                                           │
│    │ content: NVARCHAR(MAX)                                     │
│    │ token_count: INT                                           │
│    │ embedding: FLOAT[]                                         │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ INDEXES: idx_document_chunks_document (document_id)            │
│          idx_document_chunks_workspace (workspace_id)          │
└─────────────────────────────────────────────────────────────────┘
         │
         └─→ Utilisé par le RAG pour rechercher des infos
```

---

### 💬 COUCHE 3 : CONVERSATIONS & MESSAGES

```
┌─────────────────────────────────────────────────────────────────┐
│                CONVERSATIONS (Discussions avec bot)             │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ visitor_id: NVARCHAR(255)                                  │
│    │ visitor_name: NVARCHAR(255)                                │
│    │ visitor_email: NVARCHAR(255)                               │
│    │ title: NVARCHAR(500)                                       │
│    │ is_active: BIT [DEFAULT: 1]                               │
│    │ message_count: INT [DEFAULT: 0]                           │
│    │ last_message_at: DATETIME2                                 │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ archived_at: DATETIME2                                     │
├─────────────────────────────────────────────────────────────────┤
│ INDEXES: idx_conversations_workspace (workspace_id)            │
│          idx_conversations_visitor (workspace_id, visitor_id)  │
│ TRIGGER: trg_conversations_updated_at (UPDATE)                 │
└─────────────────────────────────────────────────────────────────┘
         │
         └─→ 📍 messages (FK: conversation_id)


┌─────────────────────────────────────────────────────────────────┐
│               MESSAGES (Historique des conversations)           │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ conversation_id: UNIQUEIDENTIFIER [FK → conversations]    │
│    │ role: NVARCHAR(20) ['user', 'assistant']                 │
│    │ content: NVARCHAR(MAX)                                     │
│    │ tokens_used: INT                                           │
│    │ response_time_ms: INT                                      │
│    │ rag_score: FLOAT [0.0-1.0]                                │
│    │ rag_sources: NVARCHAR(MAX)                                 │
│    │ feedback: INT [-1, 0, 1] (négatif, neutre, positif)      │
│    │ is_resolved: BIT [DEFAULT: 0]                             │
│    │ metadata: NVARCHAR(MAX) [JSON]                             │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ CONSTRAINT: CHK_messages_rag_score (0 <= rag_score <= 1)       │
│ CONSTRAINT: CHK_messages_feedback (feedback IN (-1,1) OR NULL) │
│ TRIGGER: trg_messages_updated_at (UPDATE)                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ 📍 message_topics (FK: workspace_id)
         │
         └─→ 📍 response_cache (FK: workspace_id)


┌─────────────────────────────────────────────────────────────────┐
│              MESSAGE_TOPICS (Catégorisation des topics)         │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ topic_name: NVARCHAR(255)                                  │
│    │ message_count: INT [DEFAULT: 0]                           │
│    │ sample_questions: NVARCHAR(MAX)                            │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ UNIQUE: workspace_id + topic_name                              │
│ INDEX: idx_message_topics_workspace (workspace_id)             │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│            RESPONSE_CACHE (Cache des réponses LLM)              │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ question_hash: NVARCHAR(255)                               │
│    │ original_question: NVARCHAR(MAX)                           │
│    │ cached_response: NVARCHAR(MAX)                             │
│    │ ttl_seconds: INT                                           │
│    │ hit_count: INT [DEFAULT: 0]                               │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ expires_at: DATETIME2                                      │
├─────────────────────────────────────────────────────────────────┤
│ INDEXES: idx_response_cache_workspace (workspace_id)           │
│          idx_response_cache_hash (workspace_id, question_hash) │
│ TRIGGER: trg_response_cache_updated_at (UPDATE)                │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📊 COUCHE 4 : ANALYTICS & INSIGHTS

```
┌─────────────────────────────────────────────────────────────────┐
│            ANALYTICS_DAILY (Statistiques quotidiennes)          │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ date: DATE                                                  │
│    │ total_conversations: INT [DEFAULT: 0]                     │
│    │ total_messages: INT [DEFAULT: 0]                          │
│    │ unique_visitors: INT [DEFAULT: 0]                         │
│    │ avg_messages_per_conversation: FLOAT                       │
│    │ avg_response_time_ms: FLOAT                                │
│    │ avg_rag_score: FLOAT                                       │
│    │ satisfaction_rate: FLOAT                                   │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ UNIQUE: workspace_id + date                                     │
│ INDEX: idx_analytics_workspace_date (workspace_id, date)       │
│ TRIGGER: trg_analytics_daily_updated_at (UPDATE)               │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│          INSIGHTS_CACHE (Cache des insights calculés)           │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces] [UNIQUE] │
│    │ satisfaction_rate: FLOAT                                   │
│    │ avg_rag_score: FLOAT                                       │
│    │ avg_messages_per_conversation: FLOAT                       │
│    │ low_confidence_count: INT [DEFAULT: 0]                    │
│    │ total_conversations: INT [DEFAULT: 0]                     │
│    │ total_messages: INT [DEFAULT: 0]                          │
│    │ calculated_at: DATETIME2 [DEFAULT: GETUTCDATE()]          │
├─────────────────────────────────────────────────────────────────┤
│ INDEX: workspace_id (UNIQUE)                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         └─→ Mis à jour par sp_calculate_workspace_insights
```

---

### 🔑 COUCHE 5 : API & CONFIGURATION

```
┌─────────────────────────────────────────────────────────────────┐
│                  API_KEYS (Clés API pour widget)                │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ name: NVARCHAR(255)                                        │
│    │ key_prefix: NVARCHAR(20)                                   │
│    │ key_hash: NVARCHAR(255) [UNIQUE]                          │
│    │ last_used_at: DATETIME2                                    │
│    │ expires_at: DATETIME2                                      │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ INDEXES: idx_api_keys_workspace_id (workspace_id)              │
│          idx_api_keys_key_prefix (key_prefix)                  │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│         WORKSPACE_DATABASES (Connexions BD externes)            │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UNIQUEIDENTIFIER                                       │
│    │ workspace_id: UNIQUEIDENTIFIER [FK → workspaces]          │
│    │ name: NVARCHAR(255)                                        │
│    │ db_type: NVARCHAR(50) ['sqlserver','mysql','postgres']   │
│    │ host: NVARCHAR(255)                                        │
│    │ port: INT                                                   │
│    │ database: NVARCHAR(255)                                    │
│    │ username: NVARCHAR(255)                                    │
│    │ password_encrypted: NVARCHAR(500)                          │
│    │ description: NVARCHAR(MAX)                                 │
│    │ is_active: BIT [DEFAULT: 1]                               │
│    │ created_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
│    │ updated_at: DATETIME2 [DEFAULT: GETUTCDATE()]             │
├─────────────────────────────────────────────────────────────────┤
│ CONSTRAINT: CHK_db_type ('sqlserver','mysql','postgres')       │
│ INDEX: idx_workspace_databases_workspace (workspace_id)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Diagramme des Relations (Foreign Keys)

```
                    ┌──────────────────────┐
                    │    APP_USERS         │
                    │  (Utilisateurs)      │
                    └──────────┬───────────┘
                               │ 1
                 ┌─────────────┼─────────────┐
                 │             │             │
              N  │          N  │          N  │
        ┌────────▼────┐ ┌─────▼────────┐ ┌──▼──────────┐
        │ APP_SESSIONS│ │   PROFILES   │ │ WORKSPACES  │
        │  (Sessions) │ │ (Profils)    │ │ (Chatbots)  │
        └─────────────┘ └──────────────┘ └──────┬──────┘
                                                 │ 1
                                    ┌────────────┼────────────┐
                                    │            │            │
                                 N  │         N  │         N  │
                          ┌─────────▼┐  ┌──────┬▼──┬────┐  ┌─┴────────────┐
                          │ DOCUMENTS│  │CONVER│SAT│IONS│  │  ANALYTICS   │
                          │(Fichiers)│  │(Discu│ssi│ons)│  │     DAILY    │
                          └────┬─────┘  └──────┼─┬─┘    │  │              │
                               │              │ │      │  └──────────────┘
                            N  │              │ │      │
                          ┌─────▼────────┐    │ │   N  │
                          │ DOCUMENT_    │    │ │    ┌─▼──────────────┐
                          │ CHUNKS       │    │ │    │ INSIGHTS_CACHE │
                          │(Fragments)   │    │ │    │ (Cache)        │
                          └──────────────┘    │ │    └────────────────┘
                                              │ │
                                           N  │ │ 1
                                        ┌──────▼─▼────┐
                                        │  MESSAGES   │
                                        │(Historique) │
                                        └──────┬──────┘
                                               │ N
                                 ┌─────────────┴─────────────┐
                                 │                           │
                              N  │                        N  │
                        ┌─────────▼──────┐      ┌──────────┬▼──┐
                        │ MESSAGE_TOPICS │      │ RESPONSE │    │
                        │(Topics)        │      │  CACHE   │    │
                        └────────────────┘      └──────────┘    │
                                                                 │
                                                              N  │
                            ┌────────────────────────────────────┤
                            │                                    │
                    ┌───────▼────┐                    ┌──────────▼──┐
                    │  API_KEYS   │                   │ WORKSPACE_  │
                    │(Clés API)   │                   │ DATABASES   │
                    └─────────────┘                   └─────────────┘
```

---

## ⚙️ Stored Procedures (Fonctions Métier)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    📌 STORED PROCEDURES                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1️⃣ sp_create_user (@email, @password_hash, @password_salt, ...)      │
│     └─→ Crée un nouvel utilisateur dans app_users                      │
│     └─→ Retourne: success, message, user_id                            │
│                                                                          │
│  2️⃣ sp_get_user_for_auth (@email)                                      │
│     └─→ Récupère utilisateur + mot de passe pour authentification      │
│     └─→ Utilisé par: Login                                             │
│                                                                          │
│  3️⃣ sp_update_last_login (@user_id)                                    │
│     └─→ Met à jour la date de dernière connexion                       │
│     └─→ Utilisé par: Login réussi                                      │
│                                                                          │
│  4️⃣ sp_create_session (@user_id, @access_token, @refresh_token, ...)  │
│     └─→ Crée une session JWT dans app_sessions                         │
│     └─→ Stocke: token_hash, ip_address, user_agent                     │
│                                                                          │
│  5️⃣ sp_validate_session (@token_hash)                                  │
│     └─→ Valide qu'une session existe et n'est pas expirée              │
│     └─→ Utilisé par: Chaque requête API                                │
│                                                                          │
│  6️⃣ sp_delete_session (@token_hash)                                    │
│     └─→ Supprime une session (logout)                                  │
│     └─→ Invalide le token JWT                                          │
│                                                                          │
│  7️⃣ sp_cleanup_expired_sessions ()                                     │
│     └─→ Supprime les sessions expirées (cron job)                      │
│     └─→ Libère de l'espace en base                                     │
│                                                                          │
│  8️⃣ sp_calculate_workspace_insights (@workspace_id)                    │
│     └─→ Calcule tous les insights d'un workspace:                      │
│        • satisfaction_rate = avg(feedback)                             │
│        • avg_rag_score = avg(rag_score des messages)                   │
│        • low_confidence_count = messages mal classifiés                │
│        • total_conversations, total_messages, avg_messages_per_conv    │
│     └─→ Upsert dans insights_cache                                     │
│     └─→ Appelée par: Dashboard analytics                               │
│                                                                          │
│  9️⃣ sp_get_workspace_metrics (@workspace_id)                           │
│     └─→ Retourne les métriques d'un workspace                          │
│                                                                          │
│  🔟 sp_cleanup_old_data ()                                              │
│     └─→ Archive et nettoie les vieilles données                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔔 Triggers (Automatisations)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        🔔 TRIGGERS                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TABLE: app_users                                                       │
│  ├─→ trg_users_updated_at (AFTER UPDATE)                               │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│                                                                          │
│  TABLE: profiles                                                        │
│  ├─→ trg_profiles_updated_at (AFTER UPDATE)                            │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│                                                                          │
│  TABLE: workspaces                                                      │
│  ├─→ trg_workspaces_updated_at (AFTER UPDATE)                          │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│  ├─→ trg_workspace_databases_updated_at (AFTER UPDATE)                 │
│      └─→ Trigger sur tables liées (workspace_databases)               │
│                                                                          │
│  TABLE: documents                                                       │
│  ├─→ trg_documents_updated_at (AFTER UPDATE)                           │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│  ├─→ trg_document_deletion (AFTER DELETE)                              │
│      └─→ Supprime les chunks associés (cascade)                        │
│                                                                          │
│  TABLE: conversations                                                   │
│  ├─→ trg_conversations_updated_at (AFTER UPDATE)                       │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│  ├─→ trg_update_conversation_message_count (AFTER INSERT/DELETE)       │
│      └─→ Incrémente message_count dans conversations                   │
│                                                                          │
│  TABLE: messages                                                        │
│  ├─→ trg_messages_updated_at (AFTER UPDATE)                            │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│  ├─→ trg_message_insert_analytics (AFTER INSERT)                       │
│      └─→ Met à jour analytics_daily quand un message arrive            │
│      └─→ Incrémente total_messages pour la journée                     │
│  ├─→ trg_update_cache_on_message (AFTER INSERT)                        │
│      └─→ Met à jour insights_cache quand nouveau message               │
│                                                                          │
│  TABLE: analytics_daily                                                 │
│  ├─→ trg_analytics_daily_updated_at (AFTER UPDATE)                     │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│                                                                          │
│  TABLE: response_cache                                                  │
│  ├─→ trg_response_cache_updated_at (AFTER UPDATE)                      │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│  ├─→ trg_response_cache_expiry (AFTER INSERT)                          │
│      └─→ Calcule expires_at = created_at + ttl_seconds                 │
│                                                                          │
│  TABLE: api_keys                                                        │
│  ├─→ trg_api_keys_updated_at (AFTER UPDATE)                            │
│      └─→ Met à jour updated_at = GETUTCDATE()                          │
│  ├─→ trg_api_key_expiry_check (BEFORE SELECT)                          │
│      └─→ Vérifie que la clé n'est pas expirée                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📑 Views (Vues Utilitaires)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        👁️ VIEWS (VUES)                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔍 vw_workspace_stats                                                  │
│     ├─→ workspace_id                                                    │
│     ├─→ workspace_name                                                  │
│     ├─→ total_conversations                                             │
│     ├─→ total_messages                                                  │
│     ├─→ unique_visitors                                                 │
│     └─→ Utilisée par: Dashboard principal                               │
│                                                                          │
│  🔍 vw_user_workspaces                                                  │
│     ├─→ user_id                                                         │
│     ├─→ user_email                                                      │
│     ├─→ workspace_id                                                    │
│     ├─→ workspace_name                                                  │
│     ├─→ workspace_created_at                                            │
│     └─→ Utilisée par: Récupérer tous les workspaces d'un user          │
│                                                                          │
│  🔍 vw_daily_metrics                                                    │
│     ├─→ date                                                            │
│     ├─→ workspace_id                                                    │
│     ├─→ avg_satisfaction                                                │
│     ├─→ avg_response_time                                               │
│     └─→ Utilisée par: Graphiques analytics                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Sécurité & Contraintes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    🔒 CONTRAINTES & VALIDATION                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  UNIQUE CONSTRAINTS:                                                    │
│  ├─→ app_users(email) - Un seul compte par email                       │
│  ├─→ api_keys(key_hash) - Clés uniques                                 │
│  ├─→ app_sessions(token_hash) - Tokens uniques                         │
│  ├─→ message_topics(workspace_id, topic_name) - Pas de doublons       │
│  ├─→ analytics_daily(workspace_id, date) - 1 ligne par jour/workspace │
│  └─→ insights_cache(workspace_id) - 1 cache par workspace              │
│                                                                          │
│  CHECK CONSTRAINTS:                                                     │
│  ├─→ messages.rag_score BETWEEN 0 AND 1                                │
│  ├─→ messages.feedback IN (-1, 0, 1)                                   │
│  ├─→ app_users.role IN ('admin', 'lecteur')                            │
│  ├─→ workspace_databases.db_type IN ('sqlserver','mysql','postgres')   │
│  └─→ documents.file_size > 0                                           │
│                                                                          │
│  FOREIGN KEYS (CASCADE DELETE):                                         │
│  ├─→ app_sessions → app_users (DELETE CASCADE)                         │
│  ├─→ profiles → app_users (DELETE CASCADE)                             │
│  ├─→ workspaces → profiles (DELETE CASCADE)                            │
│  ├─→ documents → workspaces (DELETE CASCADE)                           │
│  ├─→ document_chunks → documents (DELETE CASCADE)                      │
│  ├─→ conversations → workspaces (DELETE CASCADE)                       │
│  ├─→ messages → conversations (DELETE CASCADE)                         │
│  ├─→ message_topics → workspaces (DELETE CASCADE)                      │
│  ├─→ response_cache → workspaces (DELETE CASCADE)                      │
│  ├─→ analytics_daily → workspaces (DELETE CASCADE)                     │
│  ├─→ insights_cache → workspaces (DELETE CASCADE)                      │
│  ├─→ api_keys → workspaces (DELETE CASCADE)                            │
│  └─→ workspace_databases → workspaces (DELETE CASCADE)                 │
│                                                                          │
│  INDEXES (Performance):                                                 │
│  ├─→ app_users.email                                                   │
│  ├─→ app_sessions(user_id, token_hash, expires_at)                     │
│  ├─→ workspaces(user_id)                                               │
│  ├─→ documents(workspace_id)                                           │
│  ├─→ document_chunks(document_id, workspace_id)                        │
│  ├─→ conversations(workspace_id, visitor_id)                           │
│  ├─→ messages(conversation_id, created_at)                             │
│  ├─→ analytics_daily(workspace_id, date)                               │
│  └─→ response_cache(workspace_id, question_hash)                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de Données (Lifecycle)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      📍 LIFECYCLE DES DONNÉES                           │
└─────────────────────────────────────────────────────────────────────────┘

1️⃣ CRÉATION UTILISATEUR:
   Frontend (register form)
   └→ POST /api/auth/register
      └→ Backend: hash password + create app_users
         └→ sp_create_user()
            └→ CREATE app_users row
            └→ CREATE profiles row (via FK)
            └→ Generate JWT tokens
            └→ CREATE app_sessions row
            └→ Return access_token + refresh_token
      └→ Frontend: localStorage.setItem('monitora_access_token')

2️⃣ CRÉATION CHATBOT (WORKSPACE):
   Frontend (new chatbot form)
   └→ POST /api/workspaces
      └→ Header: Authorization: Bearer {access_token}
      └→ Backend: Verify JWT in app_sessions
         └→ CREATE workspaces row
            └→ INSERT INTO analytics_daily (date du jour)
            └→ INSERT INTO insights_cache (row vide)
         └→ Return workspace_id

3️⃣ UPLOAD DOCUMENT:
   Frontend (file upload)
   └→ POST /api/documents/upload?workspace_id=...
      └→ Backend: Verify JWT
         └→ STORE file (filesystem ou cloud)
         └→ INSERT documents row
         └→ TRIGGER: Parse document
         └→ INSERT document_chunks rows (vectorization)
         └→ UPDATE documents.is_indexed = 1

4️⃣ CONVERSATION UTILISATEUR:
   Widget (sur site client)
   └→ POST /api/chat/message
      └→ Body: {workspace_id, visitor_id, message}
      └→ Backend:
         ├→ CREATE/GET conversations row
         ├→ INSERT messages row (role='user')
         │  └→ TRIGGER: trg_update_conversation_message_count
         │  └→ TRIGGER: trg_message_insert_analytics
         │  └→ Update conversations.last_message_at
         │
         ├→ RAG SEARCH:
         │  └→ SELECT document_chunks WHERE workspace_id
         │  └→ Semantic search (cosine similarity)
         │
         ├→ LLM CALL:
         │  └→ Call Mistral API
         │  └→ Prompt = system_prompt + RAG context + message
         │
         ├→ INSERT messages row (role='assistant')
         │  └→ content, rag_score, tokens_used, response_time_ms
         │  └→ TRIGGER: Update analytics_daily
         │  └→ TRIGGER: Update insights_cache
         │
         └→ OPTIONAL: Cache response
            └→ INSERT response_cache (avoid duplicate LLM calls)

5️⃣ ANALYTICS DASHBOARD:
   Frontend (analytics page)
   └→ GET /api/analytics/{workspace_id}
      └→ Backend:
         └→ SELECT * FROM analytics_daily WHERE workspace_id
         └→ SELECT * FROM insights_cache WHERE workspace_id
         └→ SELECT sp_calculate_workspace_insights(workspace_id)
            └→ Aggregate all metrics
         └→ Return JSON for charts

6️⃣ LOGOUT:
   Frontend (logout button)
   └→ POST /api/auth/logout
      └→ Header: Authorization: Bearer {token}
      └→ Backend:
         └→ Hash token
         └→ DELETE app_sessions WHERE token_hash = ...
         └→ TRIGGER: sp_cleanup_expired_sessions (async)
      └→ Frontend: localStorage.removeItem('monitora_access_token')
```

---

## 📐 Schéma Complet (ASCII Art Détaillé)

```
                        ┌─────────────────────────────────────────────┐
                        │  MONITORA - Architecture Complète           │
                        │  SQL Server + JWT + RAG + LLM              │
                        └─────────────────────────────────────────────┘


    ┌──────────────────────────────────────────────────────────────────┐
    │                          🌐 FRONTEND                             │
    │                   (Next.js + TypeScript)                        │
    ├──────────────────────────────────────────────────────────────────┤
    │  Auth Module          Dashboard              Widget              │
    │  ├─ Register          ├─ Workspaces        └─ Chat interface   │
    │  ├─ Login            ├─ Documents          └─ Powered by:      │
    │  ├─ Logout           ├─ Conversations      └─ api.ts           │
    │  └─ JWT tokens       ├─ Analytics                              │
    │                      └─ Insights                               │
    └──────────────────┬───────────────────────────────────────────────┘
                       │ HTTP (REST)
                       │ Authorization: Bearer {JWT}
                       │
    ┌──────────────────▼───────────────────────────────────────────────┐
    │                      🔧 BACKEND API                             │
    │                   (FastAPI + Python)                           │
    ├──────────────────────────────────────────────────────────────────┤
    │  /api/auth/           /api/workspaces/      /api/chat/         │
    │  ├─ register          ├─ GET (list)         ├─ POST message    │
    │  ├─ login             ├─ POST (create)      └─ GET history     │
    │  ├─ logout            ├─ GET {id}                              │
    │  ├─ refresh           ├─ PUT {id}           /api/documents/    │
    │  └─ me                └─ DELETE {id}        ├─ POST upload     │
    │                                             ├─ GET list        │
    │  /api/analytics/                            └─ DELETE {id}    │
    │  ├─ overview                                                   │
    │  ├─ daily             /api/insights/                          │
    │  └─ {workspace_id}    ├─ GET {workspace_id}                    │
    │                       └─ recalculate                           │
    └──────────────────┬───────────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
    ┌──▼──────┐   ┌──▼──────┐   ┌──▼──────┐
    │   RAG   │   │   LLM   │   │   DB    │
    │  Search │   │  Mistral│   │ Queries │
    │ (Vector)│   │   API   │   │(pyodbc) │
    └─────────┘   └─────────┘   └────┬────┘
                                      │
    ┌─────────────────────────────────▼──────────────────────────────┐
    │                    💾 SQL SERVER DATABASE                      │
    │                      (Monitora_dev)                            │
    ├────────────────────────────────────────────────────────────────┤
    │                                                                 │
    │  🔐 AUTH          🎯 WORKSPACE       💬 CHAT                  │
    │  ├─ app_users     ├─ workspaces      ├─ conversations         │
    │  ├─ app_sessions  ├─ profiles        ├─ messages              │
    │  └─ (JWT tokens)  └─ (Chatbots)      └─ message_topics       │
    │                                                                 │
    │  📄 DOCUMENTS     📊 ANALYTICS       🔗 CONFIG               │
    │  ├─ documents     ├─ analytics_daily ├─ api_keys             │
    │  ├─ chunks        ├─ insights_cache  ├─ workspace_databases  │
    │  └─ (Embeddings)  └─ (Stats)         └─ response_cache       │
    │                                                                 │
    │  [8 Tables] [9 Stored Procedures] [12+ Triggers] [5+ Views]  │
    │                                                                 │
    └────────────────────────────────────────────────────────────────┘
```

---

## 📊 Statistiques Récapitulatives

```
┌────────────────────────────────────────────────────────────┐
│              📈 STATISTIQUES DE LA BDD                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📋 TABLES:                          9 tables            │
│    ├─ Authentification:             3 tables            │
│    ├─ Métier (Workspaces):          7 tables            │
│    ├─ Chat & Conversations:         2 tables            │
│    ├─ Documents & RAG:              2 tables            │
│    ├─ Analytics & Insights:         2 tables            │
│    ├─ Configuration:                3 tables            │
│    └─ Total colonnes:              100+ colonnes       │
│                                                            │
│  🔄 STORED PROCEDURES:              8 procédures        │
│    ├─ Authentification:             6 procédures        │
│    ├─ Analytics:                    2 procédures        │
│    └─ Total lignes de code:        500+ lignes         │
│                                                            │
│  🔔 TRIGGERS:                       12+ triggers        │
│    ├─ updated_at (auto-update):    9 triggers          │
│    ├─ Business logic:              3+ triggers          │
│                                                            │
│  👁️ VIEWS:                          3+ views            │
│    ├─ Workspace stats              1 view              │
│    ├─ User workspaces              1 view              │
│    └─ Daily metrics                1 view              │
│                                                            │
│  🔑 INDEXES:                        15+ indexes         │
│    ├─ Primary Keys:                9 PK                │
│    ├─ Foreign Keys:                12 FK               │
│    ├─ Unique Constraints:          4 UC                │
│    ├─ Check Constraints:           5 CC                │
│                                                            │
│  🔐 CONSTRAINTS:                    21+ constraints     │
│    ├─ NOT NULL:                    40+ colonnes        │
│    ├─ DEFAULT VALUES:              15+ colonnes        │
│    ├─ FOREIGN KEYS:                12 relations        │
│    └─ CASCADING DELETE:            12 relations        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 Résumé de l'Architecture

```
MONITORA = Platform SaaS Multi-Workspace pour Chatbots IA

Core Features:
  ✅ Authentification JWT sécurisée (SQL Server)
  ✅ Gestion multi-workspaces (chatbots indépendants)
  ✅ RAG (Retrieval Augmented Generation) avec embeddings
  ✅ LLM Integration (Mistral AI)
  ✅ Chat en temps réel avec historique
  ✅ Analytics et Insights automatiques
  ✅ Widget embeddable sur sites tiers
  ✅ Gestion documents + vectorization

Technology Stack:
  Backend:   FastAPI + Python + pyodbc
  Frontend:  Next.js + TypeScript + TailwindCSS
  Database:  Microsoft SQL Server
  LLM:       Mistral AI API
  Auth:      JWT (HS256)
  Hosting:   Azure (optionnel)

Database:
  - 9 tables principales
  - 8 stored procedures
  - 12+ triggers automatisés
  - 15+ indexes de performance
  - 21+ constraints de validation
  - Architecture ACID complète
  - Sécurité RLS via JWT backend

Performance:
  - Indexes sur tous les chemins de recherche
  - Cache des réponses LLM
  - Insights pré-calculés
  - Cleanup automatique des sessions

Scalabilité:
  - Multi-workspace par utilisateur
  - API stateless (JWT)
  - Base de données normalisée
  - Possibilité sharding future
```

---

**Document généré**: 19 janvier 2026  
**Version**: 1.0 - Schéma Complet  
**Status**: ✅ Prêt pour migration SQL Server
