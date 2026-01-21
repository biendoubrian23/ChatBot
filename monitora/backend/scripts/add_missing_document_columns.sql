-- Script pour ajouter les colonnes manquantes à la table documents
-- Exécuter ce script dans SQL Server Management Studio

-- Ajouter file_type si elle n'existe pas
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[documents]') 
    AND name = 'file_type'
)
BEGIN
    ALTER TABLE documents ADD file_type NVARCHAR(50);
    PRINT 'Colonne file_type ajoutée';
END
ELSE
BEGIN
    PRINT 'Colonne file_type existe déjà';
END
GO

-- Ajouter chunk_count si elle n'existe pas
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[documents]') 
    AND name = 'chunk_count'
)
BEGIN
    ALTER TABLE documents ADD chunk_count INT DEFAULT 0;
    PRINT 'Colonne chunk_count ajoutée';
END
ELSE
BEGIN
    PRINT 'Colonne chunk_count existe déjà';
END
GO

-- Mettre à jour file_type à partir de mime_type si la colonne mime_type existe
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[documents]') 
    AND name = 'mime_type'
)
BEGIN
    UPDATE documents SET file_type = mime_type WHERE file_type IS NULL;
    PRINT 'Données migrées de mime_type vers file_type';
END
GO

-- Mettre à jour chunk_count à partir de chunks_count si la colonne chunks_count existe
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[documents]') 
    AND name = 'chunks_count'
)
BEGIN
    UPDATE documents SET chunk_count = chunks_count WHERE chunk_count IS NULL;
    PRINT 'Données migrées de chunks_count vers chunk_count';
END
GO

PRINT 'Migration terminée!';
