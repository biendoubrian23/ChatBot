"""PDF processing service for document extraction."""
import os
import re
from typing import List, Dict
from pathlib import Path
import PyPDF2
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document


class PDFProcessor:
    """Process PDF documents and extract text."""
    
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 100):
        """Initialize PDF processor.
        
        Args:
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def extract_text_pypdf2(self, pdf_path: str) -> str:
        """Extract text using PyPDF2.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Extracted text
        """
        text = ""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error extracting text with PyPDF2 from {pdf_path}: {e}")
        return text
    
    def extract_text_pdfplumber(self, pdf_path: str) -> str:
        """Extract text using pdfplumber (more accurate).
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Extracted text
        """
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Error extracting text with pdfplumber from {pdf_path}: {e}")
        return text
    
    def clean_text(self, text: str) -> str:
        """Clean extracted text.
        
        Args:
            text: Raw text
            
        Returns:
            Cleaned text
        """
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.,;:?!()\-\'/]', '', text)
        # Remove page numbers (simple pattern)
        text = re.sub(r'\n\d+\n', '\n', text)
        return text.strip()
    
    def process_pdf(self, pdf_path: str) -> List[Document]:
        """Process a PDF file and create chunks.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of Document objects
        """
        # Extract text (try pdfplumber first, fallback to PyPDF2)
        text = self.extract_text_pdfplumber(pdf_path)
        if not text or len(text) < 100:
            text = self.extract_text_pypdf2(pdf_path)
        
        # Clean text
        text = self.clean_text(text)
        
        if not text:
            print(f"Warning: No text extracted from {pdf_path}")
            return []
        
        # Create chunks
        chunks = self.text_splitter.split_text(text)
        
        # Create Document objects with metadata
        documents = []
        filename = Path(pdf_path).name
        for i, chunk in enumerate(chunks):
            doc = Document(
                page_content=chunk,
                metadata={
                    "source": filename,
                    "chunk_id": i,
                    "total_chunks": len(chunks)
                }
            )
            documents.append(doc)
        
        return documents
    
    def process_directory(self, directory_path: str) -> List[Document]:
        """Process all PDF files in a directory.
        
        Args:
            directory_path: Path to directory containing PDFs
            
        Returns:
            List of all Document objects
        """
        all_documents = []
        pdf_files = list(Path(directory_path).glob("*.pdf"))
        
        if not pdf_files:
            print(f"Warning: No PDF files found in {directory_path}")
            return []
        
        print(f"Processing {len(pdf_files)} PDF files...")
        
        for pdf_file in pdf_files:
            print(f"Processing: {pdf_file.name}")
            documents = self.process_pdf(str(pdf_file))
            all_documents.extend(documents)
            print(f"  → Created {len(documents)} chunks")
        
        print(f"\nTotal: {len(all_documents)} chunks from {len(pdf_files)} documents")
        return all_documents
