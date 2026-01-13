-- ============================================================
-- Migration 001: Ajout du support pour plusieurs domaines autorisés
-- Date: 2026-01-07
-- Description: Permet de configurer jusqu'à 5 domaines autorisés
--              pour le widget chatbot au lieu d'un seul
-- ============================================================

-- 1. Ajouter la colonne allowed_domains (array de texte)
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT NULL;

-- 2. Migrer les données existantes : copier domain vers allowed_domains
-- Cela préserve la compatibilité avec l'ancien format
UPDATE workspaces 
SET allowed_domains = ARRAY[domain]
WHERE domain IS NOT NULL 
AND domain != ''
AND (allowed_domains IS NULL OR allowed_domains = '{}');

-- 3. Créer un index pour les recherches sur allowed_domains (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_workspaces_allowed_domains 
ON workspaces USING GIN (allowed_domains);

-- 4. Commentaire pour documenter le champ
COMMENT ON COLUMN workspaces.allowed_domains IS 'Liste des domaines autorisés pour le widget (ex: ["exemple.com", "monsite.fr"]). Max 5 domaines.';

-- ============================================================
-- ROLLBACK (en cas de problème) :
-- ============================================================
-- DROP INDEX IF EXISTS idx_workspaces_allowed_domains;
-- ALTER TABLE workspaces DROP COLUMN IF EXISTS allowed_domains;

// Données à récupérer :
1. COUNT(*) FROM messages WHERE workspace_id = X
2. COUNT(DISTINCT visitor_id) FROM conversations WHERE workspace_id = X
3. AVG(response_time_ms) FROM messages WHERE role = 'assistant'
4. AVG(feedback) FROM messages WHERE feedback IS NOT NULL
5. COUNT(*) FROM conversations WHERE date > today

