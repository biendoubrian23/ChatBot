"""Ollama LLM service for generating responses."""
import ollama
from typing import Optional, List, Dict, AsyncGenerator, Callable
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading


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
        self._executor = ThreadPoolExecutor(max_workers=4)
    
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
    
    async def generate(self, prompt: str, max_tokens: int = 50) -> str:
        """Simple generation for intent analysis.
        
        Args:
            prompt: The prompt to send to the LLM
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated response
        """
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
        import queue as thread_queue
        
        cancel_event = threading.Event()
        chunk_queue = thread_queue.Queue()  # Thread-safe queue standard
        
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
                        "num_predict": 1000,
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
                # Signal end
                chunk_queue.put(None)
        
        # Start generation in thread pool
        loop = asyncio.get_event_loop()
        future = loop.run_in_executor(self._executor, sync_generate)
        
        try:
            while True:
                # Check if disconnected
                if is_disconnected and await is_disconnected():
                    cancel_event.set()
                    return
                
                # Non-blocking check for chunks
                try:
                    chunk = chunk_queue.get_nowait()
                    
                    if chunk is None:
                        break
                    
                    if isinstance(chunk, str) and chunk.startswith("__ERROR__:"):
                        yield "Désolé, une erreur s'est produite."
                        break
                    
                    yield chunk
                except thread_queue.Empty:
                    # No chunk yet, wait a tiny bit and retry
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

RÈGLES DE COMPLÉTUDE (TRÈS IMPORTANT):
- Donne une réponse COMPLÈTE et DÉTAILLÉE
- Liste TOUS les formats, options ou variantes disponibles
- Inclus TOUJOURS les chiffres, dimensions et valeurs précises
- N'oublie AUCUNE information importante du contexte fourni
- Si plusieurs options existent, LISTE-LES TOUTES avec leurs caractéristiques

RÈGLES ABSOLUES:
1. NE COMMENCE JAMAIS ta réponse par "Bien sûr" ou similaire - commence directement par l'information
2. NE recommande JAMAIS de contacter le service client - TU ES le service client
3. JAMAIS de références aux documents, sources, ou "selon..."
4. Réponds avec des phrases DIRECTES et AFFIRMATIVES
5. NE donne JAMAIS de remboursements ou solutions toi-même - redirige vers contact@coollibri.com ou 05 31 61 60 42
6. Tu connais CoolLibri parfaitement : prix, formats, délais, processus
7. Sois UTILE : donne des informations concrètes et EXHAUSTIVES, pas des réponses vagues
8. JAMAIS proposer de vérifier quelque chose pour l'utilisateur

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

TON: Professionnel, chaleureux, direct et EXHAUSTIF. Tu représentes CoolLibri avec fierté."""
    
    def _build_prompt(self, query: str, context: str, history_text: str) -> str:
        """Build the prompt for generation."""
        return f"""INFORMATIONS INTERNES COOLIBRI:
{context}{history_text}

QUESTION DU CLIENT: {query}

INSTRUCTIONS:
- Tu ES le service client, tu connais ces informations par cœur
- Réponds directement avec confiance (JAMAIS "selon le document" ou similaire)
- Donne une réponse COMPLÈTE : liste TOUS les détails, formats, options avec leurs dimensions/valeurs exactes
- N'oublie AUCUNE information pertinente du contexte ci-dessus
- Ton professionnel et rassurant

RÉPONSE DU SERVICE CLIENT:"""
    
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
                    "num_predict": 1000,
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
                    "num_predict": 1000,
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
