"""Ollama LLM service for generating responses."""
import ollama
from typing import Optional, List, Dict


class OllamaService:
    """Service for interacting with Ollama LLM."""
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "mistral:7b"):
        """Initialize Ollama service.
        
        Args:
            base_url: Ollama server URL
            model: Model name to use
        """
        self.base_url = base_url
        self.model = model
        self.client = ollama.Client(host=base_url)
    
    def is_available(self) -> bool:
        """Check if Ollama service is available.
        
        Returns:
            True if available, False otherwise
        """
        try:
            self.client.list()
            return True
        except Exception as e:
            print(f"Ollama not available: {e}")
            return False
    
    def generate_response(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate a response using the LLM.
        
        Args:
            query: User question
            context: Retrieved context from documents
            system_prompt: Optional system prompt
            
        Returns:
            Generated response
        """
        if system_prompt is None:
            system_prompt = """Tu es un assistant pour CoolLibri. Réponds de manière CONCISE et DIRECTE.
- Maximum 2-3 phrases
- Va à l'essentiel
- Si tu ne sais pas, dis-le simplement"""
        
        # Construct the prompt
        prompt = f"""Contexte:
{context}

Question: {query}

Réponds en 2-3 phrases maximum, de manière directe et concise.

Réponse:"""
        
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                system=system_prompt,
                options={
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "top_k": 40,
                    "num_predict": 150,
                }
            )
            return response['response']
        except Exception as e:
            print(f"Error generating response: {e}")
            return "Désolé, une erreur s'est produite lors de la génération de la réponse."
    
    async def generate_response_stream(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None
    ):
        """Generate a streaming response (for future use).
        
        Args:
            query: User question
            context: Retrieved context
            system_prompt: Optional system prompt
            
        Yields:
            Response chunks
        """
        if system_prompt is None:
            system_prompt = """Tu es LibriAssist, l'assistant intelligent de CoolLibri. 
Tu es professionnel, courtois et précis. Réponds aux questions en te basant uniquement 
sur le contexte fourni."""
        
        prompt = f"""Contexte:
{context}

Question: {query}

Réponse:"""
        
        try:
            stream = self.client.generate(
                model=self.model,
                prompt=prompt,
                system=system_prompt,
                stream=True
            )
            
            for chunk in stream:
                yield chunk['response']
        except Exception as e:
            print(f"Error in streaming response: {e}")
            yield "Erreur lors de la génération de la réponse."
