"""
Service de détection d'intention pour les messages du chatbot.
Détecte si l'utilisateur pose une question sur une commande ou une question générale.
Identique au MessageAnalyzer du chatbot CoolLibri original.
"""
import re
import logging
import json
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Mots-clés pour détecter une intention de suivi de commande (identique à l'original)
ORDER_KEYWORDS = [
    "commande", "colis", "livraison", "expédition", "expédié", "suivi",
    "tracking", "où en est", "statut", "numéro", "n°", "commandes",
    "reçu", "reçue", "arrivée", "arrive", "délai", "retard",
    "envoyé", "envoyée", "quand", "order", "cmd", "mon colis",
    "ma commande", "suivre"
]

# Pattern regex pour extraire les numéros de commande (identique à l'original)
ORDER_NUMBER_PATTERNS = [
    r'(?:commande|commandes|numéro|numero|n°|#)\s*[:\s]*(\d{4,6})',  # Après mot-clé
    r'(?:^|\s)(\d{5})(?:\s|$)',  # 5 chiffres isolés (format CoolLibri standard)
    r'\b(\d{5,8})\b',  # 5 à 8 chiffres
]


class IntentDetector:
    """
    Détecte l'intention de l'utilisateur (identique à MessageAnalyzer original).
    
    Intentions:
    - order_tracking : L'utilisateur veut le STATUT/SUIVI d'une commande
    - general_question : Tout le reste (questions produits, prix, etc.)
    """
    
    def __init__(self):
        """Initialise le détecteur."""
        self.llm = None
    
    def detect(self, message: str) -> Dict[str, Any]:
        """
        Détecte l'intention avec regex (rapide, sans LLM).
        
        Returns:
            {
                "intent": "order_tracking" | "general_question",
                "order_number": "12345" | None,
                "confidence": 0.0-1.0,
                "needs_order_number": bool
            }
        """
        message_lower = message.lower().strip()
        
        # 1. Essayer d'extraire un numéro de commande
        order_number = self._extract_order_number(message)
        
        # 2. Vérifier les mots-clés
        has_order_keyword = any(kw in message_lower for kw in ORDER_KEYWORDS)
        
        # 3. Message est juste un numéro → suivi de commande
        if message.strip().isdigit() and 4 <= len(message.strip()) <= 8:
            return {
                "intent": "order_tracking",
                "order_number": message.strip(),
                "confidence": 0.99
            }
        
        # 4. Si numéro trouvé, c'est du suivi de commande
        if order_number:
            return {
                "intent": "order_tracking",
                "order_number": order_number,
                "confidence": 0.95
            }
        
        # 5. Si mots-clés mais pas de numéro, demander le numéro
        if has_order_keyword:
            return {
                "intent": "order_tracking",
                "order_number": None,
                "confidence": 0.8,
                "needs_order_number": True
            }
        
        # 6. Sinon, question générale
        return {
            "intent": "general_question",
            "order_number": None,
            "confidence": 0.9
        }
    
    def _extract_order_number(self, message: str) -> Optional[str]:
        """
        Extrait le numéro de commande du message (identique à l'original).
        """
        for pattern in ORDER_NUMBER_PATTERNS:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                number = match.group(1)
                # Valider que c'est un numéro plausible
                if 4 <= len(number) <= 8:
                    return number
        return None
    
    async def detect_with_llm(self, message: str, llm_provider=None) -> Dict[str, Any]:
        """
        Détection avancée avec LLM (identique au prompt original CoolLibri).
        Utilise le LLM comme cerveau principal pour les cas ambigus.
        """
        if not llm_provider:
            return self.detect(message)
        
        # PROMPT OPTIMISÉ (identique à l'original)
        prompt = f"""Analyse ce message client CoolLibri (imprimerie livres):
"{message}"

INTENTION:
- ORDER_TRACKING = veut le STATUT/SUIVI d'une commande ("où en est ma commande?", "commande 13349", "mon colis?", juste un numéro)
- GENERAL_QUESTION = tout le reste (annulation, réclamation, qualité, prix, formats, problèmes, remboursement)

NUMÉRO: Extrais UNIQUEMENT un numéro PRÉSENT dans le message. Sinon null.

JSON uniquement:
{{"intent":"ORDER_TRACKING|GENERAL_QUESTION","order_number":"xxxxx|null","reasoning":"court"}}"""

        try:
            response = await llm_provider.generate(
                system_prompt="Tu es un assistant qui analyse les intentions des messages clients.",
                user_message=prompt,
                temperature=0.1,
                max_tokens=150
            )
            
            # Parser la réponse JSON
            json_match = re.search(r'\{[^}]+\}', response)
            if json_match:
                result = json.loads(json_match.group())
                intent = "order_tracking" if "ORDER" in result.get("intent", "").upper() else "general_question"
                order_num = result.get("order_number")
                
                # Valider le numéro de commande
                if order_num and (order_num == "null" or not order_num.isdigit()):
                    order_num = None
                
                return {
                    "intent": intent,
                    "order_number": order_num,
                    "confidence": 0.95,
                    "reasoning": result.get("reasoning", "")
                }
        except Exception as e:
            logger.warning(f"Erreur détection LLM: {e}")
        
        # Fallback sur la détection simple
        return self.detect(message)


# Instance singleton
_detector = None

def get_intent_detector() -> IntentDetector:
    """Retourne l'instance du détecteur d'intention."""
    global _detector
    if _detector is None:
        _detector = IntentDetector()
    return _detector
