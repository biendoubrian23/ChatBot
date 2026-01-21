"""Main application entry point."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import logging
import os

from app.core.config import settings
from app.api import routes
from app.api import parallel_test
from app.api import system_metrics
from app.api import request_tracking
from app.api import optimization_stats
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.llm import OllamaService
from app.services.rag_pipeline import RAGPipeline
from app.services.request_batcher import init_batcher, shutdown_batcher
from app.middleware.rate_limit import RateLimitMiddleware, get_rate_limit_stats

# Configurer le logging pour ignorer les erreurs de socket déconnectés
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

# Filtre pour supprimer les messages "socket.send() raised exception"
class SocketErrorFilter(logging.Filter):
    def filter(self, record):
        return "socket.send()" not in str(record.getMessage())

# Filtre pour masquer les logs de tracking (parallel-monitor)
class TrackingLogFilter(logging.Filter):
    def filter(self, record):
        msg = str(record.getMessage())
        # Ignorer les endpoints de tracking
        return "/tracking/" not in msg

# Appliquer les filtres aux loggers uvicorn
for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
    logger = logging.getLogger(logger_name)
    logger.addFilter(SocketErrorFilter())
    logger.addFilter(TrackingLogFilter())

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="LibriAssist - Chatbot RAG intelligent pour CoolLibri"
)

# Handler pour loguer les erreurs de validation (422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log validation errors for debugging."""
    print(f"[VALIDATION ERROR] Path: {request.url.path}")
    print(f"[VALIDATION ERROR] Details: {exc.errors()}")
    try:
        body = await request.body()
        print(f"[VALIDATION ERROR] Body: {body.decode()[:500]}")
    except:
        pass
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Rate Limiting (protection anti-spam)
# NOTE: Ajouté APRÈS CORS car les middlewares FastAPI s'exécutent en ordre inverse
# (le dernier ajouté est exécuté en premier)
# Donc: Request → RateLimit → CORS → App → CORS → RateLimit → Response
app.add_middleware(RateLimitMiddleware)

# Servir les fichiers statiques (widget embeddable)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/widget.js")
async def get_widget():
    """Serve the embeddable widget script."""
    widget_path = os.path.join(os.path.dirname(__file__), "static", "widget.js")
    return FileResponse(
        widget_path,
        media_type="application/javascript",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*"
        }
    )


@app.get("/widget-demo")
async def widget_demo():
    """Serve the widget demo page."""
    demo_path = os.path.join(os.path.dirname(__file__), "static", "demo.html")
    return FileResponse(demo_path, media_type="text/html")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "LibriAssist API"}


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("🚀 Starting LibriAssist API...")
    print(f"📦 Version: {settings.app_version}")
    
    # Initialize services
    print("\n🔧 Initializing services...")
    
    # Embedding service
    embedding_service = EmbeddingService(settings.embedding_model)
    
    # Vérifier si le vectorstore existe, sinon le générer
    import os
    vectorstore_exists = os.path.exists(settings.vectorstore_path) and \
                        os.path.exists(os.path.join(settings.vectorstore_path, "chroma.sqlite3"))
    
    if not vectorstore_exists:
        print("\n⚠️  Vectorstore non trouvé. Génération automatique...")
        print("📄 Indexation des documents...")
        from scripts.index_documents import index_all_documents
        try:
            index_all_documents()
            print("✅ Vectorstore généré avec succès!")
        except Exception as e:
            print(f"❌ Erreur lors de la génération du vectorstore: {e}")
            print("⚠️  L'API démarrera sans RAG (mode dégradé)")
    
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
    print(f"✓ Services assigned to routes module: rag_pipeline={routes.rag_pipeline is not None}, ollama={routes.ollama_service is not None}, vectorstore={routes.vectorstore is not None}")
    
    # Initialiser le request batcher pour le parallélisme
    if settings.enable_request_batching:
        await init_batcher()
        print("✓ Request Batcher initialisé")
    
    # Afficher les optimisations actives
    print("\n🔧 Optimisations actives:")
    print(f"   - Cache sémantique: {'✓' if settings.enable_semantic_cache else '✗'}")
    print(f"   - Request batching: {'✓' if settings.enable_request_batching else '✗'}")
    print(f"   - Max requêtes parallèles: {settings.max_concurrent_llm_requests}")
    
    print("\n✅ LibriAssist API is ready!")
    print(f"📍 Listening on http://{settings.api_host}:{settings.api_port}")
    print(f"📚 Vector store contains {vectorstore.count()} documents")
    print("\n💡 Tip: Use /docs for API documentation")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("🛑 Arrêt de LibriAssist API...")
    await shutdown_batcher()
    print("✅ Cleanup terminé")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/rate-limit-stats")
async def rate_limit_stats():
    """
    Endpoint pour voir les statistiques de rate limiting.
    Utile pour le monitoring et le debugging.
    """
    stats = get_rate_limit_stats()
    return {
        "status": "ok",
        "rate_limiting": stats
    }


# Include routers
app.include_router(routes.router, prefix="/api/v1", tags=["chatbot"])
app.include_router(parallel_test.router, prefix="/api/v1", tags=["parallel-testing"])
app.include_router(system_metrics.router, prefix="/api/v1", tags=["system-metrics"])
app.include_router(request_tracking.router, prefix="/api/v1", tags=["request-tracking"])
app.include_router(optimization_stats.router, prefix="/api/v1", tags=["optimization"])


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", settings.api_port))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Render nécessite 0.0.0.0
        port=port,       # Port dynamique de Render
        reload=False     # Pas de reload en production
    )
