"""MONITORA Backend - Main Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from app.core.config import settings
from app.api.routes import router


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="MONITORA - Multi-tenant Chatbot Management API"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version
    }


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print(f"🚀 Starting {settings.app_name}...")
    print(f"📦 Version: {settings.app_version}")
    
    # Create necessary directories
    os.makedirs(settings.vectorstore_base_path, exist_ok=True)
    os.makedirs(settings.documents_base_path, exist_ok=True)
    
    # Initialize embedding service (singleton)
    from app.services.vectorstore import EmbeddingService
    EmbeddingService()
    
    print(f"\n✅ {settings.app_name} is ready!")
    print(f"📍 Listening on http://{settings.api_host}:{settings.api_port}")
    print(f"📚 API Documentation: http://{settings.api_host}:{settings.api_port}/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print(f"🛑 Shutting down {settings.app_name}...")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
