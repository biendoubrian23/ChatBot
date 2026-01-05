"""MONITORA Backend - LLM Provider Service"""
import httpx
import asyncio
from typing import Optional, List, Dict, AsyncGenerator, Callable
from abc import ABC, abstractmethod

from app.core.config import settings


class BaseLLMProvider(ABC):
    """Base class for LLM providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for quick responses."""
        pass
    
    @abstractmethod
    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0,
    ) -> str:
        """Generate chat completion."""
        pass
    
    @abstractmethod
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available."""
        pass


class MistralProvider(BaseLLMProvider):
    """Mistral AI provider."""
    
    def __init__(self, api_key: str, model: str = "mistral-small-latest"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.mistral.ai/v1"
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
    
    def is_available(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except:
            return False
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        response = await self._client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0,
    ) -> str:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        response = await self._client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": full_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        async with self._client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": full_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "stream": True
            }
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data)
                        if chunk["choices"][0].get("delta", {}).get("content"):
                            yield chunk["choices"][0]["delta"]["content"]
                    except:
                        continue


class GroqProvider(BaseLLMProvider):
    """Groq provider."""
    
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.groq.com/openai/v1"
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
    
    def is_available(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except:
            return False
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        response = await self._client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0,
    ) -> str:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        response = await self._client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": full_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 900,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        async with self._client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": full_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "stream": True
            }
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data)
                        if chunk["choices"][0].get("delta", {}).get("content"):
                            yield chunk["choices"][0]["delta"]["content"]
                    except:
                        continue


class LLMProviderFactory:
    """Factory to get the right LLM provider based on configuration."""
    
    _providers: Dict[str, BaseLLMProvider] = {}
    
    @classmethod
    def get_provider(cls, provider_name: str, model: str) -> BaseLLMProvider:
        """Get or create a provider instance."""
        key = f"{provider_name}:{model}"
        
        if key not in cls._providers:
            if provider_name == "mistral":
                if not settings.mistral_api_key:
                    raise ValueError("MISTRAL_API_KEY not configured")
                cls._providers[key] = MistralProvider(
                    api_key=settings.mistral_api_key,
                    model=model
                )
            elif provider_name == "groq":
                if not settings.groq_api_key:
                    raise ValueError("GROQ_API_KEY not configured")
                cls._providers[key] = GroqProvider(
                    api_key=settings.groq_api_key,
                    model=model
                )
            else:
                raise ValueError(f"Unknown provider: {provider_name}")
        
        return cls._providers[key]
