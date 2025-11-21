"""Analyser les statuts et étapes de commande."""
import sys
sys.path.insert(0, '.')

from app.services.database import db_service

def analyze_order_tracking():
    """Analyser les informations de suivi de commande."""
    
    if not db_service.connect():
        return
    
    try:
        cursor = db_service.connection.cursor()
        
        # 1. Table OrderStatus - Statuts disponibles
        print("=" * 80)
        print("📊 STATUTS DE COMMANDE (OrderStatus)")
        print("=" * 80)
        
        cursor.execute("SELECT * FROM dbo.OrderStatus")
        columns = [col[0] for col in cursor.description]
        
        print(f"Colonnes: {', '.join(columns)}")
        print()
        
        for row in cursor.fetchall():
            print(f"ID {row[0]}: {dict(zip(columns, row))}")
        
        # 2. OrderLineStatus - Statuts des lignes
        print("\n" + "=" * 80)
        print("📦 STATUTS DES LIGNES DE COMMANDE (OrderLineStatus)")
        print("=" * 80)
        
        cursor.execute("SELECT * FROM dbo.OrderLineStatus")
        columns = [col[0] for col in cursor.description]
        
        print(f"Colonnes: {', '.join(columns)}")
        print()
        
        for row in cursor.fetchall():
            print(f"ID {row[0]}: {dict(zip(columns, row))}")
        
        # 3. Dates importantes dans OrderLine
        print("\n" + "=" * 80)
        print("🚚 SUIVI DE PRODUCTION - Exemple commande 13349")
        print("=" * 80)
        
        query = """
            SELECT 
                ol.OrderLineId,
                ol.ChronoNumber,
                ol.DateProduction,
                ol.DateShippingEstimated,
                ol.DateShippingEstimatedFinal,
                ol.DateShippingConfirmed,
                ol.TrackingUrl,
                ol.ReadyToReproduce,
                ol.GetFiles,
                ol.GetFilesCouv,
                p.Name as ProductName
            FROM dbo.OrderLine ol
            LEFT JOIN dbo.Product p ON ol.ProductId = p.ProductId
            WHERE ol.OrderId = 13349
        """
        
        cursor.execute(query)
        columns = [col[0] for col in cursor.description]
        
        for row in cursor.fetchall():
            data = dict(zip(columns, row))
            print(f"\n📦 Ligne {data['OrderLineId']} - {data['ProductName']}")
            print(f"   🔢 Chrono: {data['ChronoNumber']}")
            print(f"   📅 Production: {data['DateProduction']}")
            print(f"   📦 Expédition estimée: {data['DateShippingEstimated']}")
            print(f"   📦 Expédition finale: {data['DateShippingEstimatedFinal']}")
            print(f"   ✅ Expédition confirmée: {data['DateShippingConfirmed']}")
            print(f"   🚚 Tracking: {data['TrackingUrl']}")
            print(f"   ✅ Prêt reproduction: {data['ReadyToReproduce']}")
            print(f"   📁 Fichiers récupérés: {data['GetFiles']}/{data['GetFilesCouv']}")
        
        # 4. ShippingCompany - Transporteurs
        print("\n" + "=" * 80)
        print("🚛 TRANSPORTEURS (ShippingCompany)")
        print("=" * 80)
        
        cursor.execute("SELECT TOP 10 * FROM dbo.ShippingCompany")
        columns = [col[0] for col in cursor.description]
        
        for row in cursor.fetchall():
            data = dict(zip(columns, row))
            print(f"ID {data.get('ShippingCompanyId', 'N/A')}: {data}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        db_service.disconnect()

if __name__ == "__main__":
    analyze_order_tracking()