"""
Router principal de l'API
"""
from fastapi import APIRouter
from app.core.config import settings
from app.api.workspaces import router as workspaces_router
from app.api.chat import router as chat_router
from app.api.widget import router as widget_router
from app.api.insights import router as insights_router

# Importer le bon module documents selon le mode de stockage
if settings.STORAGE_MODE == "supabase":
    from app.api.documents_supabase import router as documents_router
else:
    from app.api.documents import router as documents_router

router = APIRouter()

# Inclure tous les sous-routers
router.include_router(workspaces_router, prefix="/workspaces", tags=["Workspaces"])
router.include_router(documents_router, prefix="/documents", tags=["Documents"])
router.include_router(chat_router, prefix="/chat", tags=["Chat"])
router.include_router(widget_router, prefix="/widget", tags=["Widget"])
router.include_router(insights_router, prefix="/insights", tags=["Insights"])

