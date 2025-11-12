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
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict]] = None
    ) -> str:
        """Generate a response using the LLM.
        
        Args:
            query: User question
            context: Retrieved context from documents
            system_prompt: Optional system prompt
            history: Optional conversation history [{"role": "user|assistant", "content": "..."}]
            
        Returns:
            Generated response
        """
        if system_prompt is None:
            system_prompt = """Tu es le service client de CoolLibri, spécialiste de l'impression de livres.
Tu connais parfaitement tous nos services, tarifs et délais.

RÈGLES ABSOLUES:
- Réponds DIRECTEMENT comme un expert qui connaît les réponses
- NE DIS JAMAIS "selon nos documents", "d'après le document", "selon les informations"
- Parle avec confiance.
- Maximum 3-4 phrases, concises et précises
- Si tu ne sais pas, dis simplement "Je n'ai pas cette information précise, contactez-nous au..."
- Utilise l'historique pour comprendre le contexte ("ce livre", "dans ce cas")"""
        
        # Build conversation history for context
        history_text = ""
        if history and len(history) > 0:
            history_text = "\n\nHISTORIQUE DE LA CONVERSATION:\n"
            for msg in history[-6:]:  # Limit to last 6 messages to avoid token overflow
                role_label = "Client" if msg["role"] == "user" else "Assistant"
                history_text += f"{role_label}: {msg['content']}\n"
        
        # Construct the prompt
        prompt = f"""INFORMATIONS DISPONIBLES:
{context}{history_text}

QUESTION DU CLIENT: {query}

INSTRUCTIONS:
- Tu ES le service client, tu connais ces informations par cœur
- Réponds directement avec confiance (JAMAIS "selon le document" ou similaire)
- 3-4 phrases maximum, ton professionnel et rassurant

RÉPONSE DU SERVICE CLIENT:"""
        
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                system=system_prompt,
                options={
                    "temperature": 0.1,  # Réduit pour plus de précision
                    "top_p": 0.9,
                    "top_k": 30,
                    "num_predict": 300,
                    "repeat_penalty": 1.3,
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
