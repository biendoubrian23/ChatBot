"""
Script de test pour le système d'analyse de messages intelligent
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.message_analyzer import MessageAnalyzer
from app.services.llm import OllamaService


def test_message_analysis():
    """Teste différents types de messages"""
    
    print("🧪 Test du système d'analyse de messages\n")
    print("="*60)
    
    # Initialiser le service
    ollama = OllamaService()
    analyzer = MessageAnalyzer(ollama)
    
    # Messages de test
    test_cases = [
        # Cas 1: Numéro de commande explicite
        {
            "message": "où en est ma commande 13349 ?",
            "expected": "order_tracking avec numéro extrait"
        },
        # Cas 2: Numéro seul
        {
            "message": "13349",
            "expected": "order_tracking avec numéro extrait"
        },
        # Cas 3: Question sur commande sans numéro
        {
            "message": "où en est ma commande ?",
            "expected": "order_tracking sans numéro, needs_order_input=True"
        },
        # Cas 4: Question générale
        {
            "message": "quels sont les types de reliures disponibles ?",
            "expected": "general_question"
        },
        # Cas 5: Question sur formats
        {
            "message": "quel format pour un roman ?",
            "expected": "general_question"
        },
        # Cas 6: Suivi de livraison
        {
            "message": "quand va être livrée ma commande ?",
            "expected": "order_tracking sans numéro"
        },
        # Cas 7: Numéro avec "n°"
        {
            "message": "n° 13349",
            "expected": "order_tracking avec numéro extrait"
        },
        # Cas 8: Question tarifs
        {
            "message": "combien coûte l'impression d'un livre de 200 pages ?",
            "expected": "general_question"
        }
    ]
    
    # Exécuter les tests
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📝 Test {i}: {test_case['message']}")
        print(f"   Attendu: {test_case['expected']}")
        
        result = analyzer.analyze_message(test_case['message'])
        
        print(f"   ✅ Résultat:")
        print(f"      - Intent: {result['intent']}")
        print(f"      - Order Number: {result['order_number']}")
        print(f"      - Needs Input: {result['needs_order_input']}")
        print(f"      - Confidence: {result['confidence']}")
        
        # Vérification basique
        if "numéro extrait" in test_case['expected']:
            if result['order_number']:
                print(f"      ✓ Numéro correctement extrait: {result['order_number']}")
            else:
                print(f"      ✗ ERREUR: Numéro non extrait")
        
        if "needs_order_input=True" in test_case['expected']:
            if result['needs_order_input']:
                print(f"      ✓ Détection correcte du besoin de saisie")
            else:
                print(f"      ✗ ERREUR: Should need order input")
        
        if "general_question" in test_case['expected']:
            if result['intent'] == 'general_question':
                print(f"      ✓ Question générale correctement identifiée")
            else:
                print(f"      ✗ ERREUR: Should be general_question, got {result['intent']}")
    
    print("\n" + "="*60)
    print("✅ Tests terminés !\n")


if __name__ == "__main__":
    test_message_analysis()
