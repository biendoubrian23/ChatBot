"""
Router principal de l'API
"""
from fastapi import APIRouter
from app.api.workspaces import router as workspaces_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.widget import router as widget_router

router = APIRouter()

# Inclure tous les sous-routers
router.include_router(workspaces_router, prefix="/workspaces", tags=["Workspaces"])
router.include_router(documents_router, prefix="/documents", tags=["Documents"])
router.include_router(chat_router, prefix="/chat", tags=["Chat"])
router.include_router(widget_router, prefix="/widget", tags=["Widget"])
