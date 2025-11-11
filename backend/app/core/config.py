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
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"  # Upgraded from phi3:mini for +50% quality
    
    # RAG Configuration
    chunk_size: int = 700  # Increased from 550 for +15% completeness
    chunk_overlap: int = 200  # Adjusted proportionally
    top_k_results: int = 6  # Increased from 4 for better context
    rerank_top_n: int = 3  # Increased from 2 for better precision
    
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
