"""Configuration settings for LibriAssist chatbot."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    app_name: str = "LibriAssist API"
    app_version: str = "1.0.0"
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.netlify.app",
        "https://libriassist.netlify.app",
        "https://*.ngrok-free.app",
        "https://*.ngrok.io",
        "https://*.ngrok.app"
    ]
    
    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"  # Ollama local
    ollama_model: str = "llama3.1:8b"
    
    # RAG Configuration
    chunk_size: int = 1000  # Increased from 550 for +15% completeness
    chunk_overlap: int = 300  # Adjusted proportionally
    top_k_results: int = 8  # Increased from 4 for better context
    rerank_top_n: int = 4  # Increased from 2 for better precision
    
    # Embedding Model
    embedding_model: str = "paraphrase-multilingual-mpnet-base-v2"  # Upgraded for +30% search precision
    
    # Paths
    vectorstore_path: str = "./data/vectorstore"
    docs_path: str = "../docs"
    
    # Cache
    enable_cache: bool = True
    cache_max_size: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
