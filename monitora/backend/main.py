"""
MONITORA Backend - FastAPI
Point d'entrée principal
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.api.routes import router

# Créer l'application FastAPI
app = FastAPI(
    title="MONITORA API",
    description="API pour la plateforme de gestion de chatbots MONITORA",
    version="1.0.0",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes
app.include_router(router, prefix="/api")

# Route de santé
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "monitora-backend"}

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
