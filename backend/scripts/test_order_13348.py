"""
Script de test pour récupérer les informations d'une commande depuis la base de données CoolLibri
"""
import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database import DatabaseService
import json


def test_order_lookup(order_number: str):
    """Test de récupération d'une commande"""
    print(f"\n{'='*60}")
    print(f"🔍 Recherche de la commande n°{order_number}")
    print(f"{'='*60}\n")
    
    # Créer une instance du service database
    db_service = DatabaseService()
    
    try:
        # Récupérer les données de la commande
        order_data = db_service.get_order_by_number(order_number)
        
        if not order_data:
            print(f"❌ Aucune commande trouvée avec le numéro {order_number}")
            return
        
        print("✅ Commande trouvée !\n")
        
        # Afficher les informations générales
        print("📋 INFORMATIONS GÉNÉRALES")
        print(f"{'─'*60}")
        print(f"Numéro de commande : {order_data.get('order_id')}")
        print(f"Date de commande   : {order_data.get('order_date')}")
        print(f"Date de paiement   : {order_data.get('payment_date')}")
        print(f"Total TTC          : {order_data.get('total')} €")
        print(f"Frais de port      : {order_data.get('shipping')} €")
        print(f"Statut ID          : {order_data.get('status_id')}")
        print(f"Payée              : {'✅ Oui' if order_data.get('paid') else '❌ Non'}")
        
        # Afficher les informations client
        if order_data.get('customer'):
            customer = order_data['customer']
            print(f"\n👤 INFORMATIONS CLIENT")
            print(f"{'─'*60}")
            print(f"Nom                : {customer.get('name')}")
            print(f"Adresse            : {customer.get('address')}")
            if customer.get('address2'):
                print(f"Adresse (suite)    : {customer.get('address2')}")
            print(f"Ville              : {customer.get('city')}")
            print(f"Code postal        : {customer.get('zip_code')}")
            print(f"Pays ID            : {customer.get('country_id')}")
            print(f"Téléphone          : {customer.get('phone')}")
            if customer.get('company'):
                print(f"Société            : {customer.get('company')}")
        
        # Afficher les articles
        if order_data.get('items'):
            print(f"\n📦 ARTICLES DE LA COMMANDE ({len(order_data['items'])} article(s))")
            print(f"{'─'*60}")
            
            for idx, item in enumerate(order_data['items'], 1):
                print(f"\nArticle #{idx}:")
                print(f"  Ligne ID           : {item.get('line_id')}")
                print(f"  Produit            : {item.get('product_name')} (ID: {item.get('product_id')})")
                print(f"  Quantité           : {item.get('quantity')}")
                print(f"  Prix HT            : {item.get('price_ht')} €")
                print(f"  Prix TTC           : {item.get('price_ttc')} €")
                print(f"  Numéro chrono      : {item.get('chrono_number')}")
                print(f"  Pages              : {item.get('num_pages')}")
                print(f"  Date production    : {item.get('production_date')}")
                print(f"  Expédition estimée : {item.get('estimated_shipping')}")
                print(f"  Expédition finale  : {item.get('confirmed_shipping') or 'Non confirmée'}")
                if item.get('tracking_url'):
                    print(f"  URL de suivi       : {item.get('tracking_url')}")
        
        # Afficher le JSON complet pour debug
        print(f"\n📄 DONNÉES JSON COMPLÈTES")
        print(f"{'─'*60}")
        print(json.dumps(order_data, indent=2, ensure_ascii=False, default=str))
        
        print(f"\n{'='*60}")
        print("✅ Test terminé avec succès")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"\n❌ Erreur lors de la récupération de la commande:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        print(f"\n{traceback.format_exc()}")


if __name__ == "__main__":
    # Numéro de commande à tester
    order_number = "13348"
    
    # Permettre de passer le numéro en argument
    if len(sys.argv) > 1:
        order_number = sys.argv[1]
    
    # Exécuter le test
    test_order_lookup(order_number)
