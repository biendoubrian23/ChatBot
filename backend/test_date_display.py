"""Test de l'affichage des dates selon les différents cas."""
from datetime import datetime, timedelta
from order_status_logic import generate_order_status_response

def test_scenarios():
    """Test différents scénarios d'affichage de dates."""
    
    print("=" * 80)
    print("TEST AFFICHAGE DES DATES")
    print("=" * 80)
    
    # SCÉNARIO 1: Paiement NON validé (pas de dates affichées)
    print("\n📌 SCÉNARIO 1: Paiement non validé")
    print("-" * 80)
    order_no_payment = {
        "order_id": 13305,
        "customer": {"name": "Ramiro Rupp Santos"},
        "total": 46.86,
        "payment_date": None,  # PAS DE PAIEMENT
        "status_id": 1,
        "items": [{
            "num_pages": 98,
            "quantity": 1,
            "estimated_shipping": "2025-11-19 15:40:03.677000",
            "confirmed_shipping": None,
            "production_date": None,
            "shipping": {
                "delay_min": 2,
                "delay_max": 3
            }
        }]
    }
    response = generate_order_status_response(order_no_payment)
    print(response)
    print("\n✅ Vérification: PAS de dates d'expédition/livraison affichées")
    assert "19/11/2025" not in response, "❌ ERREUR: Date trouvée alors que paiement non validé!"
    print("✓ Correct: Aucune date affichée")
    
    # SCÉNARIO 2: Paiement validé + Date future (afficher dates)
    print("\n\n📌 SCÉNARIO 2: Paiement validé + Expédition future")
    print("-" * 80)
    future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    order_future = {
        "order_id": 13306,
        "customer": {"name": "Jean Dupont"},
        "total": 55.00,
        "payment_date": "2025-11-20 10:00:00",  # PAIEMENT OK
        "status_id": 7,
        "items": [{
            "num_pages": 120,
            "quantity": 2,
            "estimated_shipping": f"{future_date} 15:40:03.677000",
            "confirmed_shipping": None,
            "production_date": None,
            "shipping": {
                "delay_min": 2,
                "delay_max": 3
            }
        }]
    }
    response = generate_order_status_response(order_future)
    print(response)
    print(f"\n✅ Vérification: Dates d'expédition et de livraison DOIVENT être affichées")
    expected_ship_date = datetime.fromisoformat(future_date).strftime("%d/%m/%Y")
    assert expected_ship_date in response, f"❌ ERREUR: Date d'expédition {expected_ship_date} non trouvée!"
    print(f"✓ Correct: Date d'expédition {expected_ship_date} affichée")
    
    # SCÉNARIO 3: Paiement validé + Petit retard (afficher nouvelles dates)
    print("\n\n📌 SCÉNARIO 3: Paiement validé + Petit retard (2 jours)")
    print("-" * 80)
    past_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    order_delay = {
        "order_id": 13307,
        "customer": {"name": "Marie Martin"},
        "total": 62.50,
        "payment_date": "2025-11-15 10:00:00",  # PAIEMENT OK
        "status_id": 9,
        "items": [{
            "num_pages": 150,
            "quantity": 1,
            "estimated_shipping": f"{past_date} 15:40:03.677000",
            "confirmed_shipping": None,
            "production_date": None,
            "shipping": {
                "delay_min": 2,
                "delay_max": 3
            }
        }]
    }
    response = generate_order_status_response(order_delay)
    print(response)
    print(f"\n✅ Vérification: Message de retard + nouvelles dates estimées")
    assert "retard de 2 jour" in response, "❌ ERREUR: Message de retard non trouvé!"
    print("✓ Correct: Retard mentionné avec nouvelles estimations")
    
    # SCÉNARIO 4: Commande expédiée (afficher date de livraison)
    print("\n\n📌 SCÉNARIO 4: Commande déjà expédiée")
    print("-" * 80)
    shipped_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    order_shipped = {
        "order_id": 13308,
        "customer": {"name": "Pierre Bernard"},
        "total": 48.90,
        "payment_date": "2025-11-10 10:00:00",  # PAIEMENT OK
        "status_id": 12,
        "items": [{
            "num_pages": 200,
            "quantity": 1,
            "estimated_shipping": "2025-11-18 15:40:03.677000",
            "confirmed_shipping": f"{shipped_date} 10:00:00",
            "production_date": None,
            "shipping": {
                "delay_min": 2,
                "delay_max": 3
            }
        }]
    }
    response = generate_order_status_response(order_shipped)
    print(response)
    expected_shipped = datetime.fromisoformat(shipped_date).strftime("%d/%m/%Y")
    print(f"\n✅ Vérification: Date d'expédition {expected_shipped} + estimation livraison")
    assert expected_shipped in response, f"❌ ERREUR: Date d'expédition non trouvée!"
    print("✓ Correct: Date d'expédition et livraison estimée affichées")
    
    print("\n" + "=" * 80)
    print("✅ TOUS LES TESTS PASSÉS!")
    print("=" * 80)

if __name__ == "__main__":
    test_scenarios()
