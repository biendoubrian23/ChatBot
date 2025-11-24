"""Service intelligent pour analyser les messages utilisateurs et détecter l'intention."""
import re
from typing import Optional, Dict, Any
from app.services.llm import OllamaService


class MessageAnalyzer:
    """Analyse les messages pour détecter si c'est une question sur commande ou générale."""
    
    # Mots-clés spécifiques au tracking de commande (expressions précises)
    ORDER_KEYWORDS = [
        "ma commande", "mes commandes", "suivi de commande", "suivi commande",
        "où en est ma commande", "ou en est ma commande", "où est ma commande",
        "statut de ma commande", "état de ma commande", "avancement de ma commande",
        "numéro de commande", "numero de commande", "n° de commande",
        "tracker ma commande", "suivre ma commande", "commande en cours"
    ]
    
    def __init__(self, llm_service: OllamaService):
        """
        Initialize le MessageAnalyzer avec un service LLM.
        
        Args:
            llm_service: Instance du service Ollama pour l'analyse LLM
        """
        self.llm = llm_service
    
    def extract_order_number(self, message: str) -> Optional[str]:
        """
        Extrait un numéro de commande du message avec regex.
        
        Patterns acceptés:
        - "commande 13349"
        - "13349"
        - "numéro 13349"
        - "n° 13349"
        - "#13349"
        """
        # Nettoyer le message
        cleaned = message.lower().strip()
        
        # Pattern 1: Numéro après des mots-clés
        patterns = [
            r'(?:commande|commandes|numéro|numero|n°|#)\s*[:\s]*(\d{4,6})',
            r'(?:^|\s)(\d{5})(?:\s|$)',  # Numéro seul de 5 chiffres
            r'(?:^|\s)(\d{4,6})(?:\s|$)',  # Numéro de 4-6 chiffres
        ]
        
        for pattern in patterns:
            match = re.search(pattern, cleaned)
            if match:
                return match.group(1)
        
        return None
    
    def contains_order_keywords(self, message: str) -> bool:
        """Vérifie si le message contient des expressions spécifiques au tracking de commande."""
        message_lower = message.lower().strip()
        # Cherche les expressions complètes pour éviter les faux positifs
        return any(keyword in message_lower for keyword in self.ORDER_KEYWORDS)
    
    async def analyze_intent_with_llm(self, message: str) -> str:
        """
        Utilise le LLM pour déterminer l'intention du message.
        
        Returns:
            "order_tracking" ou "general_question"
        """
        prompt = f"""Tu es un assistant qui analyse les messages des clients d'une imprimerie de livres.

Détermine si le message suivant concerne le SUIVI D'UNE COMMANDE ou une QUESTION GÉNÉRALE sur les services/produits.

Message du client: "{message}"

Réponds UNIQUEMENT par:
- "ORDER_TRACKING" si le client veut suivre/connaître l'état de sa commande
- "GENERAL_QUESTION" si c'est une question sur les produits, services, prix, délais généraux, types de reliures, formats, etc.

Exemples:
- "où en est ma commande ?" → ORDER_TRACKING
- "ma commande 13349" → ORDER_TRACKING
- "quand vais-je recevoir mon livre ?" → ORDER_TRACKING
- "quels sont les types de reliures ?" → GENERAL_QUESTION
- "combien coûte l'impression ?" → GENERAL_QUESTION
- "quels formats proposez-vous ?" → GENERAL_QUESTION

Réponse (un seul mot):"""

        try:
            response = await self.llm.generate(prompt, max_tokens=10)
            response_clean = response.strip().upper()
            
            if "ORDER" in response_clean or "TRACKING" in response_clean:
                return "order_tracking"
            else:
                return "general_question"
        except Exception as e:
            print(f"⚠️ Erreur LLM pour analyse d'intention: {e}")
            # Fallback sur les mots-clés
            if self.contains_order_keywords(message):
                return "order_tracking"
            return "general_question"
    
    async def analyze_message(self, message: str) -> Dict[str, Any]:
        """
        Analyse complète du message utilisateur.
        
        Returns:
            {
                "intent": "order_tracking" | "general_question",
                "order_number": str | None,
                "needs_order_input": bool,
                "confidence": "high" | "medium" | "low"
            }
        """
        # Étape 1: Extraction du numéro avec regex
        order_number = self.extract_order_number(message)
        
        # Si numéro trouvé, c'est forcément du tracking
        if order_number:
            return {
                "intent": "order_tracking",
                "order_number": order_number,
                "needs_order_input": False,
                "confidence": "high"
            }
        
        # Étape 2: Utiliser le LLM d'abord pour classifier
        try:
            intent = await self.analyze_intent_with_llm(message)
            confidence = "high"
        except Exception as e:
            print(f"⚠️ Erreur LLM pour analyse d'intention: {e}")
            # Fallback sur les mots-clés spécifiques
            has_order_keywords = self.contains_order_keywords(message)
            intent = "order_tracking" if has_order_keywords else "general_question"
            confidence = "medium" if has_order_keywords else "low"
        
        # Étape 3: Déterminer si on a besoin de demander le numéro
        needs_order_input = (intent == "order_tracking" and order_number is None)
        
        return {
            "intent": intent,
            "order_number": order_number,
            "needs_order_input": needs_order_input,
            "confidence": confidence
        }
