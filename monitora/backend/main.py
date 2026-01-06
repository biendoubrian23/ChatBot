"""
MONITORA Backend - FastAPI
Point d'entrée principal
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import logging
import os

from app.core.config import settings
from app.api.routes import router

# Configuration des logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Créer l'application FastAPI
app = FastAPI(
    title="MONITORA API",
    description="API pour la plateforme de gestion de chatbots MONITORA",
    version="1.0.0",
)

# CORS origins autorisées
ALLOWED_ORIGINS = [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3000",
]

# Configuration CORS - Autoriser toutes origines pour le widget (sites externes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Widget doit être accessible depuis n'importe quel site
    allow_credentials=False,  # Pas de credentials avec allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight 24h
)

# Inclure les routes
app.include_router(router, prefix="/api")

# Route de santé
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "monitora-backend"}

# Test CORS
@app.options("/api/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return {"status": "ok"}

@app.get("/api/test-cors")
async def test_cors():
    return {"cors": "working", "origins": ALLOWED_ORIGINS}

# Route pour servir le widget embed.js
@app.get("/widget/embed.js")
async def serve_embed_js():
    """Sert le script d'intégration du widget"""
    embed_path = os.path.join(os.path.dirname(__file__), "static", "embed.js")
    return FileResponse(
        embed_path, 
        media_type="application/javascript",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600"
        }
    )

@app.get("/")
async def root():
    return {
        "message": "MONITORA API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG
    )
