"""Script temporaire pour tester la connexion SQL Server"""
import pyodbc

# Paramètres de connexion (identiques au .env)
db_host = "alpha.messages.fr"
db_port = 1433
db_name = "Coollibri_dev"
db_user = "lecteur-dev"
db_password = "Messages"
db_driver = "ODBC Driver 18 for SQL Server"

# String de connexion
conn_str = (
    f"DRIVER={{{db_driver}}};"
    f"SERVER={db_host},{db_port};"
    f"DATABASE={db_name};"
    f"UID={db_user};"
    f"PWD={db_password};"
    f"TrustServerCertificate=yes;"
    f"Encrypt=yes;"
)

print(f"Connexion à: {db_host}:{db_port}/{db_name}")
print(f"Utilisateur: {db_user}")
print(f"Driver: {db_driver}")
print()

try:
    conn = pyodbc.connect(conn_str, timeout=10)
    print("✅ Connexion réussie !")
    
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION as ServerVersion, DB_NAME() as CurrentDB")
    row = cursor.fetchone()
    print(f"Base: {row.CurrentDB}")
    print(f"Version: {row.ServerVersion[:60]}...")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Erreur: {e}")
