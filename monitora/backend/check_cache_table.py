from app.core.database import get_db

try:
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'response_cache'")
        table = cursor.fetchone()
        
        if table:
            print("✅ La table 'response_cache' EXISTE bien en base de données.")
            print(f"Schéma: {table[1]}, Table: {table[2]}")
            
            # Vérifier les colonnes
            cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'response_cache'")
            columns = [row[0] for row in cursor.fetchall()]
            print(f"Colonnes: {', '.join(columns)}")
        else:
            print("❌ La table 'response_cache' n'a PAS été trouvée.")
            print("Tentative de création...")
            
            cursor.execute("""
            CREATE TABLE response_cache (
                id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                workspace_id UNIQUEIDENTIFIER NOT NULL,
                question NVARCHAR(MAX) NOT NULL,
                question_hash VARCHAR(64) NOT NULL,
                response NVARCHAR(MAX) NOT NULL,
                created_at DATETIME2 DEFAULT GETDATE(),
                
                INDEX ix_response_cache_workspace_hash (workspace_id, question_hash),
                INDEX ix_response_cache_created (created_at),
                
                CONSTRAINT fk_response_cache_workspace 
                    FOREIGN KEY (workspace_id) 
                    REFERENCES workspaces(id) 
                    ON DELETE CASCADE
            );
            """)
            print("✅ Table créée avec succès via Python !")

except Exception as e:
    print(f"Erreur : {e}")

