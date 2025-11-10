"""Embedding service using SentenceTransformers."""
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize embedding service.
        
        Args:
            model_name: Name of the SentenceTransformer model
        """
        self.model_name = model_name
        print(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        print(f"✓ Embedding model loaded successfully")
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text.
        
        Args:
            text: Input text
            
        Returns:
            Embedding vector
        """
        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist()
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts.
        
        Args:
            texts: List of input texts
            
        Returns:
            List of embedding vectors
        """
        embeddings = self.model.encode(texts, convert_to_tensor=False, show_progress_bar=True)
        return embeddings.tolist()
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of the embedding vectors.
        
        Returns:
            Embedding dimension
        """
        return self.model.get_sentence_embedding_dimension()
