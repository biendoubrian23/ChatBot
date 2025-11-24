"""Vérifier le format des dates pour la commande 13305."""
from app.services.database import Database

# Récupérer les données de la commande 13305
db = Database()
order_data = db.get_order_tracking_details(13305)

print("=" * 80)
print("VÉRIFICATION FORMAT DES DATES - Commande 13305")
print("=" * 80)

if order_data and "items" in order_data:
    for i, item in enumerate(order_data["items"], 1):
        print(f"\n📦 Article {i}:")
        print(f"  - estimated_shipping: {item.get('estimated_shipping')} (type: {type(item.get('estimated_shipping'))})")
        print(f"  - confirmed_shipping: {item.get('confirmed_shipping')} (type: {type(item.get('confirmed_shipping'))})")
        print(f"  - production_date: {item.get('production_date')} (type: {type(item.get('production_date'))})")
        
        # Tester le parsing
        estimated = item.get('estimated_shipping')
        if estimated:
            print(f"\n  🧪 Test parsing estimated_shipping...")
            try:
                from datetime import datetime
                if isinstance(estimated, str):
                    # Format attendu: "YYYY-MM-DD HH:MM:SS.ffffff"
                    parsed = datetime.fromisoformat(estimated.split()[0])  # Prendre juste la date
                    print(f"  ✅ Format OK: {parsed.strftime('%Y-%m-%d')}")
                else:
                    print(f"  ⚠️ Type inattendu: {type(estimated)}")
            except Exception as e:
                print(f"  ❌ ERREUR de parsing: {e}")
else:
    print("❌ Commande non trouvée ou sans articles")

print("\n" + "=" * 80)
