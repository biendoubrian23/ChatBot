"""
Service de détection d'intention pour les messages du chatbot.
Utilise le LLM pour déterminer intelligemment l'intention de l'utilisateur.
"""
import re
import logging
import json
from typing import Dict, Any, Optional
from mistralai import Mistral
import os

logger = logging.getLogger(__name__)

# Pattern regex UNIQUEMENT pour extraire les numéros de commande (pas pour la détection d'intention)
ORDER_NUMBER_PATTERNS = [
    r'(?:commande|commandes|numéro|numero|n°|#)\s*[:\s]*(\d{4,6})',
    r'(?:^|\s)(\d{5})(?:\s|$)',
    r'\b(\d{5,8})\b',
]


class IntentDetector:
    """
    Détecte l'intention de l'utilisateur avec le LLM.
    
    Intentions:
    - order_tracking : L'utilisateur veut le STATUT/SUIVI de SA commande spécifique
    - general_question : Questions générales (délais, prix, formats, problèmes, etc.)
    """
    
    def __init__(self):
        """Initialise le détecteur avec le client Mistral."""
        api_key = os.getenv("MISTRAL_API_KEY")
        self.client = Mistral(api_key=api_key) if api_key else None
        self.model = os.getenv("MISTRAL_MODEL", "mistral-small-latest")
    
    def _extract_order_number(self, message: str) -> Optional[str]:
        """Extrait le numéro de commande du message avec regex."""
        for pattern in ORDER_NUMBER_PATTERNS:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                number = match.group(1)
                if 4 <= len(number) <= 8:
                    return number
        return None
    
    async def detect(self, message: str) -> Dict[str, Any]:
        """
        Détecte l'intention avec le LLM.
        
        Returns:
            {
                "intent": "order_tracking" | "general_question",
                "order_number": "12345" | None,
                "confidence": 0.0-1.0,
                "needs_order_number": bool
            }
        """
        # Cas spécial : message est juste un numéro → suivi de commande
        if message.strip().isdigit() and 4 <= len(message.strip()) <= 8:
            return {
                "intent": "order_tracking",
                "order_number": message.strip(),
                "confidence": 0.99
            }
        
        # Extraire le numéro de commande s'il existe
        order_number = self._extract_order_number(message)
        
        # Si pas de client Mistral, fallback basique
        if not self.client:
            logger.warning("Pas de client Mistral, fallback sur general_question")
            return {
                "intent": "general_question",
                "order_number": order_number,
                "confidence": 0.5
            }
        
        # Appel LLM pour détecter l'intention
        prompt = f"""Analyse ce message d'un client CoolLibri (service d'impression de livres):

MESSAGE: "{message}"

Tu dois classifier ce message en UNE seule catégorie:

1. ORDER_TRACKING = Le client demande UNIQUEMENT le STATUT ACTUEL de sa commande
   - "où en est ma commande?"
   - "je veux suivre mon colis"
   - "commande 13456"
   - "quel est le statut de ma commande?"

2. GENERAL_QUESTION = TOUT LE RESTE, notamment:
   - Questions sur les délais en général: "quels sont les délais?", "combien de temps pour livrer?"
   - RÉCLAMATIONS et PLAINTES: "ça fait 1 mois que j'attends", "ma commande a du retard", "je n'ai toujours pas reçu"
   - Questions "que faire si...": "comment faire si retard?", "que faire si pas reçu?"
   - Problèmes qualité, remboursements, annulations
   - Questions sur les prix, formats, services

RÈGLE IMPORTANTE: 
- Une PLAINTE ou RÉCLAMATION ("j'attends depuis 1 mois", "retard", "pas reçu") = GENERAL_QUESTION
- Seule une demande EXPLICITE de statut ("où en est?", "suivre ma commande") = ORDER_TRACKING

Réponds UNIQUEMENT avec ce JSON:
{{"intent": "ORDER_TRACKING ou GENERAL_QUESTION"}}"""

        try:
            response = self.client.chat.complete(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Tu classifies les messages clients. Réponds uniquement en JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=50
            )
            
            result_text = response.choices[0].message.content.strip()
            logger.info(f"🧠 Intent LLM response: {result_text}")
            
            # Parser le JSON
            json_match = re.search(r'\{[^}]+\}', result_text)
            if json_match:
                result = json.loads(json_match.group())
                intent_raw = result.get("intent", "GENERAL_QUESTION").upper()
                
                if "ORDER" in intent_raw and "TRACKING" in intent_raw:
                    intent = "order_tracking"
                    # Si order_tracking mais pas de numéro, on doit le demander
                    if not order_number:
                        return {
                            "intent": "order_tracking",
                            "order_number": None,
                            "confidence": 0.95,
                            "needs_order_number": True
                        }
                    return {
                        "intent": "order_tracking",
                        "order_number": order_number,
                        "confidence": 0.95
                    }
                else:
                    return {
                        "intent": "general_question",
                        "order_number": None,
                        "confidence": 0.95
                    }
                    
        except Exception as e:
            logger.error(f"❌ Erreur détection LLM: {e}")
        
        # Fallback: question générale par défaut
        return {
            "intent": "general_question",
            "order_number": order_number,
            "confidence": 0.5
        }


# Instance singleton
_detector = None

def get_intent_detector() -> IntentDetector:
    """Retourne l'instance du détecteur d'intention."""
    global _detector
    if _detector is None:
        _detector = IntentDetector()
    return _detector
