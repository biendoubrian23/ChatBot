-- =============================================================================
-- MONITORA - Schema de Base de Données Supabase
-- Version 1.0 - 5 Janvier 2026
-- =============================================================================
-- Ce fichier contient toutes les tables, indexes, policies RLS et triggers
-- pour la plateforme MONITORA de gestion de chatbots.
-- =============================================================================

-- =============================================================================
-- 1. EXTENSION ET CONFIGURATION
-- =============================================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour les fonctions cryptographiques
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TABLES PRINCIPALES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: organizations
-- Description: Comptes/entreprises qui utilisent MONITORA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    max_workspaces INTEGER DEFAULT 3,
    max_documents_per_workspace INTEGER DEFAULT 50,
    max_conversations_per_month INTEGER DEFAULT 1000,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche par slug
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- -----------------------------------------------------------------------------
-- Table: users
-- Description: Utilisateurs liés à auth.users de Supabase
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche par organization
CREATE INDEX idx_users_organization ON public.users(organization_id);
CREATE INDEX idx_users_email ON public.users(email);

-- -----------------------------------------------------------------------------
-- Table: workspaces
-- Description: Un workspace = un site/chatbot configuré
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT, -- Domaine autorisé (ex: example.com)
    allowed_origins TEXT[] DEFAULT '{}', -- Liste des origines autorisées
    api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    
    -- Configuration du chatbot
    settings JSONB DEFAULT '{
        "bot_name": "Assistant",
        "welcome_message": "Bonjour ! Comment puis-je vous aider ?",
        "placeholder": "Tapez votre message...",
        "primary_color": "#000000",
        "position": "bottom-right",
        "language": "fr"
    }',
    
    -- Configuration du backend RAG
    backend_url TEXT,
    backend_api_key TEXT,
    
    -- État
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    
    -- Statistiques cachées
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche
CREATE INDEX idx_workspaces_organization ON public.workspaces(organization_id);
CREATE INDEX idx_workspaces_api_key ON public.workspaces(api_key);
CREATE INDEX idx_workspaces_domain ON public.workspaces(domain);

-- -----------------------------------------------------------------------------
-- Table: documents
-- Description: Documents sources uploadés pour le RAG
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Métadonnées fichier
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Chemin dans Supabase Storage
    file_type TEXT NOT NULL, -- 'pdf', 'txt', 'md', 'docx'
    file_size INTEGER NOT NULL, -- Taille en bytes
    mime_type TEXT,
    
    -- État d'indexation
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'indexing', 'indexed', 'error', 'deleted')),
    error_message TEXT,
    chunks_count INTEGER DEFAULT 0,
    
    -- Métadonnées d'indexation
    indexed_at TIMESTAMPTZ,
    indexing_started_at TIMESTAMPTZ,
    
    -- Qui a uploadé
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche
CREATE INDEX idx_documents_workspace ON public.documents(workspace_id);
CREATE INDEX idx_documents_status ON public.documents(status);

-- -----------------------------------------------------------------------------
-- Table: conversations
-- Description: Sessions de chat entre visiteurs et le chatbot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Identification visiteur (anonyme)
    visitor_id TEXT NOT NULL, -- Fingerprint ou session ID
    visitor_ip TEXT, -- Pour analytics géographiques
    visitor_country TEXT,
    visitor_city TEXT,
    user_agent TEXT,
    
    -- Métadonnées de session
    page_url TEXT, -- URL où le chat a été ouvert
    referrer TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Statistiques
    messages_count INTEGER DEFAULT 0,
    user_messages_count INTEGER DEFAULT 0,
    bot_messages_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    
    -- Feedback
    satisfaction INTEGER CHECK (satisfaction >= 1 AND satisfaction <= 5),
    feedback_text TEXT,
    
    -- État
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche et analytics
CREATE INDEX idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX idx_conversations_visitor ON public.conversations(visitor_id);
CREATE INDEX idx_conversations_started_at ON public.conversations(started_at);
CREATE INDEX idx_conversations_status ON public.conversations(status);

-- -----------------------------------------------------------------------------
-- Table: messages
-- Description: Messages individuels dans une conversation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    
    -- Contenu
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- Métadonnées RAG (pour les réponses bot)
    sources JSONB, -- Documents/chunks utilisés pour la réponse
    confidence_score FLOAT,
    response_time_ms INTEGER,
    
    -- Tokens (pour tracking coûts)
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    
    -- Feedback par message
    is_helpful BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_role ON public.messages(role);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Index full-text pour la recherche dans les messages
CREATE INDEX idx_messages_content_search ON public.messages USING gin(to_tsvector('french', content));

-- -----------------------------------------------------------------------------
-- Table: analytics_daily
-- Description: Statistiques agrégées par jour pour performance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Métriques conversations
    conversations_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    returning_visitors INTEGER DEFAULT 0,
    
    -- Métriques messages
    messages_count INTEGER DEFAULT 0,
    user_messages_count INTEGER DEFAULT 0,
    bot_messages_count INTEGER DEFAULT 0,
    
    -- Performance
    avg_response_time_ms INTEGER,
    avg_messages_per_conversation FLOAT,
    avg_conversation_duration_seconds INTEGER,
    
    -- Satisfaction
    satisfaction_sum INTEGER DEFAULT 0,
    satisfaction_count INTEGER DEFAULT 0,
    
    -- Tokens/Coûts
    total_tokens INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id, date)
);

-- Index pour la recherche temporelle
CREATE INDEX idx_analytics_daily_workspace_date ON public.analytics_daily(workspace_id, date);

-- -----------------------------------------------------------------------------
-- Table: analytics_questions
-- Description: Questions les plus posées (agrégées)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    question_pattern TEXT NOT NULL, -- Question normalisée
    sample_question TEXT, -- Exemple de question réelle
    occurrences INTEGER DEFAULT 1,
    
    -- Performance sur cette question
    avg_satisfaction FLOAT,
    avg_response_time_ms INTEGER,
    
    first_asked_at TIMESTAMPTZ DEFAULT NOW(),
    last_asked_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les top questions
CREATE INDEX idx_analytics_questions_workspace ON public.analytics_questions(workspace_id);
CREATE INDEX idx_analytics_questions_occurrences ON public.analytics_questions(occurrences DESC);

-- -----------------------------------------------------------------------------
-- Table: invitations
-- Description: Invitations pour rejoindre une organisation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_invitations_organization ON public.invitations(organization_id);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);

-- -----------------------------------------------------------------------------
-- Table: audit_logs
-- Description: Journal d'audit pour traçabilité
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    entity_type TEXT NOT NULL, -- 'workspace', 'document', 'user', etc.
    entity_id UUID,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address TEXT,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche
CREATE INDEX idx_audit_logs_organization ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =============================================================================
-- 3. FONCTIONS ET TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fonction: update_updated_at_column
-- Description: Met à jour automatiquement updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at
    BEFORE UPDATE ON public.analytics_daily
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_questions_updated_at
    BEFORE UPDATE ON public.analytics_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Fonction: handle_new_user
-- Description: Crée automatiquement l'entrée users lors de l'inscription
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_slug TEXT;
BEGIN
    -- Générer un slug unique pour l'organisation
    org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
    org_slug := org_slug || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    
    -- Créer une nouvelle organisation pour l'utilisateur
    INSERT INTO public.organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
        org_slug
    )
    RETURNING id INTO new_org_id;
    
    -- Créer l'entrée utilisateur
    INSERT INTO public.users (id, organization_id, email, full_name, role)
    VALUES (
        NEW.id,
        new_org_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'owner'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users pour auto-créer l'utilisateur
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Fonction: increment_workspace_stats
-- Description: Met à jour les stats du workspace après un message
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_workspace_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'user' THEN
        UPDATE public.workspaces
        SET total_messages = total_messages + 1
        WHERE id = (
            SELECT workspace_id FROM public.conversations WHERE id = NEW.conversation_id
        );
    ELSIF NEW.role = 'assistant' THEN
        UPDATE public.workspaces
        SET total_messages = total_messages + 1
        WHERE id = (
            SELECT workspace_id FROM public.conversations WHERE id = NEW.conversation_id
        );
    END IF;
    
    -- Mettre à jour le compteur de messages de la conversation
    UPDATE public.conversations
    SET 
        messages_count = messages_count + 1,
        user_messages_count = CASE WHEN NEW.role = 'user' THEN user_messages_count + 1 ELSE user_messages_count END,
        bot_messages_count = CASE WHEN NEW.role = 'assistant' THEN bot_messages_count + 1 ELSE bot_messages_count END,
        last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.increment_workspace_stats();

-- -----------------------------------------------------------------------------
-- Fonction: increment_conversation_count
-- Description: Met à jour le compteur de conversations du workspace
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_conversation_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.workspaces
    SET total_conversations = total_conversations + 1
    WHERE id = NEW.workspace_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_conversation_created
    AFTER INSERT ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.increment_conversation_count();

-- -----------------------------------------------------------------------------
-- Fonction: generate_api_key
-- Description: Génère une nouvelle clé API pour un workspace
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_api_key(workspace_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_key TEXT;
BEGIN
    new_key := 'ws_' || encode(gen_random_bytes(24), 'hex');
    
    UPDATE public.workspaces
    SET api_key = new_key, updated_at = NOW()
    WHERE id = workspace_id;
    
    RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Policies: organizations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their organization"
    ON public.organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- -----------------------------------------------------------------------------
-- Policies: users
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view members of their organization"
    ON public.users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- Policies: workspaces
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view workspaces of their organization"
    ON public.workspaces FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Admins can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Admins can delete workspaces"
    ON public.workspaces FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- -----------------------------------------------------------------------------
-- Policies: documents
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view documents of their workspaces"
    ON public.documents FOR SELECT
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can upload documents"
    ON public.documents FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid() AND u.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can update documents"
    ON public.documents FOR UPDATE
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid() AND u.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can delete documents"
    ON public.documents FOR DELETE
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid() AND u.role IN ('owner', 'admin', 'member')
        )
    );

-- -----------------------------------------------------------------------------
-- Policies: conversations
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view conversations of their workspaces"
    ON public.conversations FOR SELECT
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Policy pour permettre l'insertion depuis le widget (anonyme)
CREATE POLICY "Widget can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Widget can update conversations"
    ON public.conversations FOR UPDATE
    USING (true);

-- -----------------------------------------------------------------------------
-- Policies: messages
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view messages of their conversations"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT c.id FROM public.conversations c
            JOIN public.workspaces w ON c.workspace_id = w.id
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Policy pour permettre l'insertion depuis le widget (anonyme)
CREATE POLICY "Widget can create messages"
    ON public.messages FOR INSERT
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Policies: analytics_daily
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view analytics of their workspaces"
    ON public.analytics_daily FOR SELECT
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- Policies: analytics_questions
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view question analytics of their workspaces"
    ON public.analytics_questions FOR SELECT
    USING (
        workspace_id IN (
            SELECT w.id FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- Policies: invitations
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can view invitations"
    ON public.invitations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can create invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete invitations"
    ON public.invitations FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- -----------------------------------------------------------------------------
-- Policies: audit_logs
-- -----------------------------------------------------------------------------
CREATE POLICY "Owners can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- =============================================================================
-- 5. STORAGE BUCKETS (pour les documents)
-- =============================================================================

-- Créer le bucket pour les documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy pour l'upload de documents
CREATE POLICY "Users can upload documents to their workspaces"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Policy pour voir les documents
CREATE POLICY "Users can view documents of their workspaces"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Policy pour supprimer les documents
CREATE POLICY "Users can delete documents of their workspaces"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] IN (
            SELECT w.id::text FROM public.workspaces w
            JOIN public.users u ON w.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- =============================================================================
-- 6. VUES UTILES
-- =============================================================================

-- Vue: workspace_stats - Statistiques résumées par workspace
CREATE OR REPLACE VIEW public.workspace_stats AS
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.organization_id,
    w.total_conversations,
    w.total_messages,
    w.is_active,
    (SELECT COUNT(*) FROM public.documents WHERE workspace_id = w.id AND status = 'indexed') as documents_indexed,
    (SELECT COUNT(*) FROM public.conversations WHERE workspace_id = w.id AND started_at > NOW() - INTERVAL '24 hours') as conversations_today,
    (SELECT COUNT(*) FROM public.conversations WHERE workspace_id = w.id AND started_at > NOW() - INTERVAL '7 days') as conversations_week
FROM public.workspaces w;

-- Vue: organization_overview - Vue d'ensemble pour le dashboard
CREATE OR REPLACE VIEW public.organization_overview AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.plan,
    (SELECT COUNT(*) FROM public.workspaces WHERE organization_id = o.id) as workspaces_count,
    (SELECT COUNT(*) FROM public.users WHERE organization_id = o.id) as members_count,
    (SELECT COALESCE(SUM(total_conversations), 0) FROM public.workspaces WHERE organization_id = o.id) as total_conversations,
    (SELECT COALESCE(SUM(total_messages), 0) FROM public.workspaces WHERE organization_id = o.id) as total_messages
FROM public.organizations o;

-- =============================================================================
-- 7. DONNÉES INITIALES (optionnel - pour tests)
-- =============================================================================

-- Aucune donnée initiale - sera créée via l'application

-- =============================================================================
-- 8. TABLE WORKSPACE_RAG_CONFIG - Configuration RAG par workspace
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: workspace_rag_config
-- Description: Paramètres RAG personnalisables par workspace
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_rag_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Configuration LLM
    llm_provider TEXT DEFAULT 'mistral' CHECK (llm_provider IN ('mistral', 'groq', 'openai', 'ollama')),
    llm_model TEXT DEFAULT 'mistral-small-latest',
    temperature DECIMAL(3,2) DEFAULT 0.10 CHECK (temperature >= 0 AND temperature <= 1),
    max_tokens INTEGER DEFAULT 900 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
    top_p DECIMAL(3,2) DEFAULT 1.00 CHECK (top_p >= 0 AND top_p <= 1),
    
    -- Configuration Chunking
    chunk_size INTEGER DEFAULT 1500 CHECK (chunk_size >= 500 AND chunk_size <= 3000),
    chunk_overlap INTEGER DEFAULT 300 CHECK (chunk_overlap >= 50 AND chunk_overlap <= 500),
    
    -- Configuration Retrieval
    top_k INTEGER DEFAULT 8 CHECK (top_k >= 3 AND top_k <= 15),
    rerank_top_n INTEGER DEFAULT 5 CHECK (rerank_top_n >= 2 AND rerank_top_n <= 10),
    
    -- Configuration Cache
    enable_cache BOOLEAN DEFAULT true,
    cache_ttl INTEGER DEFAULT 7200, -- secondes (2 heures)
    similarity_threshold DECIMAL(3,2) DEFAULT 0.92 CHECK (similarity_threshold >= 0.80 AND similarity_threshold <= 0.98),
    
    -- Configuration Embedding (fixe pour tous mais stocké)
    embedding_model TEXT DEFAULT 'intfloat/multilingual-e5-large',
    
    -- System prompt personnalisé
    system_prompt TEXT DEFAULT 'Tu es un assistant virtuel serviable et précis. Réponds aux questions en utilisant uniquement les informations fournies dans le contexte. Si tu ne connais pas la réponse, dis-le clairement.',
    
    -- Prompt templates
    context_template TEXT DEFAULT 'Voici les informations pertinentes:\n\n{context}\n\nQuestion: {question}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_workspace_rag_config_workspace ON public.workspace_rag_config(workspace_id);

-- Trigger pour updated_at
CREATE TRIGGER update_workspace_rag_config_updated_at
    BEFORE UPDATE ON public.workspace_rag_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policy
ALTER TABLE public.workspace_rag_config ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir la config de leurs workspaces
CREATE POLICY "Users can view their workspace rag config"
    ON public.workspace_rag_config
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            JOIN public.users u ON u.organization_id = w.organization_id
            WHERE w.id = workspace_rag_config.workspace_id
            AND u.id = auth.uid()
        )
    );

-- Policy: Les admins/owners peuvent modifier la config
CREATE POLICY "Admins can update workspace rag config"
    ON public.workspace_rag_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            JOIN public.users u ON u.organization_id = w.organization_id
            WHERE w.id = workspace_rag_config.workspace_id
            AND u.id = auth.uid()
            AND u.role IN ('owner', 'admin')
        )
    );

-- Fonction pour créer automatiquement la config RAG lors de la création d'un workspace
CREATE OR REPLACE FUNCTION public.create_default_rag_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_rag_config (workspace_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer la config RAG automatiquement
CREATE TRIGGER on_workspace_created_create_rag_config
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_rag_config();

-- =============================================================================
-- FIN DU SCHEMA
-- =============================================================================
