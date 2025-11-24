"""Test de validation du paiement et gestion intelligente des dates."""
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from order_status_logic import generate_order_status_response


def create_mock_order_with_payment(order_id, payment_date, estimated_shipping):
    """Créer commande avec paiement validé."""
    return {
        "order_id": order_id,
        "payment_date": payment_date,
        "customer": {
            "name": "Ramiro Test",
            "address": "123 Rue Test",
            "address2": "",
            "zip_code": "75001",
            "city": "Paris"
        },
        "total": "46.86",
        "items": [
            {
                "product_name": "Mon Livre Test",
                "quantity": 1,
                "chrono_number": "CHR123",
                "num_pages": 98,
                "production_date": None,
                "estimated_shipping": estimated_shipping,
                "confirmed_shipping": None,
                "tracking_url": None
            }
        ]
    }


def create_mock_order_without_payment(order_id):
    """Créer commande SANS paiement validé."""
    return {
        "order_id": order_id,
        "payment_date": None,  # PAS DE PAIEMENT
        "customer": {
            "name": "Jean Dupont",
            "address": "456 Avenue Test",
            "zip_code": "75002",
            "city": "Paris"
        },
        "total": "35.50",
        "items": [
            {
                "product_name": "Livre En Attente",
                "quantity": 1,
                "num_pages": 150,
                "production_date": None,
                "estimated_shipping": None,
                "confirmed_shipping": None,
                "tracking_url": None
            }
        ]
    }


def test_payment_not_validated():
    """TEST 1: Commande sans paiement validé - Doit bloquer et informer."""
    print("\n" + "="*70)
    print("TEST 1: PAIEMENT NON VALIDÉ (payment_date = None)")
    print("="*70)
    
    order_data = create_mock_order_without_payment("CMD99999")
    
    response = generate_order_status_response(order_data)
    
    print(f"\n📊 Réponse générée:\n{response}\n")
    
    # Vérifications
    assert "Paiement en attente de validation" in response
    assert "chèque" in response.lower() or "virement" in response.lower()
    assert "délai de livraison commencera" in response.lower()
    assert "21/11 + 20 jours" in response  # Exemple pédagogique
    assert "05 31 61 60 42" in response
    
    print("✅ TEST PASSED - Message de paiement en attente correct")


def test_payment_validated_date_on_time():
    """TEST 2: Paiement validé + Date future (on time)."""
    print("\n" + "="*70)
    print("TEST 2: PAIEMENT VALIDÉ + DATE FUTURE (ON TIME)")
    print("="*70)
    
    payment_date = "2025-11-20"
    future_shipping = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    
    order_data = create_mock_order_with_payment("CMD12345", payment_date, future_shipping)
    
    response = generate_order_status_response(order_data, current_status_id=2)
    
    print(f"\n📅 Paiement: {payment_date}")
    print(f"📅 Livraison estimée: {future_shipping}")
    print(f"\n📊 Réponse générée:\n{response}\n")
    
    # Vérifications
    assert "Paiement validé" in response
    assert "20/11" in response or "2025-11-20" in response
    assert "Bientôt expédié" in response or "devrait arriver" in response
    assert "Paiement en attente" not in response  # NE DOIT PAS apparaître
    
    print("✅ TEST PASSED - Paiement validé + date future OK")


def test_payment_validated_minor_delay():
    """TEST 3: Paiement validé + Petit retard (2 jours)."""
    print("\n" + "="*70)
    print("TEST 3: PAIEMENT VALIDÉ + PETIT RETARD (2 JOURS)")
    print("="*70)
    
    payment_date = "2025-11-18"
    delayed_shipping = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    
    order_data = create_mock_order_with_payment("CMD67890", payment_date, delayed_shipping)
    
    response = generate_order_status_response(order_data, current_status_id=7)
    
    print(f"\n📅 Paiement: {payment_date}")
    print(f"📅 Livraison estimée (PASSÉE): {delayed_shipping}")
    print(f"\n📊 Réponse générée:\n{response}\n")
    
    # Vérifications
    assert "Paiement validé" in response
    assert "Petit retard" in response or "petit retard" in response
    assert "2 jours" in response
    assert "2 semaines" in response.lower()
    
    print("✅ TEST PASSED - Paiement validé + petit retard détecté")


def test_payment_validated_major_delay():
    """TEST 4: Paiement validé + Retard important (7 jours) → Hotline."""
    print("\n" + "="*70)
    print("TEST 4: PAIEMENT VALIDÉ + RETARD IMPORTANT (7 JOURS)")
    print("="*70)
    
    payment_date = "2025-11-10"
    major_delayed = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    
    order_data = create_mock_order_with_payment("CMD11111", payment_date, major_delayed)
    
    response = generate_order_status_response(order_data)
    
    print(f"\n📅 Paiement: {payment_date}")
    print(f"📅 Livraison estimée (TRÈS PASSÉE): {major_delayed}")
    print(f"\n📊 Réponse générée:\n{response}\n")
    
    # Vérifications
    assert "Paiement validé" in response
    assert "Veuillez contacter le service client" in response or "contacter directement" in response
    assert "05 31 61 60 42" in response
    assert "contact@coollibri.com" in response
    assert "7 jours" in response
    
    print("✅ TEST PASSED - Retard majeur → Redirection hotline")


def test_scenario_real_ramiro():
    """TEST 5: Scénario réel de Ramiro (13305) - Paiement validé mais date passée."""
    print("\n" + "="*70)
    print("TEST 5: SCÉNARIO RÉEL RAMIRO - CMD 13305")
    print("="*70)
    
    # Date de livraison entre 21/11 et 22/11 (passée aujourd'hui 24/11)
    payment_date = "2025-11-15"
    shipping_date = "2025-11-21"  # Il y a 3 jours
    
    order_data = create_mock_order_with_payment("13305", payment_date, shipping_date)
    
    response = generate_order_status_response(order_data, current_status_id=1)
    
    print(f"\n📅 Paiement: {payment_date}")
    print(f"📅 Livraison prévue: {shipping_date} (PASSÉE de 3 jours)")
    print(f"📅 Aujourd'hui: {datetime.now().strftime('%Y-%m-%d')}")
    print(f"\n📊 Réponse générée:\n{response}\n")
    
    # Vérifications
    assert "Paiement validé" in response
    assert "Petit retard" in response or "petit retard" in response
    assert "3 jours" in response
    assert "Paiement en attente" not in response
    
    print("✅ TEST PASSED - Scénario Ramiro : Retard détecté et communiqué")


if __name__ == "__main__":
    print("\n" + "🚀 " + "="*64 + " 🚀")
    print("     TESTS VALIDATION PAIEMENT + GESTION INTELLIGENTE DATES")
    print("🚀 " + "="*64 + " 🚀")
    
    try:
        test_payment_not_validated()
        test_payment_validated_date_on_time()
        test_payment_validated_minor_delay()
        test_payment_validated_major_delay()
        test_scenario_real_ramiro()
        
        print("\n" + "🎉 " + "="*64 + " 🎉")
        print("     TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!")
        print("🎉 " + "="*64 + " 🎉\n")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        import traceback
        traceback.print_exc()
        raise
