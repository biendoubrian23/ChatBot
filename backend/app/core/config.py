"""Configuration settings for LibriAssist chatbot."""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os


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
        "https://*.ngrok.app",
        "https://*.vercel.app",
        "https://chat-bot-lyart-nine.vercel.app",
        "https://chat-bot-sigma-murex.vercel.app",
        "https://chat-bot-git-main-biendou-brians-projects.vercel.app",
        "https://chat-3knuvx750-biendou-brians-projects.vercel.app"
    ]
    
    # LLM Provider Configuration (ollama | mistral | groq)
    llm_provider: str = "mistral"
    
    # Database Provider Configuration (coollibri | chrono24)
    db_provider: str = "coollibri"
    
    # Mistral AI Configuration
    mistral_api_key: Optional[str] = None
    mistral_model: str = "mistral-small-latest"
    
    # Groq Configuration
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"
    
    # Ollama Configuration (local fallback)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral:latest"
    
    # RAG Configuration (optimisé pour Mistral 32K contexte)
    chunk_size: int = 1500  # Chunks plus grands = plus de contexte par morceau
    chunk_overlap: int = 300  # 20% overlap - évite de couper les informations importantes
    top_k_results: int = 8  # Nombre de chunks récupérés (8 x 1500 = 12K tokens max)
    rerank_top_n: int = 5  # Top 5 après reranking = 7.5K tokens de contexte
    
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
    
    # Optimisations Cloud LLM
    enable_request_batching: bool = False    # Désactivé pour cloud (inutile)
    batch_window_ms: int = 50                # Réduit car cloud est rapide
    max_batch_size: int = 20                 # Augmenté car cloud gère bien
    max_concurrent_llm_requests: int = 50    # Cloud gère beaucoup plus
    
    # Cache Sémantique (GARDE - utile pour réduire les coûts API)
    enable_semantic_cache: bool = True
    semantic_cache_size: int = 1000          # Augmenté pour plus de cache
    semantic_similarity_threshold: float = 0.92
    semantic_cache_ttl: float = 7200.0       # 2 heures (économise les appels API)
    
    # Connexions HTTP (pour cloud providers)
    http_connection_pool_size: int = 20
    http_keepalive_seconds: float = 60.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
