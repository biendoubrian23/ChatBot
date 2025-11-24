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
    chunk_size: int = 800  # Optimal pour FAQ et guides techniques
    chunk_overlap: int = 150  # 18.75% overlap - équilibre contexte/performance
    top_k_results: int = 10  # Increased from 4 for better context
    rerank_top_n: int = 5  # Increased from 2 for better precision
    
    # Embedding Model
    embedding_model: str = "intfloat/multilingual-e5-large"  # +25% précision vs mpnet, 1024 dims
    
    # Paths
    vectorstore_path: str = "./data/vectorstore"
    docs_path: str = "../docs"
    
    # SQL Server Database Configuration
    sql_server_host: str = "alpha.messages.fr"
    sql_server_port: int = 1433
    sql_server_database: str = "Coollibri_dev"
    sql_server_username: str = "lecteur-dev"
    sql_server_password: str = "Messages"
    sql_server_driver: str = "ODBC Driver 18 for SQL Server"
    
    # Cache
    enable_cache: bool = True
    cache_max_size: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
