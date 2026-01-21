"""
Service de gestion des Vectorstores avec Supabase pgvector
Stockage 100% cloud : Storage pour fichiers, pgvector pour embeddings
"""
import os
import logging
import tempfile
from typing import List, Optional, Tuple
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    UnstructuredMarkdownLoader,
    CSVLoader,
    Docx2txtLoader
)
from langchain_core.documents import Document
from app.core.config import settings
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)

# Embeddings - Configuration
# OPTION 1: Modèle haute qualité (1024 dims) - ACTIF
EMBEDDINGS_MODEL = "intfloat/multilingual-e5-large"
EMBEDDING_DIMENSION = 1024

# OPTION 2: Modèle léger (384 dims) - désactivé
# EMBEDDINGS_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# EMBEDDING_DIMENSION = 384
embeddings = None


def get_embeddings():
    """Lazy loading des embeddings"""
    global embeddings
    if embeddings is None:
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDINGS_MODEL,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
    return embeddings


def load_document_from_bytes(content: bytes, file_type: str, filename: str) -> List[Document]:
    """Charge un document depuis des bytes (téléchargé de Storage)"""
    # Créer un fichier temporaire
    suffix = f".{file_type}"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        if file_type == "txt":
            loader = TextLoader(tmp_path, encoding='utf-8')
        elif file_type == "pdf":
            loader = PyPDFLoader(tmp_path)
        elif file_type == "md":
            loader = UnstructuredMarkdownLoader(tmp_path)
        elif file_type == "csv":
            loader = CSVLoader(tmp_path, encoding='utf-8')
        elif file_type == "docx":
            loader = Docx2txtLoader(tmp_path)
        else:
            raise ValueError(f"Type de fichier non supporté: {file_type}")
        
        docs = loader.load()
        return docs
    finally:
        # Nettoyer le fichier temporaire
        os.unlink(tmp_path)


def split_documents(documents: List[Document], chunk_size: int = 1500, chunk_overlap: int = 300) -> List[Document]:
    """Découpe les documents en chunks"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_documents(documents)


async def upload_to_storage(workspace_id: str, document_id: str, content: bytes, filename: str) -> str:
    """
    Upload un fichier vers Supabase Storage
    Retourne le chemin du fichier dans le bucket
    """
    supabase = get_supabase()
    
    # Structure: workspace_id/document_id/filename
    storage_path = f"{workspace_id}/{document_id}/{filename}"
    
    try:
        # Upload vers le bucket 'documents'
        result = supabase.storage.from_("documents").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": "application/octet-stream"}
        )
        
        logger.info(f"Fichier uploadé vers Storage: {storage_path}")
        return storage_path
        
    except Exception as e:
        logger.error(f"Erreur upload Storage: {e}")
        raise


async def download_from_storage(storage_path: str) -> bytes:
    """Télécharge un fichier depuis Supabase Storage"""
    supabase = get_supabase()
    
    try:
        result = supabase.storage.from_("documents").download(storage_path)
        return result
    except Exception as e:
        logger.error(f"Erreur download Storage {storage_path}: {e}")
        raise


async def delete_from_storage(storage_path: str) -> bool:
    """Supprime un fichier de Supabase Storage"""
    supabase = get_supabase()
    
    try:
        supabase.storage.from_("documents").remove([storage_path])
        logger.info(f"Fichier supprimé de Storage: {storage_path}")
        return True
    except Exception as e:
        logger.error(f"Erreur suppression Storage {storage_path}: {e}")
        return False


async def delete_document_chunks(document_id: str):
    """Supprime tous les chunks d'un document"""
    supabase = get_supabase()
    
    try:
        supabase.table("document_chunks")\
            .delete()\
            .eq("document_id", document_id)\
            .execute()
        logger.info(f"Chunks supprimés pour document {document_id}")
    except Exception as e:
        logger.error(f"Erreur suppression chunks {document_id}: {e}")


async def vectorize_document(document_id: str, workspace_id: str, storage_path: str = None):
    """
    Vectorise un document et stocke les embeddings dans pgvector.
    Télécharge depuis Storage, découpe, vectorise, stocke dans Supabase.
    """
    supabase = get_supabase()
    
    try:
        # Mettre à jour le statut
        supabase.table("documents")\
            .update({"status": "processing"})\
            .eq("id", document_id)\
            .execute()
        
        # Récupérer les infos du document
        doc_result = supabase.table("documents")\
            .select("file_type, filename, storage_path")\
            .eq("id", document_id)\
            .single()\
            .execute()
        
        if not doc_result.data:
            raise ValueError("Document non trouvé")
        
        file_type = doc_result.data["file_type"]
        filename = doc_result.data["filename"]
        storage_path = storage_path or doc_result.data.get("storage_path")
        
        if not storage_path:
            raise ValueError("Chemin Storage non trouvé")
        
        # Récupérer la config RAG du workspace
        workspace_result = supabase.table("workspaces")\
            .select("rag_config")\
            .eq("id", workspace_id)\
            .single()\
            .execute()
        
        rag_config = workspace_result.data.get("rag_config", {}) if workspace_result.data else {}
        chunk_size = rag_config.get("chunk_size", settings.DEFAULT_CHUNK_SIZE)
        chunk_overlap = rag_config.get("chunk_overlap", settings.DEFAULT_CHUNK_OVERLAP)
        
        # Télécharger depuis Storage
        logger.info(f"Téléchargement depuis Storage: {storage_path}")
        content = await download_from_storage(storage_path)
        
        # Charger et découper le document
        documents = load_document_from_bytes(content, file_type, filename)
        
        # Ajouter des métadonnées
        for doc in documents:
            doc.metadata["document_id"] = document_id
            doc.metadata["source"] = filename
        
        chunks = split_documents(documents, chunk_size, chunk_overlap)
        
        logger.info(f"Document {filename}: {len(documents)} pages -> {len(chunks)} chunks")
        
        # Supprimer les anciens chunks (pour réindexation)
        await delete_document_chunks(document_id)
        
        # Générer les embeddings
        embed_model = get_embeddings()
        texts = [chunk.page_content for chunk in chunks]
        embeddings_vectors = embed_model.embed_documents(texts)
        
        # Insérer les chunks avec embeddings dans pgvector
        chunks_to_insert = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings_vectors)):
            chunks_to_insert.append({
                "document_id": document_id,
                "workspace_id": workspace_id,
                "content": chunk.page_content,
                "metadata": {
                    **chunk.metadata,
                    "chunk_index": i
                },
                "embedding": embedding  # pgvector accepte les listes Python
            })
        
        # Insérer par batch de 100
        batch_size = 100
        for i in range(0, len(chunks_to_insert), batch_size):
            batch = chunks_to_insert[i:i + batch_size]
            supabase.table("document_chunks").insert(batch).execute()
        
        logger.info(f"Inséré {len(chunks_to_insert)} chunks dans pgvector")
        
        # Mettre à jour le document
        supabase.table("documents")\
            .update({
                "status": "indexed",
                "chunk_count": len(chunks)
            })\
            .eq("id", document_id)\
            .execute()
        
        logger.info(f"Document {document_id} vectorisé avec succès")
        
    except Exception as e:
        logger.error(f"Erreur vectorisation {document_id}: {e}")
        import traceback
        traceback.print_exc()
        
        # Mettre à jour le statut en erreur
        supabase.table("documents")\
            .update({"status": "error"})\
            .eq("id", document_id)\
            .execute()


def search_vectorstore(workspace_id: str, query: str, top_k: int = 8) -> List[Document]:
    """
    Recherche vectorielle dans pgvector pour un workspace.
    Utilise la fonction SQL match_documents.
    """
    supabase = get_supabase()
    
    try:
        # Générer l'embedding de la requête
        embed_model = get_embeddings()
        query_embedding = embed_model.embed_query(query)
        
        # Appeler la fonction RPC de recherche
        result = supabase.rpc(
            "match_documents",
            {
                "query_embedding": query_embedding,
                "match_workspace_id": workspace_id,
                "match_count": top_k,
                "match_threshold": 0.3
            }
        ).execute()
        
        if not result.data:
            return []
        
        # Convertir en Documents LangChain
        documents = []
        for row in result.data:
            doc = Document(
                page_content=row["content"],
                metadata={
                    **(row.get("metadata") or {}),
                    "similarity": row["similarity"],
                    "chunk_id": row["id"],
                    "document_id": row["document_id"]
                }
            )
            documents.append(doc)
        
        logger.info(f"Recherche '{query[:50]}...' -> {len(documents)} résultats")
        return documents
        
    except Exception as e:
        logger.error(f"Erreur recherche vectorielle: {e}")
        return []


async def reindex_all_documents(workspace_id: str):
    """
    Réindexe tous les documents d'un workspace.
    """
    supabase = get_supabase()
    
    # Récupérer tous les documents du workspace
    result = supabase.table("documents")\
        .select("id, storage_path")\
        .eq("workspace_id", workspace_id)\
        .execute()
    
    if not result.data:
        logger.info(f"Aucun document à réindexer pour {workspace_id}")
        return
    
    # Supprimer tous les chunks existants du workspace
    supabase.table("document_chunks")\
        .delete()\
        .eq("workspace_id", workspace_id)\
        .execute()
    
    logger.info(f"Réindexation de {len(result.data)} documents pour {workspace_id}")
    
    # Réindexer chaque document
    for doc in result.data:
        try:
            await vectorize_document(doc["id"], workspace_id, doc.get("storage_path"))
        except Exception as e:
            logger.error(f"Erreur réindexation doc {doc['id']}: {e}")


def get_workspace_stats(workspace_id: str) -> dict:
    """Retourne les statistiques du vectorstore d'un workspace"""
    supabase = get_supabase()
    
    try:
        # Compter les chunks
        result = supabase.table("document_chunks")\
            .select("id", count="exact")\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        chunk_count = result.count or 0
        
        # Compter les documents indexés
        doc_result = supabase.table("documents")\
            .select("id", count="exact")\
            .eq("workspace_id", workspace_id)\
            .eq("status", "indexed")\
            .execute()
        
        doc_count = doc_result.count or 0
        
        return {
            "document_count": doc_count,
            "chunk_count": chunk_count,
            "storage": "supabase_pgvector"
        }
    except Exception as e:
        logger.error(f"Erreur stats workspace: {e}")
        return {"document_count": 0, "chunk_count": 0}
