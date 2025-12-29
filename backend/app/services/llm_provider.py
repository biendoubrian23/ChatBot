"""Multi-provider LLM service supporting Mistral AI, Groq, and Ollama."""
import os
import httpx
import asyncio
from typing import Optional, List, Dict, AsyncGenerator, Callable
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
import threading


class BaseLLMProvider(ABC):
    """Base class for LLM providers."""
    
    # Indique si c'est un provider cloud (True) ou local (False)
    is_cloud: bool = True
    
    @abstractmethod
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for intent analysis."""
        pass
    
    @abstractmethod
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        is_disconnected: Callable[[], bool] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available."""
        pass


class MistralProvider(BaseLLMProvider):
    """Mistral AI provider using their official API."""
    
    is_cloud = True  # Provider cloud
    
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
        print(f"🚀 MistralProvider initialized with model: {model}")
    
    def is_available(self) -> bool:
        """Check if Mistral API is accessible."""
        try:
            import httpx
            with httpx.Client(timeout=5.0) as client:
                response = client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Mistral API not available: {e}")
            return False
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for intent analysis."""
        try:
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
        except Exception as e:
            print(f"Error in Mistral generate: {e}")
            raise e
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        is_disconnected: Callable[[], bool] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from Mistral API."""
        try:
            full_messages = [{"role": "system", "content": system_prompt}] + messages
            
            async with self._client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": full_messages,
                    "max_tokens": 900,
                    "temperature": 0.1,
                    "top_p": 1,  # Must be 1 with low temperature
                    "stream": True
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if is_disconnected and await is_disconnected():
                        return
                    
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            import json
                            chunk = json.loads(data)
                            if chunk["choices"][0].get("delta", {}).get("content"):
                                content = chunk["choices"][0]["delta"]["content"]
                                yield content
                                # Délai naturel style ChatGPT
                                await asyncio.sleep(0.12)
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                            
        except Exception as e:
            print(f"Error in Mistral streaming: {e}")
            yield "Désolé, une erreur s'est produite."


class GroqProvider(BaseLLMProvider):
    """Groq provider using their OpenAI-compatible API."""
    
    is_cloud = True  # Provider cloud
    
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
        print(f"🚀 GroqProvider initialized with model: {model}")
    
    def is_available(self) -> bool:
        """Check if Groq API is accessible."""
        try:
            import httpx
            with httpx.Client(timeout=5.0) as client:
                response = client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Groq API not available: {e}")
            return False
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for intent analysis."""
        try:
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
        except Exception as e:
            print(f"Error in Groq generate: {e}")
            raise e
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        is_disconnected: Callable[[], bool] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from Groq API."""
        try:
            full_messages = [{"role": "system", "content": system_prompt}] + messages
            
            async with self._client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": full_messages,
                    "max_tokens": 900,
                    "temperature": 0.1,
                    "stream": True
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if is_disconnected and await is_disconnected():
                        return
                    
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            import json
                            chunk = json.loads(data)
                            if chunk["choices"][0].get("delta", {}).get("content"):
                                content = chunk["choices"][0]["delta"]["content"]
                                yield content
                                # Délai naturel style ChatGPT
                                await asyncio.sleep(0.12)
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                            
        except Exception as e:
            print(f"Error in Groq streaming: {e}")
            yield "Désolé, une erreur s'est produite."


class OllamaProvider(BaseLLMProvider):
    """Ollama local provider (fallback)."""
    
    is_cloud = False  # Provider LOCAL - nécessite batching et limites
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "mistral:latest"):
        self.base_url = base_url
        self.model = model
        self._executor = ThreadPoolExecutor(max_workers=8)
        try:
            import ollama
            self.client = ollama.Client(host=base_url)
            print(f"🚀 OllamaProvider initialized with model: {model}")
        except ImportError:
            print("⚠️ Ollama package not installed")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Ollama is running."""
        if self.client is None:
            return False
        try:
            self.client.list()
            return True
        except Exception as e:
            print(f"Ollama not available: {e}")
            return False
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for intent analysis."""
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                options={"temperature": 0, "num_predict": max_tokens}
            )
            return response['response']
        except Exception as e:
            print(f"Error in Ollama generate: {e}")
            raise e
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        is_disconnected: Callable[[], bool] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from Ollama."""
        import queue as thread_queue
        
        cancel_event = threading.Event()
        chunk_queue = thread_queue.Queue()
        
        # Build prompt from messages
        prompt = ""
        for msg in messages:
            role = "Client" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
        
        def sync_generate():
            try:
                stream = self.client.generate(
                    model=self.model,
                    prompt=prompt,
                    system=system_prompt,
                    stream=True,
                    options={
                        "temperature": 0,
                        "top_p": 0.3,
                        "num_predict": 900,
                        "repeat_penalty": 1.3,
                    }
                )
                for chunk in stream:
                    if cancel_event.is_set():
                        break
                    if 'response' in chunk:
                        chunk_queue.put(chunk['response'])
            except Exception as e:
                if not cancel_event.is_set():
                    chunk_queue.put(f"__ERROR__:{str(e)}")
            finally:
                chunk_queue.put(None)
        
        loop = asyncio.get_event_loop()
        loop.run_in_executor(self._executor, sync_generate)
        
        try:
            while True:
                if is_disconnected and await is_disconnected():
                    cancel_event.set()
                    return
                
                try:
                    chunk = chunk_queue.get_nowait()
                    if chunk is None:
                        break
                    if isinstance(chunk, str) and chunk.startswith("__ERROR__:"):
                        yield "Désolé, une erreur s'est produite."
                        break
                    yield chunk
                    await asyncio.sleep(0.12)
                except thread_queue.Empty:
                    await asyncio.sleep(0.01)
                    continue
        except asyncio.CancelledError:
            cancel_event.set()
            raise
        finally:
            cancel_event.set()


def create_llm_provider(settings) -> BaseLLMProvider:
    """Factory function to create the appropriate LLM provider based on settings."""
    provider = settings.llm_provider.lower()
    
    if provider == "mistral":
        if not settings.mistral_api_key:
            raise ValueError("MISTRAL_API_KEY not set in .env")
        return MistralProvider(
            api_key=settings.mistral_api_key,
            model=settings.mistral_model
        )
    
    elif provider == "groq":
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY not set in .env")
        return GroqProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model
        )
    
    elif provider == "ollama":
        return OllamaProvider(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model
        )
    
    else:
        raise ValueError(f"Unknown LLM provider: {provider}. Use 'mistral', 'groq', or 'ollama'")


def get_optimal_config(provider: BaseLLMProvider) -> dict:
    """
    Retourne la configuration optimale selon le type de provider.
    
    Cloud (Mistral/Groq): Pas de batching, haute concurrence
    Local (Ollama): Batching activé, concurrence limitée
    """
    if provider.is_cloud:
        return {
            "enable_request_batching": False,
            "max_concurrent_llm_requests": 50,
            "batch_window_ms": 50,
            "max_batch_size": 20,
        }
    else:
        # Ollama local - limité par le GPU
        return {
            "enable_request_batching": True,
            "max_concurrent_llm_requests": 4,
            "batch_window_ms": 100,
            "max_batch_size": 8,
        }
