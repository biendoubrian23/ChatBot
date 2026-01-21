-- Migration: Créer la table response_cache pour le cache sémantique
-- À exécuter sur la base SQL Server Monitora_dev

-- Vérifier si la table existe déjà
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'response_cache')
BEGIN
    CREATE TABLE response_cache (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        question NVARCHAR(MAX) NOT NULL,
        question_hash VARCHAR(64) NOT NULL,  -- Hash SHA256 pour recherche rapide
        response NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        
        -- Index pour recherche rapide par workspace et hash
        INDEX ix_response_cache_workspace_hash (workspace_id, question_hash),
        INDEX ix_response_cache_created (created_at),
        
        -- Contrainte de clé étrangère vers workspaces
        CONSTRAINT fk_response_cache_workspace 
            FOREIGN KEY (workspace_id) 
            REFERENCES workspaces(id) 
            ON DELETE CASCADE
    );
    
    PRINT 'Table response_cache créée avec succès';
END
ELSE
BEGIN
    PRINT 'Table response_cache existe déjà';
END
GO
