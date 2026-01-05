-- =====================================================
-- MONITORA - Schéma Base de Données Supabase
-- =====================================================
-- Exécuter ce script dans l'éditeur SQL de Supabase
-- =====================================================

-- =====================================================
-- TABLE: profiles
-- Profils utilisateurs (lié à auth.users)
-- Créé automatiquement à l'inscription
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    workspaces_limit INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: créer profil quand un user s'inscrit
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TABLE: workspaces
-- Un workspace = un chatbot pour un site
-- =====================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT, -- domaine autorisé pour le widget (optionnel)
    api_key TEXT UNIQUE DEFAULT gen_random_uuid(),
    settings JSONB DEFAULT '{
        "color_accent": "#000000",
        "position": "bottom-right",
        "welcome_message": "Bonjour ! Comment puis-je vous aider ?",
        "chatbot_name": "Assistant"
    }'::jsonb,
    rag_config JSONB DEFAULT '{
        "temperature": 0.1,
        "max_tokens": 900,
        "top_k": 8,
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "llm_model": "mistral-small-latest"
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: documents
-- Documents uploadés par workspace
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'indexing', 'indexed', 'error')),
    chunks_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    indexed_at TIMESTAMPTZ
);

-- =====================================================
-- TABLE: conversations
-- Conversations des visiteurs
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    visitor_id TEXT, -- fingerprint ou session ID du visiteur
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    messages_count INTEGER DEFAULT 0,
    satisfaction INTEGER CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 5))
);

-- =====================================================
-- TABLE: messages
-- Messages d'une conversation
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB, -- sources utilisées pour la réponse
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: analytics_daily
-- Statistiques agrégées par jour (pour performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    conversations_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    unique_visitors INTEGER DEFAULT 0,
    UNIQUE(workspace_id, date)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_api_key ON workspaces(api_key);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_workspace_date ON analytics_daily(workspace_id, date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: profiles
-- =====================================================
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- POLICIES: workspaces
-- =====================================================
CREATE POLICY "Users can view own workspaces" ON workspaces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces" ON workspaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces" ON workspaces
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: documents
-- =====================================================
CREATE POLICY "Users can manage documents of own workspaces" ON documents
    FOR ALL USING (
        workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
    );

-- =====================================================
-- POLICIES: conversations
-- =====================================================
CREATE POLICY "Users can view conversations of own workspaces" ON conversations
    FOR SELECT USING (
        workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
    );

-- Service role can insert (pour le widget)
CREATE POLICY "Service can insert conversations" ON conversations
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- POLICIES: messages
-- =====================================================
CREATE POLICY "Users can view messages of own workspaces" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT c.id FROM conversations c
            JOIN workspaces w ON c.workspace_id = w.id
            WHERE w.user_id = auth.uid()
        )
    );

-- Service role can insert (pour le widget)
CREATE POLICY "Service can insert messages" ON messages
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- POLICIES: analytics_daily
-- =====================================================
CREATE POLICY "Users can view analytics of own workspaces" ON analytics_daily
    FOR SELECT USING (
        workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
    );

-- Service role can manage (pour le backend)
CREATE POLICY "Service can manage analytics" ON analytics_daily
    FOR ALL USING (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger sur workspaces
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour incrémenter le compteur de messages
CREATE OR REPLACE FUNCTION increment_messages_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET messages_count = messages_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger sur messages
CREATE TRIGGER increment_messages_count_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_messages_count();
