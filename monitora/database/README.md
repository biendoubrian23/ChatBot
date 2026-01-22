# Supabase - Configuration Base de Données

## Description
Schéma de la base de données PostgreSQL hébergée sur Supabase.
Inclut les tables, RLS policies, et fonctions.

---

## Configuration Supabase

### URL du projet
```
https://pokobirrjcckebnvrlmn.supabase.co
```

### Clés
- **anon/public** : Pour le frontend (lecture limitée)
- **service_role** : Pour le backend (accès complet)

---

## Tables à créer

### `workspaces`
Un workspace = un site/chatbot configuré.

```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT, -- domaine autorisé pour le widget
    api_key TEXT UNIQUE DEFAULT gen_random_uuid(),
    settings JSONB DEFAULT '{
        "color_accent": "#000000",
        "position": "bottom-right",
        "welcome_message": "Bonjour ! Comment puis-je vous aider ?",
        "chatbot_name": "Assistant"
    }',
    rag_config JSONB DEFAULT '{
        "temperature": 0.1,
        "max_tokens": 900,
        "top_k": 8,
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "llm_model": "mistral-small-latest"
    }',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `documents`
Documents uploadés par workspace.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'indexing', 'indexed', 'error'
    chunks_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    indexed_at TIMESTAMPTZ
);
```

---

### `conversations`
Conversations des visiteurs.

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    visitor_id TEXT, -- fingerprint ou session ID
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    messages_count INTEGER DEFAULT 0,
    satisfaction INTEGER CHECK (satisfaction >= 1 AND satisfaction <= 5)
);
```

---

### `messages`
Messages d'une conversation.

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB, -- sources utilisées pour la réponse
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `analytics_daily`
Statistiques agrégées par jour (pour performance).

```sql
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    conversations_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    unique_visitors INTEGER DEFAULT 0,
    UNIQUE(workspace_id, date)
);
```

---

## Row Level Security (RLS)

### Workspaces
```sql
-- Users can only see their own workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspaces" ON workspaces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces" ON workspaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces" ON workspaces
    FOR DELETE USING (auth.uid() = user_id);
```

### Documents
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents of own workspaces" ON documents
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );
```

### Conversations & Messages
```sql
-- Similar policies for conversations and messages
```

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX idx_conversations_workspace_id ON conversations(workspace_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_analytics_workspace_date ON analytics_daily(workspace_id, date);
```

---

## Étapes d'implémentation

1. [ ] Se connecter à Supabase Dashboard
2. [ ] Créer la table `workspaces`
3. [ ] Créer la table `documents`
4. [ ] Créer la table `conversations`
5. [ ] Créer la table `messages`
6. [ ] Créer la table `analytics_daily`
7. [ ] Activer RLS sur toutes les tables
8. [ ] Créer les policies
9. [ ] Créer les indexes
10. [ ] Tester les policies avec un user test
