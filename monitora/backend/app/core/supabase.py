"""
Client Supabase pour le backend
"""
from supabase import create_client, Client
from app.core.config import settings

# Créer le client Supabase avec la service key
# (accès complet pour le backend)
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

def get_supabase() -> Client:
    """Retourne le client Supabase"""
    return supabase
