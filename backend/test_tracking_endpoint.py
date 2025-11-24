"""Test rapide de l'endpoint tracking avec la nouvelle logique."""
import requests
import json

# Tester l'endpoint
response = requests.get("http://localhost:8000/api/v1/order/13305/tracking")

if response.status_code == 200:
    data = response.json()
    tracking_response = data.get("tracking_response", "")
    
    print("=" * 80)
    print("RÉPONSE DU CHATBOT POUR LA COMMANDE 13305")
    print("=" * 80)
    print()
    print(tracking_response)
    print()
    print("=" * 80)
    print("\nDonnées brutes de la commande :")
    print(json.dumps(data.get("order_data", {}), indent=2, ensure_ascii=False))
else:
    print(f"❌ Erreur {response.status_code}: {response.text}")
