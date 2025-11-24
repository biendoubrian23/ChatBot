"""Test d'intégration de la gestion intelligente des dates avec order_status_logic."""
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from order_status_logic import get_shipping_status_message, generate_order_status_response


def create_mock_order_data(order_id, estimated_shipping_date):
    """Créer des données de commande simulées."""
    return {
        "order_id": order_id,
        "customer": {
            "name": "Jean Dupont",
            "address": "123 Rue de la Paix",
            "address2": "",
            "zip_code": "75001",
            "city": "Paris"
        },
        "total": "45.90",
        "items": [
            {
                "product_name": "Mon Roman",
                "quantity": 1,
                "chrono_number": "CHR123456",
                "num_pages": 250,
                "production_date": None,
                "estimated_shipping": estimated_shipping_date,
                "confirmed_shipping": None,
                "tracking_url": None
            }
        ]
    }


def test_scenario_on_time():
    """Test: Date de livraison dans le futur."""
    print("\n" + "="*70)
    print("TEST SCÉNARIO 1: DATE DE LIVRAISON FUTURE (ON TIME)")
    print("="*70)
    
    # Date dans 5 jours
    future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    order_data = create_mock_order_data("CMD12345", future_date)
    
    message = get_shipping_status_message(order_data)
    print(f"\n📅 Date estimée: {future_date}")
    print(f"📊 Message généré:\n{message}\n")
    
    assert "🚚 **Bientôt expédié !**" in message
    assert "Votre colis devrait arriver" in message
    print("✅ TEST PASSED - Message approprié pour date future")


def test_scenario_minor_delay():
    """Test: Retard de 2 jours."""
    print("\n" + "="*70)
    print("TEST SCÉNARIO 2: PETIT RETARD (2 JOURS)")
    print("="*70)
    
    # Date il y a 2 jours
    delayed_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    order_data = create_mock_order_data("CMD67890", delayed_date)
    
    message = get_shipping_status_message(order_data)
    print(f"\n📅 Date estimée: {delayed_date}")
    print(f"📊 Message généré:\n{message}\n")
    
    assert "⏱️ **Petit retard**" in message
    assert "petit retard" in message.lower()
    assert "2 semaines" in message.lower()
    print("✅ TEST PASSED - Message de petit retard approprié")


def test_scenario_major_delay():
    """Test: Retard de 7 jours - Redirection hotline."""
    print("\n" + "="*70)
    print("TEST SCÉNARIO 3: RETARD IMPORTANT (7 JOURS) - REDIRECTION HOTLINE")
    print("="*70)
    
    # Date il y a 7 jours
    major_delayed_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    order_data = create_mock_order_data("CMD99999", major_delayed_date)
    
    message = get_shipping_status_message(order_data)
    print(f"\n📅 Date estimée: {major_delayed_date}")
    print(f"📊 Message généré:\n{message}\n")
    
    assert "🚨 **Veuillez contacter le service client**" in message
    assert "contact@coollibri.com" in message
    assert "05 31 61 60 42" in message
    assert "CMD99999" in message
    print("✅ TEST PASSED - Redirection hotline appropriée")


def test_scenario_edge_case_3_days():
    """Test: Exactement 3 jours de retard (limite minor delay)."""
    print("\n" + "="*70)
    print("TEST SCÉNARIO 4: EDGE CASE - EXACTEMENT 3 JOURS (LIMITE)")
    print("="*70)
    
    # Date il y a 3 jours
    edge_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    order_data = create_mock_order_data("CMD33333", edge_date)
    
    message = get_shipping_status_message(order_data)
    print(f"\n📅 Date estimée: {edge_date}")
    print(f"📊 Message généré:\n{message}\n")
    
    # Doit être minor_delay (pas major)
    assert "⏱️ **Petit retard**" in message
    assert "🚨" not in message  # Pas de redirection hotline
    print("✅ TEST PASSED - 3 jours = minor_delay (pas major)")


def test_full_response_integration():
    """Test: Réponse complète avec gestion intelligente."""
    print("\n" + "="*70)
    print("TEST SCÉNARIO 5: RÉPONSE COMPLÈTE (INTÉGRATION TOTALE)")
    print("="*70)
    
    # Date avec retard de 2 jours
    delayed_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    order_data = create_mock_order_data("CMD55555", delayed_date)
    
    full_response = generate_order_status_response(order_data, current_status_id=7)
    print(f"\n📅 Date estimée: {delayed_date}")
    print(f"📊 Réponse complète:\n{full_response}\n")
    
    assert "CMD55555" in full_response
    assert "Jean Dupont" in full_response
    assert "petit retard" in full_response.lower() or "Petit retard" in full_response
    print("✅ TEST PASSED - Intégration complète fonctionne")


if __name__ == "__main__":
    print("\n" + "🚀 " + "="*64 + " 🚀")
    print("     TESTS D'INTÉGRATION - GESTION INTELLIGENTE DES DATES")
    print("🚀 " + "="*64 + " 🚀")
    
    try:
        test_scenario_on_time()
        test_scenario_minor_delay()
        test_scenario_major_delay()
        test_scenario_edge_case_3_days()
        test_full_response_integration()
        
        print("\n" + "🎉 " + "="*64 + " 🎉")
        print("     TOUS LES TESTS D'INTÉGRATION SONT PASSÉS AVEC SUCCÈS!")
        print("🎉 " + "="*64 + " 🎉\n")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        import traceback
        traceback.print_exc()
        raise
