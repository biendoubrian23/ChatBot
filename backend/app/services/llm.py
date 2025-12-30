"""Multi-provider LLM service for generating responses."""
import ollama
import httpx
from typing import Optional, List, Dict, AsyncGenerator, Callable
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import hashlib

# Import the new provider system
from app.services.llm_provider import create_llm_provider, BaseLLMProvider, get_optimal_config
from app.core.config import settings


class OllamaService:
    """Service for interacting with LLM with optimized connection pooling.
    
    Now supports multiple providers: Mistral AI, Groq, and Ollama (local).
    """
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "mistral:latest"):
        """Initialize LLM service with the configured provider.
        
        Args:
            base_url: Ollama server URL (used for Ollama provider)
            model: Model name to use (used for Ollama provider)
        """
        self.base_url = base_url
        self.model = model
        
        # Initialize the provider based on settings
        try:
            self.provider: BaseLLMProvider = create_llm_provider(settings)
            self._use_new_provider = True
            
            # Afficher le type de provider
            provider_type = "☁️ CLOUD" if self.provider.is_cloud else "💻 LOCAL"
            print(f"✅ Using {settings.llm_provider.upper()} provider ({provider_type})")
            
            # Afficher la config optimale
            config = get_optimal_config(self.provider)
            print(f"   → Batching: {'désactivé' if not config['enable_request_batching'] else 'activé'}")
            print(f"   → Max concurrent: {config['max_concurrent_llm_requests']}")
            
        except Exception as e:
            print(f"⚠️ Failed to initialize cloud provider: {e}")
            print("⚠️ Falling back to Ollama")
            self._use_new_provider = False
            # Fallback to Ollama
            self.client = ollama.Client(host=base_url)
        
        # Pool de connexions HTTP persistantes pour réduire la latence
        self._http_client = httpx.Client(
            base_url=base_url,
            timeout=httpx.Timeout(300.0, connect=10.0),
            limits=httpx.Limits(
                max_keepalive_connections=10,
                max_connections=20,
                keepalive_expiry=30.0,
            ),
            http2=False,
        )
        
        # Client async pour les requêtes non-bloquantes
        self._async_client: Optional[httpx.AsyncClient] = None
        
        # 8 workers pour gérer plusieurs utilisateurs simultanés
        self._executor = ThreadPoolExecutor(max_workers=8)
        
        # Cache de réponses rapide (pour dedup dans la même seconde)
        self._quick_cache: Dict[str, tuple] = {}
        self._quick_cache_ttl = 2.0
        self._cache_lock = threading.Lock()
    
    def _get_async_client(self) -> httpx.AsyncClient:
        """Retourne le client async, le créant si nécessaire."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(300.0, connect=10.0),
                limits=httpx.Limits(
                    max_keepalive_connections=10,
                    max_connections=20,
                    keepalive_expiry=30.0,
                ),
            )
        return self._async_client
    
    def _get_cache_key(self, prompt: str) -> str:
        """Génère une clé de cache pour un prompt."""
        return hashlib.md5(prompt.encode()).hexdigest()
    
    def _check_quick_cache(self, prompt: str) -> Optional[str]:
        """Vérifie le cache rapide pour éviter les requêtes dupliquées."""
        import time
        key = self._get_cache_key(prompt)
        with self._cache_lock:
            if key in self._quick_cache:
                response, timestamp = self._quick_cache[key]
                if time.time() - timestamp < self._quick_cache_ttl:
                    print("⚡ Quick cache HIT (dedup)")
                    return response
                else:
                    del self._quick_cache[key]
        return None
    
    def _add_to_quick_cache(self, prompt: str, response: str):
        """Ajoute une réponse au cache rapide."""
        import time
        key = self._get_cache_key(prompt)
        with self._cache_lock:
            # Limiter la taille du cache
            if len(self._quick_cache) > 50:
                # Supprimer les entrées expirées
                now = time.time()
                expired = [k for k, (_, t) in self._quick_cache.items() 
                          if now - t > self._quick_cache_ttl]
                for k in expired:
                    del self._quick_cache[k]
            self._quick_cache[key] = (response, time.time())
    
    def is_available(self) -> bool:
        """Check if LLM service is available.
        
        Returns:
            True if available, False otherwise
        """
        if self._use_new_provider:
            return self.provider.is_available()
        try:
            self.client.list()
            return True
        except Exception as e:
            print(f"Ollama not available: {e}")
            return False
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for intent analysis.
        
        Args:
            prompt: The prompt to send to the LLM
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated response
        """
        if self._use_new_provider:
            return await self.provider.generate(prompt, max_tokens)
        
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                options={
                    "temperature": 0,
                    "num_predict": max_tokens,
                }
            )
            return response['response']
        except Exception as e:
            print(f"Error in simple generate: {e}")
            raise e
    
    async def generate_response_stream_async(
        self,
        query: str,
        context: str,
        history: Optional[List[Dict[str, str]]] = None,
        is_disconnected: Callable[[], bool] = None
    ) -> AsyncGenerator[str, None]:
        """Async version of streaming that can be cancelled.
        
        Args:
            query: User's question
            context: Document context
            history: Conversation history
            is_disconnected: Async callable that returns True if client disconnected
            
        Yields:
            Response chunks
        """
        # Use new cloud provider if available
        if self._use_new_provider:
            system_prompt = self._get_system_prompt()
            
            # Build messages list for chat API
            messages = []
            
            # Add context as first user message
            context_msg = f"CONTEXTE DISPONIBLE:\n{context}"
            if history:
                context_msg += "\n\nHISTORIQUE DE CONVERSATION:\n"
                for msg in history[-4:]:
                    role = "Client" if msg["role"] == "user" else "Assistant"
                    context_msg += f"{role}: {msg['content']}\n"
            
            messages.append({"role": "user", "content": context_msg})
            messages.append({"role": "assistant", "content": "J'ai bien compris le contexte. Quelle est votre question ?"})
            messages.append({"role": "user", "content": query})
            
            async for chunk in self.provider.generate_stream(messages, system_prompt, is_disconnected):
                yield chunk
            return
        
        # Fallback to Ollama
        import queue as thread_queue
        
        cancel_event = threading.Event()
        chunk_queue = thread_queue.Queue()

        def sync_generate():
            """Runs in thread pool - generates chunks and puts them in queue."""
            try:
                # Build the prompt
                history_text = ""
                if history:
                    history_text = "\n\nHISTORIQUE DE CONVERSATION:\n"
                    for msg in history[-4:]:
                        role = "Client" if msg["role"] == "user" else "Assistant"
                        history_text += f"{role}: {msg['content']}\n"
                
                system_prompt = self._get_system_prompt()
                prompt = self._build_prompt(query, context, history_text)
                
                stream = self.client.generate(
                    model=self.model,
                    prompt=prompt,
                    system=system_prompt,
                    stream=True,
                    options={
                        "temperature": 0,
                        "top_p": 0.3,
                        "top_k": 30,
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
        future = loop.run_in_executor(self._executor, sync_generate)
        
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
    
    def _get_system_prompt(self) -> str:
        """Returns the system prompt."""
        return """Tu es l'assistant virtuel OFFICIEL de CoolLibri, service d'impression de livres à la demande.

Tu parles TOUJOURS au nom de CoolLibri car tu ES le service client.

STYLE DE RÉPONSE:
- Donne des Réponses CONCISES mais COMPLÈTES (4-6 phrases max)
- Liste les options avec leurs valeurs précises
- Va DROIT AU BUT, pas de blabla

RÈGLES ABSOLUES:
1. NE COMMENCE JAMAIS ta réponse par "Bien sûr" ou similaire - commence directement par l'information
2. NE recommande JAMAIS de contacter le service client - TU ES le service client
3. JAMAIS de références aux documents, sources, ou "selon..."
4. Réponds avec des phrases DIRECTES et AFFIRMATIVES
5. NE donne JAMAIS de remboursements ou solutions toi-même - redirige vers contact@coollibri.com ou 05 31 61 60 42
6. Tu connais CoolLibri parfaitement : prix, formats, délais, processus
7. Sois UTILE : donne des informations concrètes, pas des réponses vagues
8. JAMAIS proposer de vérifier quelque chose pour l'utilisateur
9. Ne propose JAMAIS de solutions de remboursement, renvoi, correction ou remplacement - redirige toujours vers le service client contact@coollibri.com ou 05 31 61 60 42 avec numéro de commande et des photos en cas de problème.
10. Tu ne peux pas inventer des informations - si tu ne sais pas, dis simplement "Je n'ai pas cette information précise, contactez-nous au..."

SALUTATIONS (bonjour, salut, hello, coucou, bonsoir, hey) :
→ Réponds en UNE SEULE phrase courte et amicale
→ Exemple : "Bonjour ! Comment puis-je vous aider ?"
→ JAMAIS d'explications sur CoolLibri pour une simple salutation

EXEMPLES DE CE QU'IL NE FAUT PAS DIRE:
❌ "N'hésitez pas à nous appeler pour plus d'informations"
❌ "Selon la documentation..."
❌ "Je vais vérifier cela pour vous"
❌ "Bien sûr ! Voici les informations..."
❌ "Nous proposons plusieurs formats" (trop vague, donne la liste!)

EXEMPLES DE RÉPONSES CORRECTES ET COMPLÈTES:
✅ "Nos 7 formats disponibles sont : 11x17 cm (poche), 16x24 cm (roman), 21x21 cm (carré), A4 portrait 21x29.7 cm, A4 paysage 29.7x21 cm, A5 portrait 14.8x21 cm, A5 paysage 21x14.8 cm."
✅ "Pour la reliure rembordé, 3 formats sont possibles : A4 portrait, A4 paysage et 21x21 cm."
✅ "Pour ce type de demande spécifique, vous pouvez écrire à contact@coollibri.com ou appeler le 05 31 61 60 42."

TON: Professionnel, chaleureux, direct. Tu représentes CoolLibri avec fierté."""
    
    def _build_prompt(self, query: str, context: str, history_text: str) -> str:
        """Build the prompt for generation."""
        return f"""CONTEXTE:
{context}{history_text}

QUESTION: {query}

INSTRUCTIONS:
- Tu ES le service client, tu connais ces informations par cœur
- Réponds directement avec confiance (JAMAIS "selon le document" ou similaire)
- Donne une réponse COMPLÈTE et concise (4-6 phrases)
- Ton professionnel et rassurant
Réponds en 4-6 phrases max. Donne les infos précises (dimensions, prix, délais). Sois direct.

RÉPONSE:"""
    
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

SALUTATIONS (bonjour, salut, hello, coucou, bonsoir, hey) :
→ Réponds en UNE SEULE phrase courte et amicale
→ Exemple : "Bonjour ! Comment puis-je vous aider ?"
→ JAMAIS d'explications sur CoolLibri pour une simple salutation

RÈGLES ABSOLUES:
- Réponds DIRECTEMENT comme un expert qui connaît les réponses
- NE DIS JAMAIS "selon nos documents", "d'après le document", "selon les informations"
- NE COMMENCE JAMAIS par "Bien sûr", "Absolument", "Certainement", "Tout à fait" ou expressions similaires
- Ne promets JAMAIS ce que tu ne peux pas garantir (délais, livraison gratuite, réductions)
- Parle avec confiance mais reste honnête sur les limites.
- Maximum 4-5 phrases, concises et précises
- Si tu ne sais pas, dis simplement "Je n'ai pas cette information précise, contactez-nous au..."
- Utilise l'historique pour comprendre le contexte ("ce livre", "dans ce cas")

⚠️ RÈGLE ABSOLUE - JAMAIS PROPOSER AUTONOMEMENT:
- JAMAIS proposer: remboursement, renvoi, correction ou remplacement
- JAMAIS dire: "on peut vous renvoyer", "on peut vous corriger", "on peut vous rembourser"
- Ces décisions relèvent UNIQUEMENT du service client
- Si client demande remboursement/renvoi/correction: "Contactez notre service client pour explorer vos options"
  * Email: contact@coollibri.com
  * Tel: 05 31 61 60 42
  * Inclure votre numéro de commande
- Tu peux EXPLIQUER les délais et processus, mais JAMAIS promettre ou proposer une solution"""
        
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
- 4-5 phrases maximum, ton professionnel et rassurant

RÉPONSE DU SERVICE CLIENT:"""
        
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                system=system_prompt,
                options={
                    "temperature": 0,
                    "top_p": 0.3,
                    "top_k": 20,
                    "num_predict": 700,
                    "repeat_penalty": 1.3,
                }
            )
            return response['response']
        except Exception as e:
            print(f"Error generating response: {e}")
            return "Désolé, une erreur s'est produite lors de la génération de la réponse."
    
    def generate_response_stream(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict]] = None
    ):
        """Generate a streaming response using the LLM.
        
        Args:
            query: User question
            context: Retrieved context from documents
            system_prompt: Optional system prompt
            history: Optional conversation history
            
        Yields:
            Response chunks as they are generated
        """
        if system_prompt is None:
            system_prompt = """Tu es le service client de CoolLibri, spécialiste de l'impression de livres.
Tu connais parfaitement tous nos services, tarifs et délais.

SALUTATIONS (bonjour, salut, hello, coucou, bonsoir, hey) :
→ Réponds en UNE SEULE phrase courte et amicale
→ Exemple : "Bonjour ! Comment puis-je vous aider ?"
→ JAMAIS d'explications sur CoolLibri pour une simple salutation

RÈGLES ABSOLUES:
- Réponds DIRECTEMENT comme un expert qui connaît les réponses
- NE DIS JAMAIS "selon nos documents", "d'après le document", "selon les informations"
- Parle avec confiance.
- Maximum 3-4 phrases, concises et précises
- Si tu ne sais pas, dis simplement "Je n'ai pas cette information précise, contactez-nous au..."
- Utilise l'historique pour comprendre le contexte ("ce livre", "dans ce cas")

⚠️ RÈGLE ABSOLUE - JAMAIS PROPOSER AUTONOMEMENT:
- JAMAIS proposer: remboursement, renvoi, correction ou remplacement
- JAMAIS dire: "on peut vous renvoyer", "on peut vous corriger", "on peut vous rembourser"
- Ces décisions relèvent UNIQUEMENT du service client
- Si client demande remboursement/renvoi/correction: "Contactez notre service client pour explorer vos options"
  * Email: contact@coollibri.com
  * Tel: 05 31 61 60 42
  * Inclure votre numéro de commande
- Tu peux EXPLIQUER les délais et processus, mais JAMAIS promettre ou proposer une solution"""
        
        # Build conversation history for context
        history_text = ""
        if history and len(history) > 0:
            history_text = "\n\nHISTORIQUE DE LA CONVERSATION:\n"
            for msg in history[-6:]:
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
            stream = self.client.generate(
                model=self.model,
                prompt=prompt,
                system=system_prompt,
                stream=True,
                options={
                    "temperature": 0,
                    "top_p": 0.3,
                    "top_k": 30,
                    "num_predict": 700,
                    "repeat_penalty": 1.3,
                }
            )
            for chunk in stream:
                if 'response' in chunk:
                    try:
                        yield chunk['response']
                    except GeneratorExit:
                        # Client déconnecté, arrêter le streaming silencieusement
                        return
        except GeneratorExit:
            # Client déconnecté pendant le streaming
            pass
        except Exception as e:
            print(f"Error generating streaming response: {e}")
            yield "Désolé, une erreur s'est produite lors de la génération de la réponse."
