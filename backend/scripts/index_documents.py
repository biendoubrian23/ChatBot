"""Script to index PDF documents into the vector store."""
import sys
import os
from pathlib import Path
import shutil

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.config import settings
from app.services.pdf_processor import PDFProcessor
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService


def move_scraped_files():
    """Move scraped files from docs/scraped/ to docs/"""
    scraped_dir = Path(settings.docs_path) / "scraped"
    docs_dir = Path(settings.docs_path)
    
    if not scraped_dir.exists():
        return 0
    
    moved_count = 0
    for file in scraped_dir.glob("*.txt"):
        dest = docs_dir / file.name
        shutil.move(str(file), str(dest))
        moved_count += 1
    
    # Supprimer le dossier scraped s'il est vide
    if scraped_dir.exists() and not any(scraped_dir.iterdir()):
        scraped_dir.rmdir()
    
    return moved_count


def main():
    """Index PDF documents."""
    print("📚 LibriAssist - Document Indexer")
    print("=" * 50)
    
    # Move scraped files first
    moved = move_scraped_files()
    if moved > 0:
        print(f"\n📦 Moved {moved} scraped files from docs/scraped/ to docs/")
    
    # Check if docs directory exists
    docs_path = Path(settings.docs_path)
    if not docs_path.exists():
        print(f"❌ Error: Documents directory not found: {docs_path}")
        print(f"Creating directory: {docs_path}")
        docs_path.mkdir(parents=True, exist_ok=True)
        print("Please add PDF files to this directory and run again.")
        return
    
    # Initialize services
    print("\n🔧 Initializing services...")
    
    pdf_processor = PDFProcessor(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )
    
    embedding_service = EmbeddingService(settings.embedding_model)
    
    vectorstore = VectorStoreService(
        persist_directory=settings.vectorstore_path,
        embedding_service=embedding_service
    )
    
    # Process PDFs
    print(f"\n📄 Processing PDFs from: {docs_path}")
    documents = pdf_processor.process_directory(str(docs_path))
    
    if not documents:
        print("\n❌ No documents were processed. Make sure PDF files exist in the docs directory.")
        return
    
    # Clear existing vector store (optional)
    print("\n🗑️  Clearing existing vector store...")
    vectorstore.clear()
    
    # Add documents to vector store
    print("\n💾 Adding documents to vector store...")
    vectorstore.add_documents(documents)
    
    print("\n✅ Indexing complete!")
    print(f"📊 Total documents in vector store: {vectorstore.count()}")
    print("\n💡 You can now start the API server with: python main.py")


if __name__ == "__main__":
    main()
