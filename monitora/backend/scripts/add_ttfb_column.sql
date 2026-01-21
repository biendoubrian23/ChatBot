IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[messages]') 
    AND name = 'ttfb_ms'
)
BEGIN
    ALTER TABLE [dbo].[messages]
    ADD [ttfb_ms] INT NULL;
END
GO
