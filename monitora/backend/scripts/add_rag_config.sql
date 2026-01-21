IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('workspaces') 
  AND name = 'rag_config'
)
BEGIN
    ALTER TABLE workspaces
    ADD rag_config NVARCHAR(MAX) NULL;
END
GO
