-- =====================================================
-- Migration SQL pour Supabase
-- Table : workspace_databases
-- Permet de stocker la configuration des BDD externes
-- =====================================================

-- Créer la table workspace_databases
CREATE TABLE IF NOT EXISTS workspace_databases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Configuration de connexion
    db_type VARCHAR(50) DEFAULT 'sqlserver',  -- sqlserver, mysql, postgres
    db_host VARCHAR(255) NOT NULL,
    db_port INTEGER DEFAULT 1433,
    db_name VARCHAR(255) NOT NULL,
    db_user VARCHAR(255) NOT NULL,
    db_password_encrypted TEXT NOT NULL,
    
    -- Configuration du schéma
    schema_type VARCHAR(50) DEFAULT 'coollibri',  -- coollibri, chrono24, generic
    
    -- État
    is_enabled BOOLEAN DEFAULT FALSE,
    last_test_at TIMESTAMPTZ,
    last_test_status VARCHAR(50),  -- success, failed
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte d'unicité (un workspace = une config)
    UNIQUE(workspace_id)
);

-- Index pour recherche rapide par workspace
CREATE INDEX IF NOT EXISTS idx_workspace_databases_workspace_id 
ON workspace_databases(workspace_id);

-- Index pour les BDD actives
CREATE INDEX IF NOT EXISTS idx_workspace_databases_enabled 
ON workspace_databases(is_enabled) WHERE is_enabled = TRUE;

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_workspace_databases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_workspace_databases_updated_at ON workspace_databases;
CREATE TRIGGER trigger_workspace_databases_updated_at
    BEFORE UPDATE ON workspace_databases
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_databases_updated_at();

-- RLS (Row Level Security) pour sécuriser l'accès
ALTER TABLE workspace_databases ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs ne voient que les configs de leurs workspaces
CREATE POLICY "Users can view their workspace database configs"
ON workspace_databases FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
);

-- Politique : les utilisateurs peuvent créer des configs pour leurs workspaces
CREATE POLICY "Users can insert their workspace database configs"
ON workspace_databases FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
);

-- Politique : les utilisateurs peuvent modifier les configs de leurs workspaces
CREATE POLICY "Users can update their workspace database configs"
ON workspace_databases FOR UPDATE
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
);

-- Politique : les utilisateurs peuvent supprimer les configs de leurs workspaces
CREATE POLICY "Users can delete their workspace database configs"
ON workspace_databases FOR DELETE
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
);

-- Commentaires sur la table
COMMENT ON TABLE workspace_databases IS 'Configuration des bases de données externes pour le suivi des commandes par chatbot';
COMMENT ON COLUMN workspace_databases.db_type IS 'Type de BDD: sqlserver, mysql, postgres';
COMMENT ON COLUMN workspace_databases.schema_type IS 'Type de schéma de données: coollibri, chrono24, generic';
COMMENT ON COLUMN workspace_databases.db_password_encrypted IS 'Mot de passe encodé en base64 (à améliorer avec chiffrement)';
