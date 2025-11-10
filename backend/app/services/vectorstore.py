"""Vector store service using ChromaDB."""
import os
from typing import List, Tuple
import chromadb
from chromadb.config import Settings
from langchain.schema import Document
from app.services.embeddings import EmbeddingService


class VectorStoreService:
    """Service for managing vector storage and retrieval."""
    
    def __init__(self, persist_directory: str, embedding_service: EmbeddingService):
        """Initialize vector store.
        
        Args:
            persist_directory: Directory for persisting the vector store
            embedding_service: Embedding service instance
        """
        self.persist_directory = persist_directory
        self.embedding_service = embedding_service
        
        # Create directory if it doesn't exist
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection_name = "coolibri_docs"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        print(f"✓ Vector store initialized with {self.collection.count()} documents")
    
    def add_documents(self, documents: List[Document]) -> None:
        """Add documents to the vector store.
        
        Args:
            documents: List of Document objects
        """
        if not documents:
            print("No documents to add")
            return
        
        print(f"Adding {len(documents)} documents to vector store...")
        
        # Extract texts and metadata
        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        
        # Generate embeddings
        embeddings = self.embedding_service.embed_texts(texts)
        
        # Generate IDs
        ids = [f"doc_{i}" for i in range(len(documents))]
        
        # Add to collection
        self.collection.add(
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✓ Added {len(documents)} documents to vector store")
    
    def similarity_search(self, query: str, k: int = 5) -> List[Tuple[Document, float]]:
        """Search for similar documents.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of (Document, score) tuples
        """
        # Generate query embedding
        query_embedding = self.embedding_service.embed_text(query)
        
        # Search
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        
        # Convert to Document objects
        documents_with_scores = []
        
        if results['documents'] and results['documents'][0]:
            for i, (doc_text, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                # Convert distance to similarity score (cosine similarity)
                score = 1 - distance
                doc = Document(
                    page_content=doc_text,
                    metadata=metadata
                )
                documents_with_scores.append((doc, score))
        
        return documents_with_scores
    
    def clear(self) -> None:
        """Clear all documents from the vector store."""
        try:
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            print("✓ Vector store cleared")
        except Exception as e:
            print(f"Error clearing vector store: {e}")
    
    def count(self) -> int:
        """Get the number of documents in the vector store.
        
        Returns:
            Number of documents
        """
        return self.collection.count()
