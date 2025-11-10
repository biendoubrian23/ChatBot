"""Pydantic models for API requests and responses."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ChatRequest(BaseModel):
    """Chat request model."""
    question: str = Field(..., min_length=1, max_length=1000, description="User question")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")


class SourceDocument(BaseModel):
    """Source document model."""
    content: str = Field(..., description="Document content")
    metadata: dict = Field(default_factory=dict, description="Document metadata")
    relevance_score: Optional[float] = Field(None, description="Relevance score")


class ChatResponse(BaseModel):
    """Chat response model."""
    answer: str = Field(..., description="Generated answer")
    sources: List[SourceDocument] = Field(default_factory=list, description="Source documents")
    conversation_id: str = Field(..., description="Conversation ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    ollama_available: bool = Field(..., description="Ollama service availability")
    vectorstore_loaded: bool = Field(..., description="Vector store status")


class IndexStatus(BaseModel):
    """Document indexing status model."""
    status: str = Field(..., description="Indexing status")
    documents_processed: int = Field(..., description="Number of documents processed")
    chunks_created: int = Field(..., description="Number of chunks created")
    message: str = Field(..., description="Status message")
