"""Test du nouveau service de tracking avec calcul de dates."""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.order_tracking_service import OrderTrackingService

def test_tracking():
    print("="*80)
    print("🧪 TEST DU SERVICE DE TRACKING AVANCÉ")
    print("="*80)
    
    service = OrderTrackingService()
    
    # Test avec commande 13348
    order_number = "13348"
    print(f"\n📦 Récupération des données pour la commande #{order_number}...")
    
    order_data = service.get_order_tracking_info(order_number)
    
    if not order_data:
        print("❌ Commande introuvable")
        return
    
    print("✅ Données récupérées\n")
    
    # Afficher les infos brutes importantes
    print("-" * 80)
    print("DONNÉES BRUTES:")
    print("-" * 80)
    print(f"Status ID: {order_data['status_id']}")
    print(f"Status Name: {order_data.get('status_name')}")
    print(f"Status Stage: {order_data.get('status_stage')}")
    print(f"Customer: {order_data['customer']['name']}")
    
    if order_data.get('items'):
        item = order_data['items'][0]
        print(f"\nProduit: {item.get('product_name')}")
        print(f"Pages: {item.get('num_pages')}")
        print(f"Chrono: {item.get('chrono_number')}")
        print(f"Production: {item.get('production_date')}")
        print(f"Expédition estimée: {item.get('estimated_shipping')}")
        print(f"Ready to reproduce: {item.get('ready_to_reproduce')}")
        print(f"Files retrieved: {item.get('files_retrieved')}")
        
        if item.get('shipping'):
            shipping = item['shipping']
            print(f"\nTransporteur: {shipping.get('company_name')}")
            print(f"Délai: {shipping.get('delay_min')}-{shipping.get('delay_max')} jours")
    
    print("\n" + "="*80)
    print("MESSAGE FORMATÉ POUR LE CLIENT:")
    print("="*80)
    print()
    
    # Générer le message formaté
    message = service.generate_tracking_response(order_data)
    print(message)
    
    print("\n" + "="*80)
    print("✅ Test terminé")
    print("="*80)

if __name__ == "__main__":
    test_tracking()
