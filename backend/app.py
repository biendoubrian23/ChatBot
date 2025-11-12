"""
LibriAssist Backend - Hugging Face Spaces Deployment
FastAPI backend with integrated Llama LLM for RAG chatbot
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your existing app components
from app.core.config import settings
from app.api import routes
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService
from app.services.huggingface_llm import HuggingFaceLLMService
from app.services.rag_pipeline import RAGPipeline

# Create FastAPI app
app = FastAPI(
    title="LibriAssist API",
    version="1.0.0",
    description="RAG Chatbot for CoolLibri - Powered by Llama on Hugging Face"
)

# Configure CORS for Netlify
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://libriassist.netlify.app",
        "https://*.netlify.app",
        "http://localhost:3000",
        "*"  # For HF Spaces preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services (initialized on startup)
embedding_service = None
vectorstore_service = None
llm_service = None
rag_pipeline = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global embedding_service, vectorstore_service, llm_service, rag_pipeline
    
    print("🚀 Initializing LibriAssist backend...")
    
    # 1. Initialize embeddings
    print("📚 Loading embedding model...")
    embedding_service = EmbeddingService()
    
    # 2. Initialize vector store
    print("🔍 Loading vector store...")
    vectorstore_service = VectorStoreService(
        embedding_service=embedding_service,
        persist_directory="./data/vectorstore"
    )
    
    # 3. Initialize Hugging Face LLM (with GPU if available)
    print("🤖 Loading Llama model...")
    model_name = os.getenv("LLM_MODEL", "meta-llama/Llama-2-7b-chat-hf")
    llm_service = HuggingFaceLLMService(model_name=model_name)
    
    # 4. Initialize RAG pipeline
    print("⚡ Setting up RAG pipeline...")
    rag_pipeline = RAGPipeline(
        vectorstore=vectorstore_service,
        llm_service=llm_service,
        top_k=5,
        rerank_top_n=3
    )
    
    print("✅ LibriAssist backend ready!")
    print(f"📊 Vector store contains {vectorstore_service.collection.count()} documents")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "LibriAssist API - Powered by Hugging Face",
        "status": "running",
        "model": llm_service.model_name if llm_service else "loading...",
        "device": llm_service.device if llm_service else "unknown",
        "documents": vectorstore_service.collection.count() if vectorstore_service else 0
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "services": {
            "embeddings": embedding_service is not None,
            "vectorstore": vectorstore_service is not None,
            "llm": llm_service is not None,
            "rag": rag_pipeline is not None
        }
    }


# Include your existing chat routes
app.include_router(routes.router, prefix="/api/v1", tags=["chatbot"])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))  # HF Spaces uses port 7860
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )
