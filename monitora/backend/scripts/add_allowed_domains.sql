IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('workspaces') 
  AND name = 'allowed_domains'
)
BEGIN
    ALTER TABLE workspaces
    ADD allowed_domains NVARCHAR(MAX) NULL;
END
GO
