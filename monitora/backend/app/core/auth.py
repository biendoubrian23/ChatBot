"""
Authentification - Helpers pour vérifier les tokens
SQL Server uniquement
"""
from fastapi import HTTPException, Header

# Import depuis le module SQL Server
from app.core.auth_sqlserver import get_current_user, get_optional_user, get_auth_service

# Ré-export pour compatibilité
__all__ = ['get_current_user', 'get_optional_user', 'get_auth_service']
