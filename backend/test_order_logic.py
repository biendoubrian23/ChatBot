"""
Test de la logique de suivi de commandes avec la commande 13349
"""

from order_status_logic import generate_order_status_response, detect_order_inquiry, extract_order_number
from datetime import datetime

# Données exemple de la commande 13349 (simplifiées)
sample_order_data = {
    "order_id": "13349",
    "total": 24.99,
    "customer": {
        "name": "Sébastien PAAS",
        "address": "12 RUE DES LILAS",
        "address2": None,
        "city": "TOULOUSE",
        "zip_code": "31000"
    },
    "items": [
        {
            "product_name": "Product_96",
            "quantity": 1,
            "chrono_number": "9000847",
            "num_pages": 24,
            "production_date": "2025-12-18 13:49:58.157000",
            "estimated_shipping": "2025-12-22 13:49:58.217000",
            "confirmed_shipping": None,
            "tracking_url": None
        }
    ]
}

# Test 1: Génération de réponse complète
print("=" * 80)
print("🧪 TEST 1: GÉNÉRATION DE RÉPONSE COMPLÈTE")
print("=" * 80)

response = generate_order_status_response(sample_order_data, current_status_id=10)
print(response)

print("\n" + "=" * 80)
print("🧪 TEST 2: DÉTECTION DE DEMANDES DE SUIVI")
print("=" * 80)

test_messages = [
    "Où en est ma commande 13349 ?",
    "Je voudrais connaître le statut de ma commande",
    "Bonjour, quand va arriver mon livre ?",
    "Commande #13349 - délai de livraison ?",
    "Ma commande a-t-elle été expédiée ?",
    "Quel temps fait-il aujourd'hui ?",  # Non lié aux commandes
    "Combien coûte un livre de 100 pages ?"  # Non lié aux commandes
]

for message in test_messages:
    is_order_inquiry = detect_order_inquiry(message)
    order_number = extract_order_number(message)
    print(f"Message: '{message}'")
    print(f"  → Demande de suivi: {'✅ OUI' if is_order_inquiry else '❌ NON'}")
    print(f"  → Numéro extrait: {order_number if order_number else 'Aucun'}")
    print()

print("=" * 80)
print("🧪 TEST 3: SCÉNARIOS AVEC DIFFÉRENTS STATUTS")
print("=" * 80)

# Test avec différents statuts
test_statuses = [2, 7, 10, 12]

for status_id in test_statuses:
    print(f"\n--- STATUT {status_id} ---")
    response = generate_order_status_response(sample_order_data, current_status_id=status_id)
    # Afficher seulement les 3 premières lignes pour économiser l'espace
    lines = response.split('\n')[:3]
    print('\n'.join(lines) + '\n...[response tronquée]...')

print("\n✅ Tests terminés avec succès !")