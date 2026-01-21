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
from app.core.database import DocumentsDB, WorkspacesDB, VectorStoreDB
import tempfile
import shutil
import asyncio
from datetime import datetime, timedelta

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


def _ensure_vectorstore_local(workspace_id: str) -> bool:
    """S'assure que le vectorstore est présent localement (depuis DB si besoin)"""
    vs_path = get_vectorstore_path(workspace_id)
    index_path = os.path.join(vs_path, "index.faiss")
    
    # Vérifier le timestamp DB
    db_updated_at = VectorStoreDB.get_last_updated(workspace_id)
    
    should_download = False
    
    if not os.path.exists(index_path):
        # Cas 1: Pas de fichier local -> Télécharger
        should_download = True
    elif db_updated_at:
        # Cas 2: Fichier local existe, vérifier s'il est à jour
        local_updated_at = datetime.fromtimestamp(os.path.getmtime(index_path)).replace(tzinfo=None)
        
        # Enlever tzinfo de db_updated_at pour comparer
        if db_updated_at.tzinfo:
            db_updated_at = db_updated_at.replace(tzinfo=None)
            
        # Si DB est plus récent que local (+ marge 2s), on télécharge
        if db_updated_at > local_updated_at + timedelta(seconds=2):
            logger.info(f"Vectorstore DB plus récent ({db_updated_at}) que local ({local_updated_at})")
            should_download = True
    
    if not should_download:
        return os.path.exists(index_path)
    
    # Télécharger depuis DB
    index_blob = VectorStoreDB.get_file(workspace_id, "index.faiss")
    pkl_blob = VectorStoreDB.get_file(workspace_id, "index.pkl")
    
    if index_blob and pkl_blob:
        os.makedirs(vs_path, exist_ok=True)
        with open(os.path.join(vs_path, "index.faiss"), "wb") as f:
            f.write(index_blob)
        with open(os.path.join(vs_path, "index.pkl"), "wb") as f:
            f.write(pkl_blob)
        logger.info(f"Vectorstore synchronisé depuis la DB pour {workspace_id}")
        return True
    
    # Fallback: Si pas en DB, mais on l'avait localement (ca ne devrait pas arriver ici si should_download=True, mais sécurité)
    return os.path.exists(index_path)


def _persist_vectorstore_to_db(workspace_id: str):
    """Sauvegarde le vectorstore local dans la DB"""
    vs_path = get_vectorstore_path(workspace_id)
    if not os.path.exists(vs_path):
        return
    
    # Lire les fichiers
    try:
        index_path = os.path.join(vs_path, "index.faiss")
        pkl_path = os.path.join(vs_path, "index.pkl")
        
        if os.path.exists(index_path):
            with open(index_path, "rb") as f:
                VectorStoreDB.save_file(workspace_id, "index.faiss", f.read())
        
        if os.path.exists(pkl_path):
            with open(pkl_path, "rb") as f:
                VectorStoreDB.save_file(workspace_id, "index.pkl", f.read())
                
        logger.info(f"Vectorstore sauvegardé en DB pour {workspace_id}")
    except Exception as e:
        logger.error(f"Erreur sauvegarde vectorstore DB: {e}")


def delete_vectorstore(workspace_id: str) -> bool:
    """
    Supprime complètement le vectorstore d'un workspace.
    Local + DB
    """
    vs_path = get_vectorstore_path(workspace_id)
    
    # Supprimer local
    if os.path.exists(vs_path):
        try:
            shutil.rmtree(vs_path)
            logger.info(f"Vectorstore local supprimé: {vs_path}")
        except Exception as e:
            logger.error(f"Erreur suppression vectorstore local {vs_path}: {e}")
    
    # Supprimer DB
    try:
        VectorStoreDB.delete_workspace_vectorstore(workspace_id)
        logger.info(f"Vectorstore DB supprimé pour {workspace_id}")
    except Exception as e:
        logger.error(f"Erreur suppression vectorstore DB: {e}")
        
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
    try:
        # Mettre à jour le statut
        DocumentsDB.update_status(document_id, "processing")
        
        # Récupérer les infos du document
        doc_info = DocumentsDB.get_by_id(document_id)
        
        if not doc_info:
            raise ValueError("Document non trouvé")
        
        file_type = doc_info.get("file_type", "txt")
        filename = doc_info.get("filename", "unknown")
        
        # Récupérer la config RAG du workspace
        workspace = WorkspacesDB.get_by_id(workspace_id)
        rag_config = workspace.get("rag_config", {}) if workspace else {}
        
        # Parser rag_config si c'est une string JSON
        if isinstance(rag_config, str):
            import json
            try:
                rag_config = json.loads(rag_config)
            except:
                rag_config = {}
        
        chunk_size = rag_config.get("chunk_size", settings.DEFAULT_CHUNK_SIZE)
        chunk_overlap = rag_config.get("chunk_overlap", settings.DEFAULT_CHUNK_OVERLAP)
        
        # Charger le contenu du document
        # 1. Essayer depuis la DB
        content = DocumentsDB.get_content(document_id)
        
        # 2. Si pas en DB, essayer le fichier disque (migration)
        if not content and os.path.exists(file_path):
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                # Sauvegarder en DB pour la prochaine fois
                DocumentsDB.save_content(document_id, content)
                logger.info(f"Contenu migré fichier->DB pour {filename}")
            except Exception as e:
                logger.warning(f"Impossible de lire le fichier disque {file_path}: {e}")
        
        if not content:
            raise ValueError("Contenu du document introuvable (DB et disque)")
            
        # 3. Ecrire dans un fichier temporaire pour le loader
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
            
        try:
            # Charger et découper le document depuis le fichier temporaire
            documents = load_document(tmp_path, file_type)
        finally:
            # Nettoyer le fichier temporaire
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass
        
        # Ajouter des métadonnées
        for doc in documents:
            doc.metadata["document_id"] = document_id
            doc.metadata["source"] = filename
        
        chunks = split_documents(documents, chunk_size, chunk_overlap)
        
        logger.info(f"Document {filename}: {len(documents)} pages -> {len(chunks)} chunks (chunk_size={chunk_size}, overlap={chunk_overlap})")
        
        # Charger ou créer le vectorstore
        # S'assurer qu'on a la dernière version locale
        _ensure_vectorstore_local(workspace_id)
        vs_path = get_vectorstore_path(workspace_id)
        
        if os.path.exists(vs_path):
            # Charger le vectorstore existant
            vectorstore = FAISS.load_local(
                vs_path, 
                get_embeddings(),
                allow_dangerous_deserialization=True
            )
            
            # Supprimer les anciens chunks de ce document (pour réindexation propre)
            try:
                # Récupérer tous les documents du vectorstore qui ne sont PAS de ce document_id
                all_docs = []
                seen_contents = set()  # Pour éviter les doublons de contenu
                docstore = vectorstore.docstore
                
                for doc_id in vectorstore.index_to_docstore_id.values():
                    doc = docstore.search(doc_id)
                    if doc and doc.metadata.get("document_id") != document_id:
                        # Créer une clé unique basée sur le contenu pour éviter les doublons
                        content_hash = hash(doc.page_content[:500] if len(doc.page_content) > 500 else doc.page_content)
                        if content_hash not in seen_contents:
                            seen_contents.add(content_hash)
                            all_docs.append(doc)
                
                # Aussi vérifier les chunks à ajouter pour éviter les doublons
                unique_chunks = []
                for chunk in chunks:
                    content_hash = hash(chunk.page_content[:500] if len(chunk.page_content) > 500 else chunk.page_content)
                    if content_hash not in seen_contents:
                        seen_contents.add(content_hash)
                        unique_chunks.append(chunk)
                
                logger.info(f"Réindexation: {len(all_docs)} chunks existants conservés, {len(unique_chunks)} nouveaux ajoutés (suppression de {len(chunks) - len(unique_chunks)} doublons)")
                
                # Recréer le vectorstore avec les docs existants + nouveaux chunks uniques
                # Utiliser from_documents qui gère les IDs automatiquement
                if all_docs or unique_chunks:
                    vectorstore = FAISS.from_documents(all_docs + unique_chunks, get_embeddings())
                else:
                    vectorstore = FAISS.from_documents(chunks, get_embeddings())
                    
            except Exception as e:
                logger.error(f"Erreur lors de la mise à jour incrémentale: {e}")
                
                # FALLBACK SÉCURISÉ : Reconstruire TOUT le vectorstore depuis la DB
                logger.info("⚠️ Fallback: Reconstruction COMPLÈTE du vectorstore depuis la DB (pour ne rien perdre)")
                
                # 1. Récupérer tous les docs NON-error du workspace
                workspace_docs = DocumentsDB.get_all_by_workspace(workspace_id)
                all_chunks_to_index = []
                
                for doc_info in workspace_docs:
                    # Ne pas traiter le doc actuel (on a déjà ses chunks)
                    if doc_info['id'] == document_id:
                        all_chunks_to_index.extend(chunks)
                        continue
                        
                    # Ignorer les docs en erreur
                    if doc_info.get('status') == 'error':
                        continue
                        
                    # Récupérer contenu
                    d_content = DocumentsDB.get_content(doc_info['id'])
                    if d_content:
                        # Gérer l'encodage (utf-8 vs latin-1 vs bytes)
                        if isinstance(d_content, bytes):
                            try:
                                text_content = d_content.decode('utf-8')
                            except UnicodeDecodeError:
                                # Fallback encoding
                                try:
                                    text_content = d_content.decode('iso-8859-1')
                                except:
                                    # Last resort: ignore errors
                                    text_content = d_content.decode('utf-8', errors='ignore')
                        else:
                            text_content = str(d_content)

                        # Créer doc temporaire
                        from langchain_core.documents import Document
                        base_doc = Document(
                            page_content=text_content,
                            metadata={
                                "document_id": doc_info['id'],
                                "source": doc_info.get('filename', 'unknown')
                            }
                        )
                        # Splitter (attention, recalcul coûteux mais nécessaire en fallback)
                        d_chunks = split_documents([base_doc], chunk_size, chunk_overlap)
                        all_chunks_to_index.extend(d_chunks)
                
                if all_chunks_to_index:
                     vectorstore = FAISS.from_documents(all_chunks_to_index, get_embeddings())
                else:
                     vectorstore = FAISS.from_documents(chunks, get_embeddings())

        else:
            # Créer nouveau vectorstore
            vectorstore = FAISS.from_documents(chunks, get_embeddings())
        
        # Sauvegarder localement
        os.makedirs(os.path.dirname(vs_path), exist_ok=True)
        vectorstore.save_local(vs_path)
        
        # Persister en DB
        _persist_vectorstore_to_db(workspace_id)
        
        # Mettre à jour le document avec le statut indexed
        DocumentsDB.update_status(document_id, "indexed", len(chunks))
        
        logger.info(f"Document {document_id} vectorisé: {len(chunks)} chunks")
        
    except Exception as e:
        logger.error(f"Erreur vectorisation {document_id}: {e}")
        
        # Mettre à jour le statut en erreur
        DocumentsDB.update_status(document_id, "error")


def search_vectorstore(workspace_id: str, query: str, top_k: int = 8) -> List[Document]:
    """Recherche dans le vectorstore d'un workspace"""
    vs_path = get_vectorstore_path(workspace_id)
    
    if not _ensure_vectorstore_local(workspace_id):
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
    
    if not _ensure_vectorstore_local(workspace_id):
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
            # Persister en DB
            _persist_vectorstore_to_db(workspace_id)
        else:
            # Plus de documents, supprimer le vectorstore
            delete_vectorstore(workspace_id)
        
        logger.info(f"Document {document_id} supprimé du vectorstore")
        
    except Exception as e:
        logger.error(f"Erreur suppression vectorstore: {e}")


def rebuild_workspace_vectorstore(workspace_id: str):
    """Reconstruit entièrement le vectorstore d'un workspace"""
    
    # Récupérer tous les documents indexés
    documents = DocumentsDB.get_by_workspace(workspace_id)
    # Filtrer pour ne garder que ceux qui sont indexés (ou devraient l'être)
    # Note: Dans DocumentsDB.get_by_workspace on récupère tout, on filtre ici
    indexed_docs = [d for d in documents if d.get("status") == "indexed"]
    
    if not indexed_docs:
        logger.info(f"Aucun document à indexer pour {workspace_id}")
        return
    
    # Config RAG
    workspace = WorkspacesDB.get_by_id(workspace_id)
    rag_config = workspace.get("rag_config", {}) if workspace else {}
    
    # Parser rag_config si c'est une string JSON
    if isinstance(rag_config, str):
        import json
        try:
            rag_config = json.loads(rag_config)
        except:
            rag_config = {}
    
    chunk_size = rag_config.get("chunk_size", settings.DEFAULT_CHUNK_SIZE)
    chunk_overlap = rag_config.get("chunk_overlap", settings.DEFAULT_CHUNK_OVERLAP)
    
    all_chunks = []
    
    for doc in indexed_docs:
        try:
            doc_id = doc.get("id")
            file_type = doc.get("file_type", "txt")
            filename = doc.get("filename", "unknown")
            file_path = doc.get("file_path")
            
            # Charger le contenu
            content = DocumentsDB.get_content(doc_id)
            
            # Migration si nécessaire
            if not content and file_path and os.path.exists(file_path):
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    DocumentsDB.save_content(doc_id, content)
                except:
                    pass
            
            if not content:
                logger.warning(f"Contenu introuvable pour {filename}")
                continue
                
            # Temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp:
                tmp.write(content)
                tmp_path = tmp.name
                
            try:
                documents = load_document(tmp_path, file_type)
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except:
                        pass
            
            for d in documents:
                d.metadata["document_id"] = doc_id
                d.metadata["source"] = filename
            
            chunks = split_documents(documents, chunk_size, chunk_overlap)
            all_chunks.extend(chunks)
            
        except Exception as e:
            logger.error(f"Erreur chargement {doc.get('filename')}: {e}")
    
    if all_chunks:
        vs_path = get_vectorstore_path(workspace_id)
        
        # Supprimer l'ancien s'il existe pour repartir de zéro
        delete_vectorstore(workspace_id)

        vectorstore = FAISS.from_documents(all_chunks, get_embeddings())
        os.makedirs(os.path.dirname(vs_path), exist_ok=True)
        vectorstore.save_local(vs_path)
        
        # Persister en DB
        _persist_vectorstore_to_db(workspace_id)
        
        logger.info(f"Vectorstore {workspace_id} reconstruit: {len(all_chunks)} chunks")
    else:
        logger.warning(f"Aucun chunk à indexer pour {workspace_id}")
