"""
Provider LLM - Mistral et Groq
"""
import os
import logging
from typing import AsyncIterator, List, Dict, Optional
from mistralai import Mistral
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider:
    """Provider unifié pour Mistral et Groq"""
    
    def __init__(self, provider: str = "mistral", model: Optional[str] = None):
        self.provider = provider.lower()
        
        if self.provider == "mistral":
            self.model = model or settings.MISTRAL_MODEL
            self.client = Mistral(api_key=settings.MISTRAL_API_KEY)
        elif self.provider == "groq":
            self.model = model or settings.GROQ_MODEL
            self.client = Groq(api_key=settings.GROQ_API_KEY)
        else:
            raise ValueError(f"Provider non supporté: {provider}")
    
    def _format_messages(
        self, 
        system_prompt: str, 
        user_message: str, 
        history: List[Dict] = None
    ) -> List[Dict]:
        """Formate les messages pour l'API"""
        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            for msg in history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        messages.append({"role": "user", "content": user_message})
        return messages
    
    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        history: List[Dict] = None,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0
    ) -> str:
        """Génère une réponse (non-streaming)"""
        messages = self._format_messages(system_prompt, user_message, history)
        
        try:
            if self.provider == "mistral":
                response = self.client.chat.complete(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p
                )
                return response.choices[0].message.content
            
            elif self.provider == "groq":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p
                )
                return response.choices[0].message.content
                
        except Exception as e:
            logger.error(f"Erreur LLM {self.provider}: {e}")
            raise
    
    async def stream(
        self,
        system_prompt: str,
        user_message: str,
        history: List[Dict] = None,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0
    ) -> AsyncIterator[str]:
        """Génère une réponse en streaming"""
        messages = self._format_messages(system_prompt, user_message, history)
        
        try:
            if self.provider == "mistral":
                stream = self.client.chat.stream(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p
                )
                
                for chunk in stream:
                    if chunk.data.choices[0].delta.content:
                        yield chunk.data.choices[0].delta.content
            
            elif self.provider == "groq":
                stream = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    stream=True
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                        
        except Exception as e:
            logger.error(f"Erreur streaming {self.provider}: {e}")
            raise


# Factory function
def get_llm_provider(provider: str = "mistral", model: str = None) -> LLMProvider:
    """Crée un provider LLM"""
    return LLMProvider(provider=provider, model=model)
