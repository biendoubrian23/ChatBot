-- =====================================================
-- TABLE: workspace_databases
-- Configurations de bases de données externes par workspace
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[workspace_databases]') AND type in (N'U'))
BEGIN
    CREATE TABLE workspace_databases (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        workspace_id UNIQUEIDENTIFIER NOT NULL,
        db_type NVARCHAR(50) NOT NULL, -- 'sqlserver', 'postgresql', 'mysql'
        db_host NVARCHAR(255) NOT NULL,
        db_port INT,
        db_name NVARCHAR(255) NOT NULL,
        db_user NVARCHAR(255) NOT NULL,
        db_password_encrypted NVARCHAR(MAX), -- Stocké chiffré
        is_enabled BIT DEFAULT 1,
        schema_type NVARCHAR(50) DEFAULT 'coollibri', -- 'coollibri', 'prestashop', 'woocommerce'
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        
        CONSTRAINT FK_workspace_databases_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    
    -- Index pour recherche rapide
    CREATE NONCLUSTERED INDEX idx_workspace_databases_workspace_id ON workspace_databases(workspace_id);
END
GO
