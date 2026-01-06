"""
Service de gestion des Vectorstores
Utilise LangChain avec FAISS pour le stockage vectoriel
"""
import os
import logging
from typing import List, Optional
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    UnstructuredMarkdownLoader,
    CSVLoader
)
from langchain_core.documents import Document
from app.core.config import settings
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)

# Embeddings (modèle léger mais efficace)
EMBEDDINGS_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
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


def get_vectorstore_path(workspace_id: str) -> str:
    """Retourne le chemin du vectorstore pour un workspace"""
    return os.path.join(settings.VECTORSTORE_PATH, workspace_id)


def delete_vectorstore(workspace_id: str) -> bool:
    """
    Supprime complètement le vectorstore d'un workspace.
    Utilisé avant une réindexation complète.
    """
    import shutil
    vs_path = get_vectorstore_path(workspace_id)
    
    if os.path.exists(vs_path):
        try:
            shutil.rmtree(vs_path)
            logger.info(f"Vectorstore supprimé: {vs_path}")
            return True
        except Exception as e:
            logger.error(f"Erreur suppression vectorstore {vs_path}: {e}")
            return False
    return True


def load_document(file_path: str, file_type: str) -> List[Document]:
    """Charge un document selon son type"""
    try:
        if file_type == "txt":
            # Forcer l'encodage UTF-8 pour les fichiers texte
            loader = TextLoader(file_path, encoding='utf-8')
        elif file_type == "pdf":
            loader = PyPDFLoader(file_path)
        elif file_type == "md":
            loader = UnstructuredMarkdownLoader(file_path)
        elif file_type == "csv":
            loader = CSVLoader(file_path, encoding='utf-8')
        else:
            raise ValueError(f"Type de fichier non supporté: {file_type}")
        
        return loader.load()
    except Exception as e:
        logger.error(f"Erreur chargement {file_path}: {e}")
        raise


def split_documents(documents: List[Document], chunk_size: int = 1500, chunk_overlap: int = 300) -> List[Document]:
    """Découpe les documents en chunks"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_documents(documents)


async def vectorize_document(document_id: str, workspace_id: str, file_path: str):
    """
    Vectorise un document et l'ajoute au vectorstore du workspace.
    Fonction asynchrone appelée en arrière-plan après upload.
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
            .select("file_type, filename")\
            .eq("id", document_id)\
            .single()\
            .execute()
        
        if not doc_result.data:
            raise ValueError("Document non trouvé")
        
        file_type = doc_result.data["file_type"]
        filename = doc_result.data["filename"]
        
        # Récupérer la config RAG du workspace
        workspace_result = supabase.table("workspaces")\
            .select("rag_config")\
            .eq("id", workspace_id)\
            .single()\
            .execute()
        
        rag_config = workspace_result.data.get("rag_config", {}) if workspace_result.data else {}
        chunk_size = rag_config.get("chunk_size", settings.DEFAULT_CHUNK_SIZE)
        chunk_overlap = rag_config.get("chunk_overlap", settings.DEFAULT_CHUNK_OVERLAP)
        
        # Charger et découper le document
        documents = load_document(file_path, file_type)
        
        # Ajouter des métadonnées
        for doc in documents:
            doc.metadata["document_id"] = document_id
            doc.metadata["source"] = filename
        
        chunks = split_documents(documents, chunk_size, chunk_overlap)
        
        logger.info(f"Document {filename}: {len(documents)} pages -> {len(chunks)} chunks (chunk_size={chunk_size}, overlap={chunk_overlap})")
        
        # Charger ou créer le vectorstore
        vs_path = get_vectorstore_path(workspace_id)
        
        if os.path.exists(vs_path):
            # Charger le vectorstore existant
            vectorstore = FAISS.load_local(
                vs_path, 
                get_embeddings(),
                allow_dangerous_deserialization=True
            )
            
            # Supprimer les anciens chunks de ce document (pour réindexation)
            # On reconstruit un nouveau vectorstore sans les chunks de ce document
            try:
                # Récupérer tous les documents du vectorstore
                all_docs = []
                docstore = vectorstore.docstore
                for doc_id in vectorstore.index_to_docstore_id.values():
                    doc = docstore.search(doc_id)
                    # Garder seulement les docs qui ne sont PAS de ce document_id
                    if doc and doc.metadata.get("document_id") != document_id:
                        all_docs.append(doc)
                
                if all_docs:
                    # Recréer le vectorstore avec les docs existants + nouveaux chunks
                    vectorstore = FAISS.from_documents(all_docs + chunks, get_embeddings())
                else:
                    # Pas d'autres docs, créer avec seulement les nouveaux chunks
                    vectorstore = FAISS.from_documents(chunks, get_embeddings())
                    
                logger.info(f"Réindexation: {len(all_docs)} chunks existants conservés, {len(chunks)} nouveaux ajoutés")
            except Exception as e:
                logger.warning(f"Erreur lors de la suppression des anciens chunks, ajout simple: {e}")
                vectorstore.add_documents(chunks)
        else:
            # Créer nouveau
            vectorstore = FAISS.from_documents(chunks, get_embeddings())
        
        # Sauvegarder
        os.makedirs(os.path.dirname(vs_path), exist_ok=True)
        vectorstore.save_local(vs_path)
        
        # Mettre à jour le document
        supabase.table("documents")\
            .update({
                "status": "indexed",
                "chunk_count": len(chunks)
            })\
            .eq("id", document_id)\
            .execute()
        
        logger.info(f"Document {document_id} vectorisé: {len(chunks)} chunks")
        
    except Exception as e:
        logger.error(f"Erreur vectorisation {document_id}: {e}")
        
        # Mettre à jour le statut en erreur (sans metadata car colonne inexistante)
        supabase.table("documents")\
            .update({"status": "error"})\
            .eq("id", document_id)\
            .execute()


def search_vectorstore(workspace_id: str, query: str, top_k: int = 8) -> List[Document]:
    """Recherche dans le vectorstore d'un workspace"""
    vs_path = get_vectorstore_path(workspace_id)
    
    if not os.path.exists(vs_path):
        logger.warning(f"Vectorstore inexistant pour {workspace_id}")
        return []
    
    try:
        vectorstore = FAISS.load_local(
            vs_path,
            get_embeddings(),
            allow_dangerous_deserialization=True
        )
        
        results = vectorstore.similarity_search(query, k=top_k)
        return results
        
    except Exception as e:
        logger.error(f"Erreur recherche vectorstore {workspace_id}: {e}")
        return []


def delete_document_from_vectorstore(workspace_id: str, document_id: str):
    """
    Supprime un document du vectorstore.
    Note: FAISS ne supporte pas la suppression directe,
    il faut reconstruire le vectorstore sans ce document.
    """
    vs_path = get_vectorstore_path(workspace_id)
    
    if not os.path.exists(vs_path):
        return
    
    try:
        vectorstore = FAISS.load_local(
            vs_path,
            get_embeddings(),
            allow_dangerous_deserialization=True
        )
        
        # Récupérer tous les documents sauf celui à supprimer
        all_docs = []
        for doc_id in vectorstore.index_to_docstore_id.values():
            doc = vectorstore.docstore.search(doc_id)
            if doc and doc.metadata.get("document_id") != document_id:
                all_docs.append(doc)
        
        if all_docs:
            # Recréer le vectorstore
            new_vectorstore = FAISS.from_documents(all_docs, get_embeddings())
            new_vectorstore.save_local(vs_path)
        else:
            # Plus de documents, supprimer le vectorstore
            import shutil
            shutil.rmtree(vs_path)
        
        logger.info(f"Document {document_id} supprimé du vectorstore")
        
    except Exception as e:
        logger.error(f"Erreur suppression vectorstore: {e}")


def rebuild_workspace_vectorstore(workspace_id: str):
    """Reconstruit entièrement le vectorstore d'un workspace"""
    supabase = get_supabase()
    
    # Récupérer tous les documents indexés
    docs_result = supabase.table("documents")\
        .select("id, file_path, file_type, filename")\
        .eq("workspace_id", workspace_id)\
        .eq("status", "indexed")\
        .execute()
    
    if not docs_result.data:
        logger.info(f"Aucun document à indexer pour {workspace_id}")
        return
    
    # Config RAG
    workspace_result = supabase.table("workspaces")\
        .select("rag_config")\
        .eq("id", workspace_id)\
        .single()\
        .execute()
    
    rag_config = workspace_result.data.get("rag_config", {}) if workspace_result.data else {}
    chunk_size = rag_config.get("chunk_size", settings.DEFAULT_CHUNK_SIZE)
    chunk_overlap = rag_config.get("chunk_overlap", settings.DEFAULT_CHUNK_OVERLAP)
    
    all_chunks = []
    
    for doc in docs_result.data:
        try:
            documents = load_document(doc["file_path"], doc["file_type"])
            
            for d in documents:
                d.metadata["document_id"] = doc["id"]
                d.metadata["source"] = doc["filename"]
            
            chunks = split_documents(documents, chunk_size, chunk_overlap)
            all_chunks.extend(chunks)
            
        except Exception as e:
            logger.error(f"Erreur chargement {doc['filename']}: {e}")
    
    if all_chunks:
        vs_path = get_vectorstore_path(workspace_id)
        vectorstore = FAISS.from_documents(all_chunks, get_embeddings())
        os.makedirs(os.path.dirname(vs_path), exist_ok=True)
        vectorstore.save_local(vs_path)
        
        logger.info(f"Vectorstore {workspace_id} reconstruit: {len(all_chunks)} chunks")
    else:
        logger.warning(f"Aucun chunk à indexer pour {workspace_id}")
