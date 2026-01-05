"""Configuration de connexion à la base de données Coollibri."""

# ============================================
# CREDENTIALS COOLLIBRI (Production/Dev)
# ============================================

DB_CONFIG = {
    "provider": "coollibri",
    "display_name": "CoolLibri",
    "description": "Base de données CoolLibri - Impression de livres à la demande",
    
    # Connection settings
    "host": "alpha.messages.fr",
    "port": 1433,
    "database": "Coollibri_dev",
    "username": "lecteur-dev",
    "password": "Messages",
    "driver": "ODBC Driver 18 for SQL Server",
    
    # Options
    "trust_server_certificate": True,
    "timeout": 10,
}


def get_connection_string() -> str:
    """Retourne la chaîne de connexion pyodbc pour Coollibri."""
    return (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['host']},{DB_CONFIG['port']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
    )
