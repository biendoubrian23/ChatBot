"""Service intelligent pour analyser les messages utilisateurs avec LLM-first."""
import re
import json
import hashlib
import threading
from typing import Optional, Dict, Any
from app.services.llm import OllamaService


# Cache global thread-safe pour les intentions (clé = hash du message normalisé)
_INTENT_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_MAX_SIZE = 500  # Limiter la taille du cache
_CACHE_LOCK = threading.Lock()  # Verrou pour accès concurrent


class MessageAnalyzer:
    """
    Analyse les messages avec le LLM comme cerveau principal.
    
    Flux LLM-First + Cache (Thread-Safe):
    1. Vérifier si l'intention est en cache (avec verrou)
    2. Sinon, le LLM analyse le message et détermine l'intention
    3. Mettre en cache le résultat (avec verrou)
    
    Optimisé pour plusieurs utilisateurs simultanés.
    """
    
    def __init__(self, llm_service: OllamaService):
        """
        Initialize le MessageAnalyzer avec un service LLM.
        
        Args:
            llm_service: Instance du service Ollama pour l'analyse LLM
        """
        self.llm = llm_service
    
    def _get_cache_key(self, message: str) -> str:
        """Génère une clé de cache basée sur le message normalisé."""
        # Normaliser: minuscule, sans espaces multiples, sans ponctuation superflue
        normalized = re.sub(r'\s+', ' ', message.lower().strip())
        # Garder les chiffres intacts pour les numéros de commande
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def _check_cache(self, message: str) -> Optional[Dict[str, Any]]:
        """Vérifie si l'intention est en cache (thread-safe)."""
        key = self._get_cache_key(message)
        with _CACHE_LOCK:
            if key in _INTENT_CACHE:
                cached = _INTENT_CACHE[key].copy()
                cached["source"] = "cache"
                print(f"⚡ Cache HIT: {cached['intent']}")
                return cached
        return None
    
    def _add_to_cache(self, message: str, analysis: Dict[str, Any]) -> None:
        """Ajoute une analyse au cache (thread-safe)."""
        global _INTENT_CACHE
        key = self._get_cache_key(message)
        
        with _CACHE_LOCK:
            # Limiter la taille du cache
            if len(_INTENT_CACHE) >= _CACHE_MAX_SIZE:
                # Supprimer les 100 plus anciennes entrées
                keys_to_remove = list(_INTENT_CACHE.keys())[:100]
                for k in keys_to_remove:
                    del _INTENT_CACHE[k]
            
            _INTENT_CACHE[key] = analysis.copy()
    
    async def analyze_with_llm(self, message: str) -> Dict[str, Any]:
        """
        Analyse complète du message par le LLM.
        PROMPT OPTIMISÉ pour vitesse + qualité.
        
        Returns:
            {
                "intent": "order_tracking" | "general_question",
                "order_number": str | None,
                "reasoning": str
            }
        """
        # PROMPT OPTIMISÉ: distingue bien questions générales vs suivi de commande
        prompt = f"""Analyse ce message client CoolLibri (imprimerie livres):
"{message}"

INTENTION:
- ORDER_TRACKING = veut le STATUT/SUIVI de SA commande PERSONNELLE ("où en est MA commande?", "commande 13349", "mon colis?", "je veux suivre ma commande", juste un numéro de commande)
- GENERAL_QUESTION = questions GÉNÉRALES sur CoolLibri: délais de livraison en général, prix, formats, fonctionnement, annulation, réclamation, qualité, problèmes, remboursement

⚠️ ATTENTION: Si le client pose une question GÉNÉRALE sur les délais ("quels sont les délais de livraison?", "combien de temps pour recevoir un livre?", "délais d'expédition?") SANS parler de SA commande → c'est GENERAL_QUESTION

NUMÉRO: Extrais UNIQUEMENT un numéro PRÉSENT dans le message. Sinon null.

JSON uniquement:
{{"intent":"ORDER_TRACKING|GENERAL_QUESTION","order_number":"xxxxx|null","reasoning":"court"}}"""

        try:
            # max_tokens réduit de 20%: 150 → 120
            response = await self.llm.generate(prompt, max_tokens=120)
            response_clean = response.strip()
            
            # Nettoyer la réponse pour extraire le JSON
            # Parfois le LLM ajoute des backticks ou du texte autour
            if "```json" in response_clean:
                response_clean = response_clean.split("```json")[1].split("```")[0]
            elif "```" in response_clean:
                response_clean = response_clean.split("```")[1].split("```")[0]
            
            # Trouver le JSON dans la réponse
            json_match = re.search(r'\{[^{}]*\}', response_clean, re.DOTALL)
            if json_match:
                response_clean = json_match.group(0)
            
            # Parser le JSON
            result = json.loads(response_clean)
            
            intent = result.get("intent", "GENERAL_QUESTION").upper()
            order_number = result.get("order_number")
            reasoning = result.get("reasoning", "")
            
            # Normaliser l'intention
            if "ORDER" in intent or "TRACKING" in intent:
                intent = "order_tracking"
            else:
                intent = "general_question"
            
            # Nettoyer le numéro de commande
            if order_number and order_number != "null" and order_number != "None":
                # Extraire uniquement les chiffres
                order_number = re.sub(r'[^\d]', '', str(order_number))
                if not order_number or len(order_number) < 4:
                    order_number = None
                else:
                    # VALIDATION CRUCIALE: Vérifier que le numéro existe VRAIMENT dans le message
                    if order_number not in message:
                        print(f"⚠️ LLM a inventé un numéro ({order_number}) - ignoré car absent du message")
                        order_number = None
            else:
                order_number = None
            
            print(f"🧠 LLM Analysis: intent={intent}, order_number={order_number}, reasoning={reasoning}")
            
            return {
                "intent": intent,
                "order_number": order_number,
                "reasoning": reasoning,
                "source": "llm"
            }
            
        except json.JSONDecodeError as e:
            print(f"⚠️ Erreur parsing JSON LLM: {e}")
            print(f"   Réponse brute: {response_clean[:200] if 'response_clean' in dir() else 'N/A'}")
            # Fallback: essayer de détecter l'intention dans la réponse brute
            return self._fallback_analysis(message, response_clean if 'response_clean' in dir() else "")
            
        except Exception as e:
            print(f"⚠️ Erreur LLM: {e}")
            return self._fallback_analysis(message, "")
    
    def _fallback_analysis(self, message: str, llm_response: str) -> Dict[str, Any]:
        """
        Analyse de secours si le LLM échoue ou retourne un JSON invalide.
        Utilise des heuristiques simples.
        """
        message_lower = message.lower()
        llm_response_upper = llm_response.upper()
        
        # Essayer de comprendre ce que le LLM voulait dire
        if "ORDER_TRACKING" in llm_response_upper or "ORDER" in llm_response_upper:
            intent = "order_tracking"
        elif "GENERAL" in llm_response_upper:
            intent = "general_question"
        else:
            # Heuristiques basées sur le message original
            tracking_keywords = ["où en est", "suivi", "suivre", "tracker", "statut de ma commande"]
            general_keywords = ["annuler", "réclamation", "défaut", "floue", "qualité", "problème", "remboursement", "rendu", "3d", "fichier"]
            
            has_tracking = any(kw in message_lower for kw in tracking_keywords)
            has_general = any(kw in message_lower for kw in general_keywords)
            
            if has_general:
                intent = "general_question"
            elif has_tracking:
                intent = "order_tracking"
            else:
                intent = "general_question"  # Par défaut
        
        # Essayer d'extraire un numéro de commande avec regex
        order_number = self._extract_order_number_regex(message)
        
        return {
            "intent": intent,
            "order_number": order_number,
            "reasoning": "Fallback analysis",
            "source": "fallback"
        }
    
    def _extract_order_number_regex(self, message: str) -> Optional[str]:
        """
        Extraction de numéro de commande par regex (utilisé en fallback uniquement).
        """
        cleaned = message.lower().strip()
        
        patterns = [
            r'(?:commande|commandes|numéro|numero|n°|#)\s*[:\s]*(\d{4,6})',
            r'(?:^|\s)(\d{5})(?:\s|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, cleaned)
            if match:
                return match.group(1)
        
        return None
    
    async def analyze_message(self, message: str) -> Dict[str, Any]:
        """
        Analyse complète du message utilisateur.
        
        FLUX OPTIMISÉ:
        1. Vérifier le cache
        2. Si pas en cache, le LLM analyse
        3. Mettre en cache le résultat
        
        Returns:
            {
                "intent": "order_tracking" | "general_question",
                "order_number": str | None,
                "needs_order_input": bool,
                "confidence": "high" | "medium" | "low",
                "source": "llm" | "fallback" | "cache"
            }
        """
        # Étape 1: Vérifier le cache (TTFB ~0ms si hit)
        cached = self._check_cache(message)
        if cached:
            intent = cached["intent"]
            order_number = cached.get("order_number")
            # Re-extraire le numéro au cas où le message en contient un nouveau
            if not order_number:
                order_number = self._extract_order_number_regex(message)
            needs_order_input = (intent == "order_tracking" and order_number is None)
            return {
                "intent": intent,
                "order_number": order_number,
                "needs_order_input": needs_order_input,
                "confidence": "high",
                "source": "cache"
            }
        
        # Étape 2: Le LLM analyse tout
        analysis = await self.analyze_with_llm(message)
        
        intent = analysis["intent"]
        order_number = analysis.get("order_number")
        source = analysis.get("source", "llm")
        
        # Mettre en cache (seulement si LLM a répondu)
        if source == "llm":
            self._add_to_cache(message, analysis)
        
        # Déterminer la confiance
        confidence = "high" if source == "llm" else "medium"
        
        # Déterminer si on a besoin de demander le numéro
        needs_order_input = (intent == "order_tracking" and order_number is None)
        
        result = {
            "intent": intent,
            "order_number": order_number,
            "needs_order_input": needs_order_input,
            "confidence": confidence,
            "source": source
        }
        
        print(f"📊 Final Analysis: {result}")
        
        return result
