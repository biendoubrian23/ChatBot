"""Script to view the chunks stored in the vector database."""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.config import settings
from app.services.embeddings import EmbeddingService
from app.services.vectorstore import VectorStoreService


def main():
    """View all chunks in the vector store."""
    print("📚 LibriAssist - Chunk Viewer")
    print("=" * 70)
    
    # Initialize services
    print("\n🔧 Initializing services...")
    embedding_service = EmbeddingService(settings.embedding_model)
    
    vectorstore = VectorStoreService(
        persist_directory=settings.vectorstore_path,
        embedding_service=embedding_service
    )
    
    # Get all documents
    total_docs = vectorstore.count()
    print(f"\n📊 Total chunks in database: {total_docs}")
    
    if total_docs == 0:
        print("❌ No documents found. Run index_documents.py first.")
        return
    
    # Get all data from collection
    results = vectorstore.collection.get()
    
    print("\n" + "=" * 70)
    print("CHUNKS PREVIEW")
    print("=" * 70)
    
    # Display first 5 chunks as preview
    for i in range(min(5, len(results['documents']))):
        print(f"\n📄 CHUNK #{i + 1}")
        print("-" * 70)
        print(f"Source: {results['metadatas'][i].get('source', 'Unknown')}")
        print(f"Chunk ID: {results['metadatas'][i].get('chunk_id', 'Unknown')}")
        print(f"Total chunks in doc: {results['metadatas'][i].get('total_chunks', 'Unknown')}")
        print(f"\n📝 Content:")
        print(results['documents'][i][:300] + "..." if len(results['documents'][i]) > 300 else results['documents'][i])
        print("-" * 70)
    
    if total_docs > 5:
        print(f"\n💡 Showing 5 of {total_docs} chunks. To see all, modify this script.")
    
    # Statistics
    print(f"\n📈 STATISTICS")
    print("=" * 70)
    sources = {}
    for metadata in results['metadatas']:
        source = metadata.get('source', 'Unknown')
        sources[source] = sources.get(source, 0) + 1
    
    print("\nChunks per document:")
    for source, count in sources.items():
        print(f"  • {source}: {count} chunks")
    
    # Save all chunks to a text file
    output_file = Path(__file__).parent.parent / "data" / "chunks_export.txt"
    output_file.parent.mkdir(exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("LIBRIASSIST - ALL CHUNKS EXPORT\n")
        f.write("=" * 70 + "\n\n")
        
        for i, (doc, metadata) in enumerate(zip(results['documents'], results['metadatas'])):
            f.write(f"\n{'=' * 70}\n")
            f.write(f"CHUNK #{i + 1}\n")
            f.write(f"{'=' * 70}\n")
            f.write(f"Source: {metadata.get('source', 'Unknown')}\n")
            f.write(f"Chunk ID: {metadata.get('chunk_id', 'Unknown')}\n")
            f.write(f"Total chunks: {metadata.get('total_chunks', 'Unknown')}\n")
            f.write(f"\nContent:\n")
            f.write("-" * 70 + "\n")
            f.write(doc + "\n")
            f.write("-" * 70 + "\n")
    
    print(f"\n💾 All chunks exported to: {output_file}")
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
