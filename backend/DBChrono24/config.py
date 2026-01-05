"""Configuration de connexion à la base de données Chrono24.

Les credentials sont lus depuis les variables d'environnement pour la sécurité.
Ne JAMAIS mettre de mots de passe en dur dans ce fichier !
"""
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# ============================================
# CREDENTIALS CHRONO24 - depuis .env
# ============================================

DB_CONFIG = {
    "provider": "chrono24",
    "display_name": "Chrono24",
    "description": "Base de données Chrono24 - Gestion des commandes",
    
    # Connection settings - lus depuis les variables d'environnement
    "host": os.getenv("CHRONO24_DB_HOST", "localhost"),
    "port": int(os.getenv("CHRONO24_DB_PORT", "1433")),
    "database": os.getenv("CHRONO24_DB_NAME", ""),
    "username": os.getenv("CHRONO24_DB_USER", ""),
    "password": os.getenv("CHRONO24_DB_PASSWORD", ""),
    "driver": os.getenv("CHRONO24_DB_DRIVER", "ODBC Driver 18 for SQL Server"),
    
    # Options
    "trust_server_certificate": True,
    "timeout": 10,
}


def get_connection_string() -> str:
    """Retourne la chaîne de connexion pyodbc pour Chrono24."""
    if not DB_CONFIG['password']:
        raise ValueError("CHRONO24_DB_PASSWORD non défini dans les variables d'environnement !")
    
    return (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['host']},{DB_CONFIG['port']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
    )
