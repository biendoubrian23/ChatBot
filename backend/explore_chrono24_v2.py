"""Script pour explorer plus en détail Chrono24."""
import sys
sys.path.insert(0, ".")

from app.services.database_provider import Chrono24DatabaseService

db = Chrono24DatabaseService()

# 1. Voir un exemple de Card
print("\n" + "="*60)
print("📦 EXEMPLES DE CARDS (3 dernières)")
print("="*60)
cards = db.execute_query("""
    SELECT TOP 3 
        c.CardId, c.OrderRef, c.Description, c.Quantity, 
        cs.Name as Statut, c.CreationDate, c.TotalHT,
        c.EstimatedShippingDate, c.ActualShippingDate
    FROM Card c
    LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
    ORDER BY c.CardId DESC
""")
if cards:
    for c in cards:
        print(f"\n  Card #{c['CardId']}")
        print(f"    OrderRef: {c['OrderRef']}")
        print(f"    Description: {c['Description'][:50] if c['Description'] else 'N/A'}...")
        print(f"    Quantité: {c['Quantity']}")
        print(f"    Statut: {c['Statut']}")
        print(f"    Création: {c['CreationDate']}")
        print(f"    Expédition estimée: {c['EstimatedShippingDate']}")
        print(f"    Expédition réelle: {c['ActualShippingDate']}")
        print(f"    Total HT: {c['TotalHT']}€")

# 2. Structure Contact
print("\n" + "="*60)
print("👤 STRUCTURE TABLE 'Contact'")
print("="*60)
cols = db.get_table_columns("Contact")
if cols:
    for col in cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

# 3. Structure Address
print("\n" + "="*60)
print("📍 STRUCTURE TABLE 'Address'")
print("="*60)
cols = db.get_table_columns("Address")
if cols:
    for col in cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

# 4. Structure Shipping
print("\n" + "="*60)
print("🚚 STRUCTURE TABLE 'Shipping'")
print("="*60)
cols = db.get_table_columns("Shipping")
if cols:
    for col in cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

# 5. CardDispatch pour le tracking
print("\n" + "="*60)
print("📤 STRUCTURE TABLE 'CardDispatch'")
print("="*60)
cols = db.get_table_columns("CardDispatch")
if cols:
    for col in cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

print("\n✅ Exploration terminée")
