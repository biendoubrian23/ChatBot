"""Test avec la commande 13349."""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.order_tracking_service import OrderTrackingService

service = OrderTrackingService()

order_number = "13349"
print(f"🔍 Test avec commande #{order_number}\n")

order_data = service.get_order_tracking_info(order_number)

if order_data:
    print("✅ Commande trouvée\n")
    message = service.generate_tracking_response(order_data)
    print(message)
else:
    print("❌ Commande introuvable")
