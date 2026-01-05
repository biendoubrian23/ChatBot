"""MONITORA Backend - Configuration"""
from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

# Get the backend directory (where this config.py is located)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8001  # Different port from main backend
    app_name: str = "MONITORA API"
    app_version: str = "1.0.0"
    
    # Supabase Configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""  # For admin operations
    
    # CORS - Allow MONITORA frontend
    cors_origins: list = [
        "http://localhost:3001",
        "http://localhost:3002",
        "https://*.vercel.app",
        "https://*.netlify.app",
    ]
    
    # LLM Provider API Keys
    mistral_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # Default LLM Configuration (same as CoolLibri)
    default_llm_provider: str = "mistral"
    default_llm_model: str = "mistral-small-latest"
    
    # Embedding Model (shared across all workspaces)
    embedding_model: str = "intfloat/multilingual-e5-large"
    
    # Storage paths
    vectorstore_base_path: str = "./data/vectorstores"
    documents_base_path: str = "./data/documents"
    
    # RAG Defaults (same as CoolLibri chatbot)
    default_chunk_size: int = 1500
    default_chunk_overlap: int = 300
    default_top_k: int = 8
    default_rerank_top_n: int = 5
    default_temperature: float = 0.1
    default_max_tokens: int = 900
    
    # Cache Configuration
    enable_semantic_cache: bool = True
    semantic_cache_size: int = 1000
    semantic_similarity_threshold: float = 0.92
    semantic_cache_ttl: float = 7200.0
    
    class Config:
        env_file = str(ENV_FILE)  # Use absolute path to monitora/backend/.env
        extra = "ignore"  # Ignore extra fields from parent .env files
        case_sensitive = False


settings = Settings()
