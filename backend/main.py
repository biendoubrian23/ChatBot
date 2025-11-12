"""Main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.api import routes
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.llm import OllamaService
from app.services.rag_pipeline import RAGPipeline

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="LibriAssist - Chatbot RAG intelligent pour CoolLibri"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("🚀 Starting LibriAssist API...")
    print(f"📦 Version: {settings.app_version}")
    
    # Initialize services
    print("\n🔧 Initializing services...")
    
    # Embedding service
    embedding_service = EmbeddingService(settings.embedding_model)
    
    # Vector store
    vectorstore = VectorStoreService(
        persist_directory=settings.vectorstore_path,
        embedding_service=embedding_service
    )
    
    # Ollama LLM service
    ollama_service = OllamaService(
        base_url=settings.ollama_base_url,
        model=settings.ollama_model
    )
    
    # Check Ollama availability
    if ollama_service.is_available():
        print("✓ Ollama service is available")
    else:
        print("⚠ Warning: Ollama service is not available")
        print("  Make sure Ollama is running: ollama serve")
        print(f"  And model is installed: ollama pull {settings.ollama_model}")
    
    # RAG Pipeline
    rag_pipeline = RAGPipeline(
        vectorstore=vectorstore,
        llm_service=ollama_service,
        top_k=settings.top_k_results,
        rerank_top_n=settings.rerank_top_n
    )
    
    # Store in routes module for dependency injection
    routes.rag_pipeline = rag_pipeline
    routes.ollama_service = ollama_service
    routes.vectorstore = vectorstore
    
    print("\n✅ LibriAssist API is ready!")
    print(f"📍 Listening on http://{settings.api_host}:{settings.api_port}")
    print(f"📚 Vector store contains {vectorstore.count()} documents")
    print("\n💡 Tip: Use /docs for API documentation")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs"
    }


# Include routers
app.include_router(routes.router, prefix="/api/v1", tags=["chatbot"])


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", settings.api_port))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Render nécessite 0.0.0.0
        port=port,       # Port dynamique de Render
        reload=False     # Pas de reload en production
    )
