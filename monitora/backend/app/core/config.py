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
    # ===========================================
    # MODE DE BASE DE DONNÉES
    # ===========================================
    # "supabase" = PostgreSQL/Supabase (ancien)
    # "sqlserver" = Microsoft SQL Server (nouveau)
    DATABASE_MODE: str = "sqlserver"
    
    # ===========================================
    # SQL Server (Monitora_dev)
    # ===========================================
    MSSQL_HOST: str = "alpha.messages.fr"
    MSSQL_PORT: int = 1433
    MSSQL_DATABASE: str = "Monitora_dev"
    MSSQL_USER: str = "chatbot"
    MSSQL_PASSWORD: str = "M3ss4ges"
    MSSQL_DRIVER: str = "ODBC Driver 18 for SQL Server"
    
    # ===========================================
    # Supabase (legacy - à supprimer après migration)
    # ===========================================
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    # ===========================================
    # JWT Authentication (pour SQL Server)
    # ===========================================
    JWT_SECRET: str = "monitora-jwt-secret-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    JWT_REFRESH_EXPIRY_DAYS: int = 7
    
    # ===========================================
    # LLM - Mistral
    # ===========================================
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-small-latest"
    
    # LLM - Groq (backup)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # ===========================================
    # App
    # ===========================================
    CORS_ORIGINS: str = "http://localhost:3001"
    DEBUG: bool = True
    
    # ===========================================
    # RAG Defaults
    # ===========================================
    DEFAULT_TEMPERATURE: float = 0.1
    DEFAULT_MAX_TOKENS: int = 900
    DEFAULT_TOP_K: int = 8
    DEFAULT_CHUNK_SIZE: int = 1500
    DEFAULT_CHUNK_OVERLAP: int = 300
    
    # ===========================================
    # Storage mode
    # ===========================================
    # "local" = FAISS pour vecteurs (recommandé avec SQL Server)
    # "supabase" = pgvector + Supabase Storage
    STORAGE_MODE: str = "local"
    
    # Paths (utilisé en mode local)
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
