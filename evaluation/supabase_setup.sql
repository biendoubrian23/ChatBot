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

-- ============================================
-- TABLE POUR LES COMMENTAIRES UTILISATEURS
-- ============================================

-- Créer la table user_comments
CREATE TABLE IF NOT EXISTS user_comments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL,
  question_id INTEGER NOT NULL,
  comment_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte d'unicité: un seul commentaire par user par question
  UNIQUE(user_id, question_id)
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_user_comments_user_id ON user_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_comments_question_id ON user_comments(question_id);

-- Activer RLS (Row Level Security)
ALTER TABLE user_comments ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations
CREATE POLICY "Allow all operations on comments" ON user_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Vérification
SELECT 'Table user_comments créée avec succès!' as message;
