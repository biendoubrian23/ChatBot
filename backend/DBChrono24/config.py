"""Configuration de connexion à la base de données Chrono24."""

# ============================================
# CREDENTIALS CHRONO24
# ============================================

DB_CONFIG = {
    "provider": "chrono24",
    "display_name": "Chrono24",
    "description": "Base de données Chrono24 - Gestion des commandes",
    
    # Connection settings
    "host": "serveur7",
    "port": 1433,
    "database": "Chrono24_dev",  # À confirmer le nom exact
    "username": "lecteur-dev",
    "password": "Messages",
    "driver": "ODBC Driver 18 for SQL Server",
    
    # Options
    "trust_server_certificate": True,
    "timeout": 10,
}


def get_connection_string() -> str:
    """Retourne la chaîne de connexion pyodbc pour Chrono24."""
    return (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['host']},{DB_CONFIG['port']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
    )
