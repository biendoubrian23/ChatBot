"""
Routes API pour les Documents - Version Supabase Storage
Upload vers Supabase Storage, vectorisation avec pgvector
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from typing import Optional, List
import os
import uuid
import logging
from app.core.supabase import get_supabase
from app.core.config import settings
from app.api.workspaces import get_user_from_token

router = APIRouter()
logger = logging.getLogger(__name__)

# Extensions autorisées
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".md", ".docx", ".csv"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def verify_workspace_access(workspace_id: str, user_id: str) -> dict:
    """Vérifie que l'utilisateur a accès au workspace"""
    supabase = get_supabase()
    
    result = supabase.table("workspaces")\
        .select("*")\
        .eq("id", workspace_id)\
        .eq("user_id", user_id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    return result.data


@router.get("/workspace/{workspace_id}")
async def list_documents(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Liste tous les documents d'un workspace"""
    user = await get_user_from_token(authorization)
    await verify_workspace_access(workspace_id, user.id)
    
    supabase = get_supabase()
    
    result = supabase.table("documents")\
        .select("*")\
        .eq("workspace_id", workspace_id)\
        .order("created_at", desc=True)\
        .execute()
    
    return result.data


@router.post("/workspace/{workspace_id}/upload")
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Upload un document vers Supabase Storage.
    Le fichier est stocké dans le bucket 'documents' avec le chemin:
    {workspace_id}/{document_id}/{filename}
    """
    logger.info(f"=== Upload request: workspace={workspace_id}, file={file.filename}")
    
    try:
        user = await get_user_from_token(authorization)
        logger.info(f"User authenticated: {user.id}")
        
        workspace = await verify_workspace_access(workspace_id, user.id)
        logger.info(f"Workspace verified: {workspace.get('name', 'unknown')}")
        
        # Vérifier l'extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Extension non autorisée. Autorisées: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Lire le contenu
        content = await file.read()
        logger.info(f"File read: {len(content)} bytes")
        
        # Vérifier la taille
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Fichier trop volumineux. Max: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Générer un ID unique pour le document
        document_id = str(uuid.uuid4())
        
        # Chemin dans Supabase Storage
        storage_path = f"{workspace_id}/{document_id}/{file.filename}"
        
        supabase = get_supabase()
        
        # Upload vers Supabase Storage
        try:
            supabase.storage.from_("documents").upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            logger.info(f"File uploaded to Storage: {storage_path}")
        except Exception as e:
            logger.error(f"Storage upload error: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur upload Storage: {str(e)}")
        
        # Enregistrer en base
        doc_data = {
            "id": document_id,
            "workspace_id": workspace_id,
            "filename": file.filename,
            "storage_path": storage_path,
            "file_size": len(content),
            "file_type": ext.replace(".", ""),
            "status": "pending",
            "chunk_count": 0
        }
        
        result = supabase.table("documents")\
            .insert(doc_data)\
            .execute()
        logger.info(f"Document inserted: {result.data[0]['id']}")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workspace/{workspace_id}/document/{document_id}/index")
async def index_document(
    workspace_id: str,
    document_id: str,
    authorization: str = Header(None)
):
    """Lance l'indexation/vectorisation d'un document"""
    logger.info(f"=== Index request: workspace={workspace_id}, doc={document_id}")
    
    try:
        user = await get_user_from_token(authorization)
        await verify_workspace_access(workspace_id, user.id)
        
        supabase = get_supabase()
        
        # Récupérer le document
        doc_result = supabase.table("documents")\
            .select("*")\
            .eq("id", document_id)\
            .eq("workspace_id", workspace_id)\
            .single()\
            .execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        doc = doc_result.data
        
        # Mettre à jour le statut
        supabase.table("documents")\
            .update({"status": "processing"})\
            .eq("id", document_id)\
            .execute()
        
        # Lancer la vectorisation en arrière-plan
        from app.services.vectorstore_supabase import vectorize_document
        import asyncio
        asyncio.create_task(vectorize_document(document_id, workspace_id, doc.get("storage_path")))
        
        return {"status": "processing", "message": "Indexation lancée"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Index error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workspace/{workspace_id}/upload-multiple")
async def upload_multiple_documents(
    workspace_id: str,
    files: List[UploadFile] = File(...),
    authorization: str = Header(None)
):
    """Upload plusieurs documents vers Supabase Storage"""
    user = await get_user_from_token(authorization)
    await verify_workspace_access(workspace_id, user.id)
    
    results = []
    errors = []
    supabase = get_supabase()
    
    for file in files:
        try:
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({"filename": file.filename, "error": "Extension non autorisée"})
                continue
            
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "Fichier trop volumineux"})
                continue
            
            document_id = str(uuid.uuid4())
            storage_path = f"{workspace_id}/{document_id}/{file.filename}"
            
            # Upload vers Storage
            supabase.storage.from_("documents").upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            # Enregistrer en base
            doc_data = {
                "id": document_id,
                "workspace_id": workspace_id,
                "filename": file.filename,
                "storage_path": storage_path,
                "file_size": len(content),
                "file_type": ext.replace(".", ""),
                "status": "pending",
                "chunk_count": 0
            }
            
            result = supabase.table("documents").insert(doc_data).execute()
            results.append(result.data[0])
            
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {
        "uploaded": results,
        "errors": errors,
        "total_uploaded": len(results),
        "total_errors": len(errors)
    }


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Récupère les détails d'un document"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    result = supabase.table("documents")\
        .select("*, workspaces!inner(user_id)")\
        .eq("id", document_id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    if result.data["workspaces"]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    del result.data["workspaces"]
    return result.data


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Supprime un document (Storage + base + chunks)"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    # Récupérer le document
    doc_result = supabase.table("documents")\
        .select("*, workspaces!inner(user_id)")\
        .eq("id", document_id)\
        .single()\
        .execute()
    
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    if doc_result.data["workspaces"]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Supprimer de Storage
    storage_path = doc_result.data.get("storage_path")
    if storage_path:
        try:
            supabase.storage.from_("documents").remove([storage_path])
            logger.info(f"Deleted from Storage: {storage_path}")
        except Exception as e:
            logger.warning(f"Could not delete from Storage: {e}")
    
    # Supprimer les chunks (cascade devrait gérer, mais au cas où)
    supabase.table("document_chunks")\
        .delete()\
        .eq("document_id", document_id)\
        .execute()
    
    # Supprimer de la base
    supabase.table("documents").delete().eq("id", document_id).execute()
    
    return {"message": "Document supprimé"}


@router.post("/{document_id}/reindex")
async def reindex_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Relance la vectorisation d'un document"""
    user = await get_user_from_token(authorization)
    supabase = get_supabase()
    
    doc_result = supabase.table("documents")\
        .select("*, workspaces!inner(user_id)")\
        .eq("id", document_id)\
        .single()\
        .execute()
    
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    if doc_result.data["workspaces"]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Mettre à jour le statut
    supabase.table("documents")\
        .update({"status": "processing"})\
        .eq("id", document_id)\
        .execute()
    
    # Relancer la vectorisation
    from app.services.vectorstore_supabase import vectorize_document
    import asyncio
    asyncio.create_task(
        vectorize_document(
            document_id, 
            doc_result.data["workspace_id"],
            doc_result.data.get("storage_path")
        )
    )
    
    return {"message": "Vectorisation relancée", "status": "processing"}


@router.post("/workspace/{workspace_id}/reindex-all")
async def reindex_all_documents(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Réindexe TOUS les documents d'un workspace"""
    logger.info(f"=== Reindex ALL request: workspace={workspace_id}")
    
    try:
        user = await get_user_from_token(authorization)
        await verify_workspace_access(workspace_id, user.id)
        
        from app.services.vectorstore_supabase import reindex_all_documents as reindex_all
        import asyncio
        asyncio.create_task(reindex_all(workspace_id))
        
        supabase = get_supabase()
        docs_count = supabase.table("documents")\
            .select("id", count="exact")\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        return {
            "status": "processing",
            "message": f"Réindexation de {docs_count.count or 0} documents lancée",
            "document_count": docs_count.count or 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reindex all error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
