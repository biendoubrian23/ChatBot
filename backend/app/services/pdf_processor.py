"""PDF processing service for document extraction."""
import os
import re
from typing import List, Dict, Optional
from pathlib import Path
import PyPDF2
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

from app.core.config import settings


class PDFProcessor:
    """Service to process PDF files and extract text."""
    
    def __init__(self, chunk_size: Optional[int] = None, chunk_overlap: Optional[int] = None):
        """Initialize PDF processor.
        
        Args:
            chunk_size: Size of text chunks (default: from config, optimized for Mistral)
            chunk_overlap: Overlap between chunks (default: from config)
        """
        # Utiliser la config centralisée par défaut
        chunk_size = chunk_size or settings.chunk_size
        chunk_overlap = chunk_overlap or settings.chunk_overlap
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
    
    def process_txt(self, txt_path: str) -> List[Document]:
        """Process a TXT file and create chunks.
        
        Args:
            txt_path: Path to TXT file
            
        Returns:
            List of Document objects
        """
        try:
            # Read the text file
            with open(txt_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # Clean text
            text = self.clean_text(text)
            
            if not text:
                print(f"Warning: No text extracted from {txt_path}")
                return []
            
            # Create chunks
            chunks = self.text_splitter.split_text(text)
            
            # Create Document objects with metadata
            documents = []
            filename = Path(txt_path).name
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
        except Exception as e:
            print(f"Error processing TXT file {txt_path}: {e}")
            return []
    
    def process_directory(self, directory_path: str) -> List[Document]:
        """Process all PDF and TXT files in a directory.
        
        Args:
            directory_path: Path to directory containing PDFs and TXT files
            
        Returns:
            List of all Document objects
        """
        all_documents = []
        
        # Process PDF files
        pdf_files = list(Path(directory_path).glob("*.pdf"))
        txt_files = list(Path(directory_path).glob("*.txt"))
        
        total_files = len(pdf_files) + len(txt_files)
        
        if total_files == 0:
            print(f"Warning: No PDF or TXT files found in {directory_path}")
            return []
        
        print(f"Processing {len(pdf_files)} PDF files and {len(txt_files)} TXT files...")
        
        # Process PDFs
        for pdf_file in pdf_files:
            print(f"Processing PDF: {pdf_file.name}")
            documents = self.process_pdf(str(pdf_file))
            all_documents.extend(documents)
            print(f"  → Created {len(documents)} chunks")
        
        # Process TXTs
        for txt_file in txt_files:
            print(f"Processing TXT: {txt_file.name}")
            documents = self.process_txt(str(txt_file))
            all_documents.extend(documents)
            print(f"  → Created {len(documents)} chunks")
        
        print(f"\nTotal: {len(all_documents)} chunks from {total_files} documents")
        return all_documents
