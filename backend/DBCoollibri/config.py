"""Configuration de connexion à la base de données Coollibri.

Les credentials sont lus depuis les variables d'environnement pour la sécurité.
Ne JAMAIS mettre de mots de passe en dur dans ce fichier !
"""
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# ============================================
# CREDENTIALS COOLLIBRI - depuis .env
# ============================================

DB_CONFIG = {
    "provider": "coollibri",
    "display_name": "CoolLibri",
    "description": "Base de données CoolLibri - Impression de livres à la demande",
    
    # Connection settings - lus depuis les variables d'environnement
    "host": os.getenv("COOLLIBRI_DB_HOST", "localhost"),
    "port": int(os.getenv("COOLLIBRI_DB_PORT", "1433")),
    "database": os.getenv("COOLLIBRI_DB_NAME", ""),
    "username": os.getenv("COOLLIBRI_DB_USER", ""),
    "password": os.getenv("COOLLIBRI_DB_PASSWORD", ""),
    "driver": os.getenv("COOLLIBRI_DB_DRIVER", "ODBC Driver 18 for SQL Server"),
    
    # Options
    "trust_server_certificate": True,
    "timeout": 10,
}


def get_connection_string() -> str:
    """Retourne la chaîne de connexion pyodbc pour Coollibri."""
    if not DB_CONFIG['password']:
        raise ValueError("COOLLIBRI_DB_PASSWORD non défini dans les variables d'environnement !")
    
    return (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['host']},{DB_CONFIG['port']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
    )
