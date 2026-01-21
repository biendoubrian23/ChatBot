-- Ajout de la colonne feedback à la table messages
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'messages') 
    AND name = 'feedback'
)
BEGIN
    ALTER TABLE messages
    ADD feedback INT NULL;
    
    PRINT 'Colonne feedback ajoutée à la table messages.';
END
ELSE
BEGIN
    PRINT 'La colonne feedback existe déjà.';
END
GO
