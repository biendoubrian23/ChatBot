"""
Routes API pour les Documents - SQL Server
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Header, Form
from typing import Optional, List
import os
import uuid
import aiofiles
import logging
from app.core.database import DocumentsDB, WorkspacesDB
from app.core.config import settings
from app.api.workspaces import get_user_from_token

router = APIRouter()
logger = logging.getLogger(__name__)

# Extensions autorisées
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".md", ".docx", ".csv"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def verify_workspace_access(workspace_id: str, user_id: str) -> dict:
    """Vérifie que l'utilisateur a accès au workspace"""
    workspace = WorkspacesDB.get_by_id_and_user(workspace_id, user_id)
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    return workspace


@router.get("/workspace/{workspace_id}")
async def list_documents(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Liste tous les documents d'un workspace"""
    user = await get_user_from_token(authorization)
    await verify_workspace_access(workspace_id, user["id"])
    
    documents = DocumentsDB.get_by_workspace(workspace_id)
    return documents


# Alias route pour compatibilité frontend (GET /api/documents/{workspace_id})
@router.get("/{workspace_id}")
async def list_documents_alias(
    workspace_id: str,
    authorization: str = Header(None)
):
    """Alias pour list_documents - compatibilité frontend"""
    return await list_documents(workspace_id, authorization)


@router.post("/workspace/{workspace_id}/upload")
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """Upload un document vers un workspace"""
    logger.info(f"=== Upload request: workspace={workspace_id}, file={file.filename}")
    
    try:
        user = await get_user_from_token(authorization)
        logger.info(f"User authenticated: {user['id']}")
        
        workspace = await verify_workspace_access(workspace_id, user["id"])
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
        
        # Créer le dossier de stockage
        upload_dir = os.path.join(settings.UPLOADS_PATH, workspace_id)
        os.makedirs(upload_dir, exist_ok=True)
        logger.info(f"Upload dir: {upload_dir}")
        
        # Générer un nom unique
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        # Sauvegarder le fichier
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(content)
        logger.info(f"File saved: {filepath}")
        
        # Enregistrer en base
        doc = DocumentsDB.create(
            workspace_id=workspace_id,
            filename=file.filename,
            file_path=filepath,
            file_size=len(content),
            file_type=ext.replace(".", ""),
            status="pending"
        )
        logger.info(f"Document inserted: {doc['id']}")
        
        # Sauvegarder le contenu binaire en base
        try:
            DocumentsDB.save_content(doc['id'], content)
            logger.info(f"Content saved to DB for document: {doc['id']}")
        except Exception as e:
            logger.error(f"Error saving content to DB: {e}")
            # On ne fail pas l'upload si la sauvegarde binaire échoue pour l'instant
            # Car on a encore le fichier disque
        
        # NE PAS vectoriser automatiquement - l'utilisateur doit cliquer sur "Indexer"
        
        return doc
        
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
        await verify_workspace_access(workspace_id, user["id"])
        
        # Récupérer le document
        doc = DocumentsDB.get_by_id(document_id)
        
        if not doc or doc.get('workspace_id') != workspace_id:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Mettre à jour le statut
        DocumentsDB.update_status(document_id, "processing")
        
        # Lancer la vectorisation en arrière-plan
        from app.services.vectorstore import vectorize_document
        import asyncio
        asyncio.create_task(vectorize_document(document_id, workspace_id, doc["file_path"]))
        
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
    """Upload plusieurs documents vers un workspace"""
    user = await get_user_from_token(authorization)
    await verify_workspace_access(workspace_id, user["id"])
    
    results = []
    errors = []
    
    for file in files:
        try:
            # Réutiliser la logique d'upload unique
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({"filename": file.filename, "error": "Extension non autorisée"})
                continue
            
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "Fichier trop volumineux"})
                continue
            
            upload_dir = os.path.join(settings.UPLOADS_PATH, workspace_id)
            os.makedirs(upload_dir, exist_ok=True)
            
            file_id = str(uuid.uuid4())
            filename = f"{file_id}{ext}"
            filepath = os.path.join(upload_dir, filename)
            
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(content)
            
            doc = DocumentsDB.create(
                workspace_id=workspace_id,
                filename=file.filename,
                file_path=filepath,
                file_size=len(content),
                file_type=ext.replace(".", ""),
                status="pending"
            )
            results.append(doc)
            
            # Vectoriser
            from app.services.vectorstore import vectorize_document
            import asyncio
            asyncio.create_task(vectorize_document(doc["id"], workspace_id, filepath))
            
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
    
    # Récupérer le document avec son workspace owner
    doc = DocumentsDB.get_with_workspace_owner(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Vérifier l'accès
    if doc.get("workspace_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Retourner sans les infos du workspace owner
    del doc["workspace_user_id"]
    return doc


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Supprime un document"""
    user = await get_user_from_token(authorization)
    
    # Récupérer le document avec son workspace owner
    doc = DocumentsDB.get_with_workspace_owner(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    if doc.get("workspace_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Supprimer le fichier physique
    filepath = doc.get("file_path")
    if filepath and os.path.exists(filepath):
        os.remove(filepath)
    
    # Supprimer de la base
    DocumentsDB.delete(document_id)
    
    # Supprimer du vectorstore
    from app.services.vectorstore import delete_document_from_vectorstore
    delete_document_from_vectorstore(doc["workspace_id"], document_id)
    
    return {"message": "Document supprimé"}


@router.post("/{document_id}/reindex")
async def reindex_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Relance la vectorisation d'un document"""
    user = await get_user_from_token(authorization)
    
    # Récupérer le document avec son workspace owner
    doc = DocumentsDB.get_with_workspace_owner(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    if doc.get("workspace_user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Mettre à jour le statut
    DocumentsDB.update_status(document_id, "pending")
    
    # Relancer la vectorisation
    from app.services.vectorstore import vectorize_document
    import asyncio
    asyncio.create_task(
        vectorize_document(
            document_id, 
            doc["workspace_id"],
            doc["file_path"]
        )
    )
    
    return {"message": "Vectorisation relancée", "status": "pending"}


@router.post("/workspace/{workspace_id}/reindex-all")
async def reindex_all_documents(
    workspace_id: str,
    authorization: str = Header(None)
):
    """
    Réindexe TOUS les documents d'un workspace.
    Supprime l'ancien vectorstore et recrée tout depuis zéro.
    """
    logger.info(f"=== Reindex ALL request: workspace={workspace_id}")
    
    try:
        user = await get_user_from_token(authorization)
        await verify_workspace_access(workspace_id, user["id"])
        
        # Récupérer tous les documents du workspace
        documents = DocumentsDB.get_by_workspace(workspace_id)
        
        if not documents:
            raise HTTPException(status_code=400, detail="Aucun document à réindexer")
        
        # Supprimer l'ancien vectorstore
        from app.services.vectorstore import delete_vectorstore, vectorize_document
        delete_vectorstore(workspace_id)
        logger.info(f"Vectorstore supprimé pour workspace {workspace_id}")
        
        # Mettre tous les documents en status "processing"
        for doc in documents:
            DocumentsDB.update_status(doc["id"], "processing", chunk_count=0)
        
        # Lancer la réindexation de tous les documents en séquence
        import asyncio
        
        async def reindex_all():
            for doc in documents:
                try:
                    await vectorize_document(doc["id"], workspace_id, doc["file_path"])
                    logger.info(f"Document {doc['filename']} réindexé")
                except Exception as e:
                    logger.error(f"Erreur réindexation {doc['filename']}: {e}")
        
        asyncio.create_task(reindex_all())
        
        return {
            "status": "processing",
            "message": f"Réindexation de {len(documents)} documents lancée",
            "document_count": len(documents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reindex all error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
