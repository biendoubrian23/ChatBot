-- =====================================================
-- TABLE: document_contents
-- Stockage binaire des documents uploadés
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[document_contents]') AND type in (N'U'))
BEGIN
    CREATE TABLE document_contents (
        document_id UNIQUEIDENTIFIER PRIMARY KEY,
        content VARBINARY(MAX),
        
        CONSTRAINT FK_document_contents_document FOREIGN KEY (document_id) 
        REFERENCES documents(id) ON DELETE CASCADE
    );
    PRINT 'Table document_contents créée';
END
GO

-- =====================================================
-- TABLE: vectorstore_contents
-- Stockage binaire des index vectoriels (FAISS)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vectorstore_contents]') AND type in (N'U'))
BEGIN
    CREATE TABLE vectorstore_contents (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        file_name NVARCHAR(255) NOT NULL, -- ex: 'index.faiss', 'index.pkl'
        content VARBINARY(MAX),
        updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_vectorstore_contents_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE
    );
    -- Index pour recherche rapide par workspace
    CREATE INDEX IX_vectorstore_contents_workspace ON vectorstore_contents(workspace_id);
    
    PRINT 'Table vectorstore_contents créée';
END
GO
