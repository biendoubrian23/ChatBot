-- =====================================================
-- MIGRATION: Ajout des colonnes pour les Insights
-- =====================================================
-- Exécuter ce script dans l'éditeur SQL de Supabase
-- =====================================================

-- Ajouter le score RAG sur les messages (confiance de la réponse)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS rag_score REAL CHECK (rag_score IS NULL OR (rag_score >= 0 AND rag_score <= 1));

-- Ajouter le feedback utilisateur sur les messages (1 = 👍, -1 = 👎, NULL = pas de vote)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS feedback SMALLINT CHECK (feedback IS NULL OR feedback IN (-1, 1));

-- Ajouter une colonne pour marquer si la question a été "résolue" (ajoutée à la doc)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Ajouter les sources (documents utilisés pour la réponse)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sources JSONB;

-- =====================================================
-- AJOUT: visitor_id sur conversations (fingerprint)
-- =====================================================
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS visitor_id TEXT;

-- Ajouter messages_count sur conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS messages_count INTEGER DEFAULT 0;

-- Index pour retrouver les conversations d'un visiteur
CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(workspace_id, visitor_id);

-- =====================================================
-- TABLE: message_topics
-- Classification des questions par sujet (job batch)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    topic_name TEXT NOT NULL,
    message_count INTEGER DEFAULT 1,
    sample_questions TEXT[], -- exemples de questions dans ce sujet
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, topic_name)
);

-- Index pour la recherche
CREATE INDEX IF NOT EXISTS idx_message_topics_workspace ON message_topics(workspace_id);

-- =====================================================
-- TABLE: insights_cache  
-- Cache des insights calculés (évite de recalculer à chaque requête)
-- =====================================================
CREATE TABLE IF NOT EXISTS insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    satisfaction_rate REAL, -- pourcentage de 👍
    avg_rag_score REAL, -- score moyen de confiance
    avg_messages_per_conversation REAL,
    low_confidence_count INTEGER, -- nombre de questions avec score < 0.5
    total_conversations INTEGER,
    total_messages INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pour les nouvelles tables
ALTER TABLE message_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;

-- Policies basées sur workspace ownership
CREATE POLICY "Users can view own message_topics" ON message_topics
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own insights_cache" ON insights_cache
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- FONCTION: Recalculer les insights d'un workspace
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_workspace_insights(p_workspace_id UUID)
RETURNS void AS $$
DECLARE
    v_satisfaction_rate REAL;
    v_avg_rag_score REAL;
    v_avg_messages REAL;
    v_low_confidence INTEGER;
    v_total_conversations INTEGER;
    v_total_messages INTEGER;
BEGIN
    -- Calculer le taux de satisfaction (% de 👍 parmi les votes)
    SELECT 
        CASE 
            WHEN COUNT(*) FILTER (WHERE feedback IS NOT NULL) > 0 
            THEN (COUNT(*) FILTER (WHERE feedback = 1)::REAL / COUNT(*) FILTER (WHERE feedback IS NOT NULL)::REAL) * 100
            ELSE NULL 
        END
    INTO v_satisfaction_rate
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = p_workspace_id AND m.role = 'assistant';

    -- Score RAG moyen
    SELECT AVG(rag_score)
    INTO v_avg_rag_score
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = p_workspace_id AND m.role = 'assistant' AND m.rag_score IS NOT NULL;

    -- Nombre de questions à faible confiance
    SELECT COUNT(*)
    INTO v_low_confidence
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = p_workspace_id 
      AND m.role = 'assistant' 
      AND m.rag_score IS NOT NULL 
      AND m.rag_score < 0.5
      AND m.is_resolved = FALSE;

    -- Conversations totales
    SELECT COUNT(*) INTO v_total_conversations
    FROM conversations WHERE workspace_id = p_workspace_id;

    -- Messages totaux
    SELECT COUNT(*) INTO v_total_messages
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.workspace_id = p_workspace_id;

    -- Messages par conversation en moyenne
    v_avg_messages := CASE 
        WHEN v_total_conversations > 0 
        THEN v_total_messages::REAL / v_total_conversations 
        ELSE 0 
    END;

    -- Upsert dans le cache
    INSERT INTO insights_cache (
        workspace_id, satisfaction_rate, avg_rag_score, avg_messages_per_conversation,
        low_confidence_count, total_conversations, total_messages, calculated_at
    ) VALUES (
        p_workspace_id, v_satisfaction_rate, v_avg_rag_score, v_avg_messages,
        v_low_confidence, v_total_conversations, v_total_messages, NOW()
    )
    ON CONFLICT (workspace_id) DO UPDATE SET
        satisfaction_rate = EXCLUDED.satisfaction_rate,
        avg_rag_score = EXCLUDED.avg_rag_score,
        avg_messages_per_conversation = EXCLUDED.avg_messages_per_conversation,
        low_confidence_count = EXCLUDED.low_confidence_count,
        total_conversations = EXCLUDED.total_conversations,
        total_messages = EXCLUDED.total_messages,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
