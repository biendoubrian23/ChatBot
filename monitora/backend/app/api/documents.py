"""
Routes API pour les Documents
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Header, Form
from typing import Optional, List
import os
import uuid
import aiofiles
from app.core.supabase import get_supabase
from app.core.config import settings
from app.api.workspaces import get_user_from_token

router = APIRouter()

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
    """Upload un document vers un workspace"""
    user = await get_user_from_token(authorization)
    workspace = await verify_workspace_access(workspace_id, user.id)
    
    # Vérifier l'extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension non autorisée. Autorisées: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Lire le contenu
    content = await file.read()
    
    # Vérifier la taille
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Max: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Créer le dossier de stockage
    upload_dir = os.path.join(settings.UPLOADS_PATH, workspace_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Générer un nom unique
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    # Sauvegarder le fichier
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(content)
    
    # Enregistrer en base
    supabase = get_supabase()
    
    doc_data = {
        "workspace_id": workspace_id,
        "filename": file.filename,
        "file_path": filepath,
        "file_size": len(content),
        "file_type": ext.replace(".", ""),
        "status": "pending",  # En attente de vectorisation
        "chunk_count": 0
    }
    
    result = supabase.table("documents")\
        .insert(doc_data)\
        .execute()
    
    # Lancer la vectorisation en arrière-plan
    from app.services.vectorstore import vectorize_document
    import asyncio
    asyncio.create_task(vectorize_document(result.data[0]["id"], workspace_id, filepath))
    
    return result.data[0]


@router.post("/workspace/{workspace_id}/upload-multiple")
async def upload_multiple_documents(
    workspace_id: str,
    files: List[UploadFile] = File(...),
    authorization: str = Header(None)
):
    """Upload plusieurs documents vers un workspace"""
    user = await get_user_from_token(authorization)
    await verify_workspace_access(workspace_id, user.id)
    
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
            
            supabase = get_supabase()
            doc_data = {
                "workspace_id": workspace_id,
                "filename": file.filename,
                "file_path": filepath,
                "file_size": len(content),
                "file_type": ext.replace(".", ""),
                "status": "pending",
                "chunk_count": 0
            }
            
            result = supabase.table("documents").insert(doc_data).execute()
            results.append(result.data[0])
            
            # Vectoriser
            from app.services.vectorstore import vectorize_document
            import asyncio
            asyncio.create_task(vectorize_document(result.data[0]["id"], workspace_id, filepath))
            
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
    
    # Récupérer le document avec son workspace
    result = supabase.table("documents")\
        .select("*, workspaces!inner(user_id)")\
        .eq("id", document_id)\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Vérifier l'accès
    if result.data["workspaces"]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Retourner sans les infos du workspace
    del result.data["workspaces"]
    return result.data


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Supprime un document"""
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
    
    # Supprimer le fichier physique
    filepath = doc_result.data.get("file_path")
    if filepath and os.path.exists(filepath):
        os.remove(filepath)
    
    # Supprimer de la base
    supabase.table("documents").delete().eq("id", document_id).execute()
    
    # TODO: Supprimer du vectorstore
    
    return {"message": "Document supprimé"}


@router.post("/{document_id}/reindex")
async def reindex_document(
    document_id: str,
    authorization: str = Header(None)
):
    """Relance la vectorisation d'un document"""
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
    
    # Mettre à jour le statut
    supabase.table("documents")\
        .update({"status": "pending"})\
        .eq("id", document_id)\
        .execute()
    
    # Relancer la vectorisation
    from app.services.vectorstore import vectorize_document
    import asyncio
    asyncio.create_task(
        vectorize_document(
            document_id, 
            doc_result.data["workspace_id"],
            doc_result.data["file_path"]
        )
    )
    
    return {"message": "Vectorisation relancée", "status": "pending"}
