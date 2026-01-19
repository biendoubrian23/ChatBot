"""Test de connexion SQL Server"""
import pyodbc

# Configuration
config = {
    "server": "alpha.messages.fr",
    "port": "1433",
    "database": "Monitora_dev",
    "user": "chatbot",
    "password": "M3ss4ges"
}

connection_string = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={config['server']},{config['port']};"
    f"DATABASE={config['database']};"
    f"UID={config['user']};"
    f"PWD={config['password']};"
    f"TrustServerCertificate=yes"
)

try:
    print("Tentative de connexion à SQL Server...")
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    print("✅ Connexion réussie!")
    print("\n📋 Tables existantes dans Monitora_dev:")
    
    cursor.execute("""
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    """)
    
    tables = cursor.fetchall()
    for table in tables:
        print(f"  - {table[0]}")
    
    print(f"\nTotal: {len(tables)} tables")
    
    # Vérifier les procédures stockées
    print("\n📦 Procédures stockées:")
    cursor.execute("""
        SELECT name FROM sys.procedures ORDER BY name
    """)
    procs = cursor.fetchall()
    for proc in procs:
        print(f"  - {proc[0]}")
    
    conn.close()
    print("\n✅ Test terminé avec succès!")
    
except pyodbc.Error as e:
    print(f"❌ Erreur de connexion: {e}")
except Exception as e:
    print(f"❌ Erreur: {e}")
