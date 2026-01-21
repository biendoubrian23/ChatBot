-- Add missing columns to conversations table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('conversations') AND name = 'title')
BEGIN
    ALTER TABLE conversations ADD title NVARCHAR(255);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('conversations') AND name = 'session_id')
BEGIN
    ALTER TABLE conversations ADD session_id NVARCHAR(255);
END

-- Rename started_at to created_at if it exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('conversations') AND name = 'started_at')
BEGIN
    EXEC sp_rename 'conversations.started_at', 'created_at', 'COLUMN';
END
