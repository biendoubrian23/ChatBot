"""Script pour explorer OrderLine et les relations."""
import sys
sys.path.insert(0, '.')

from app.services.database import db_service

def explore_orderline():
    """Explorer OrderLine et les relations."""
    
    # 1. Schéma OrderLine
    print("=" * 80)
    print("📦 Schéma de la table dbo.OrderLine:")
    print("=" * 80)
    
    schema = db_service.get_table_schema("OrderLine")
    
    if schema:
        print(f"{'Colonne':<35} {'Type':<20} {'Nullable':<10} {'Longueur'}")
        print("-" * 80)
        for col in schema:
            length = str(col['max_length']) if col['max_length'] else '-'
            print(f"{col['name']:<35} {col['type']:<20} {col['nullable']:<10} {length}")
        print(f"\n📊 Total: {len(schema)} colonnes")
    
    # 2. Exemples de données OrderLine
    print("\n" + "=" * 80)
    print("📋 Exemple de lignes de commande (TOP 3):")
    print("=" * 80)
    
    if not db_service.connect():
        return
    
    try:
        cursor = db_service.connection.cursor()
        
        cursor.execute("SELECT TOP 3 * FROM dbo.OrderLine ORDER BY OrderLineId DESC")
        
        columns = [col[0] for col in cursor.description]
        print(f"\nColonnes: {', '.join(columns)}\n")
        
        for i, row in enumerate(cursor.fetchall(), 1):
            print(f"--- Ligne {i} ---")
            for col, val in zip(columns, row):
                if val is not None and str(val).strip():
                    print(f"  {col}: {val}")
            print()
        
        # 3. Jointure complète Order + OrderLine + Product
        print("=" * 80)
        print("🔗 Commande complète (Order + OrderLine + Product) - Exemple:")
        print("=" * 80)
        
        query = """
            SELECT TOP 1
                o.OrderId,
                o.OrderDate,
                o.PriceTTC as OrderTotal,
                o.OrderStatusId,
                ol.OrderLineId,
                ol.Quantity,
                ol.PriceHT,
                ol.PriceTTC as LineTTC,
                ol.ChronoNumber,
                ol.DateShippingEstimatedFinal,
                ol.NumberPagesTotal,
                p.ProductId,
                p.Name as ProductName
            FROM dbo.[Order] o
            INNER JOIN dbo.OrderLine ol ON o.OrderId = ol.OrderId
            LEFT JOIN dbo.Product p ON ol.ProductId = p.ProductId
            ORDER BY o.OrderId DESC
        """
        
        cursor.execute(query)
        
        columns = [col[0] for col in cursor.description]
        row = cursor.fetchone()
        
        if row:
            print("\n📦 Commande détaillée:\n")
            for col, val in zip(columns, row):
                print(f"  {col}: {val}")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        db_service.disconnect()

if __name__ == "__main__":
    explore_orderline()
