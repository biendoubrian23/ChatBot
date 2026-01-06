"""
Configuration centrale de l'application
"""
from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Charger le .env depuis le dossier parent (monitora/)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
# Charger aussi le .env local
load_dotenv()

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    # LLM - Mistral
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-small-latest"
    
    # LLM - Groq (backup)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # App
    CORS_ORIGINS: str = "http://localhost:3001"
    DEBUG: bool = True
    
    # RAG Defaults
    DEFAULT_TEMPERATURE: float = 0.1
    DEFAULT_MAX_TOKENS: int = 900
    DEFAULT_TOP_K: int = 8
    DEFAULT_CHUNK_SIZE: int = 1500
    DEFAULT_CHUNK_OVERLAP: int = 300
    
    # Storage mode: "local" (FAISS) ou "supabase" (pgvector + Storage)
    STORAGE_MODE: str = "supabase"  # Changer en "local" pour dev sans Supabase Storage
    
    # Paths (utilisé seulement en mode local)
    VECTORSTORE_PATH: str = "./data/vectorstores"
    UPLOADS_PATH: str = "./data/uploads"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Retourne les origines CORS comme liste"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Valeurs par défaut pour la config RAG
DEFAULT_RAG_CONFIG = {
    "llm_provider": "mistral",
    "llm_model": settings.MISTRAL_MODEL,
    "temperature": settings.DEFAULT_TEMPERATURE,
    "max_tokens": settings.DEFAULT_MAX_TOKENS,
    "top_p": 1.0,
    "chunk_size": settings.DEFAULT_CHUNK_SIZE,
    "chunk_overlap": settings.DEFAULT_CHUNK_OVERLAP,
    "top_k": settings.DEFAULT_TOP_K,
    "rerank_top_n": 5,
    "enable_cache": True,
    "cache_ttl": 7200,
    "similarity_threshold": 0.92,
    "system_prompt": ""  # Prompt personnalisé défini par l'utilisateur
}
