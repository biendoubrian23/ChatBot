-- Script SQL pour créer la table evaluations dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- Créer la table evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL,
  question_id INTEGER NOT NULL,
  criteria VARCHAR(20) NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte d'unicité pour éviter les doublons
  UNIQUE(user_id, question_id, criteria)
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_question_id ON evaluations(question_id);

-- Activer RLS (Row Level Security) - optionnel mais recommandé
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (pour simplifier)
CREATE POLICY "Allow all operations" ON evaluations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Vérification
SELECT 'Table evaluations créée avec succès!' as message;
