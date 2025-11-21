"""Test de l'endpoint /order/{order_number}."""
import requests

# Base URL - ATTENTION: Backend tourne sur port 8000 par défaut (ou 8080 si modifié)
BASE_URL = "http://localhost:8000"

def test_order_endpoint():
    """Tester l'endpoint de récupération de commande."""
    
    # Test 1: Commande existante (13349 vu dans les tests)
    print("=" * 80)
    print("✅ Test 1: Récupération commande #13349")
    print("=" * 80)
    
    response = requests.get(f"{BASE_URL}/api/v1/order/13349")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n📦 Commande #{data['order_id']}")
        print(f"   📅 Date: {data['order_date']}")
        print(f"   💰 Total: {data['total']}€ (dont {data['shipping']}€ de livraison)")
        print(f"   ✅ Payée: {'Oui' if data['paid'] else 'Non'}")
        print(f"\n👤 Client:")
        print(f"   Nom: {data['customer']['name']}")
        print(f"   Adresse: {data['customer']['address']}")
        print(f"   Ville: {data['customer']['zip_code']} {data['customer']['city']}")
        print(f"\n📦 Articles commandés:")
        for i, item in enumerate(data['items'], 1):
            print(f"   {i}. {item['product_name']} (x{item['quantity']})")
            print(f"      Prix: {item['price_ttc']}€")
            print(f"      Pages: {item['num_pages']}")
            print(f"      Chrono: {item['chrono_number']}")
            print(f"      Livraison estimée: {item['estimated_shipping']}")
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
    
    # Test 2: Commande inexistante
    print("\n" + "=" * 80)
    print("❌ Test 2: Commande inexistante #99999")
    print("=" * 80)
    
    response = requests.get(f"{BASE_URL}/api/v1/order/99999")
    
    if response.status_code == 404:
        print("✅ Erreur 404 correctement retournée")
    else:
        print(f"⚠️  Code inattendu: {response.status_code}")
    
    # Test 3: Avec validation nom de famille
    print("\n" + "=" * 80)
    print("🔒 Test 3: Validation nom de famille")
    print("=" * 80)
    
    response = requests.get(f"{BASE_URL}/api/v1/order/13349?last_name=WrongName")
    
    if response.status_code == 403:
        print("✅ Erreur 403 (nom incorrect) correctement retournée")
    else:
        print(f"⚠️  Code inattendu: {response.status_code}")

if __name__ == "__main__":
    try:
        test_order_endpoint()
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au backend")
        print("   Vérifiez que le serveur est démarré sur http://localhost:8080")
