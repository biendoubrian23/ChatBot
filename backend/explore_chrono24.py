"""Script pour explorer la base Chrono24."""
import sys
sys.path.insert(0, ".")

from app.services.database_provider import Chrono24DatabaseService

db = Chrono24DatabaseService()

# 1. Lister les tables
print("\n" + "="*60)
print("📋 TABLES CHRONO24")
print("="*60)
tables = db.get_tables()
if tables:
    for t in tables:
        print(f"  {t['TABLE_SCHEMA']}.{t['TABLE_NAME']}")
    print(f"\n  Total: {len(tables)} tables")

# 2. Explorer la table Order
print("\n" + "="*60)
print("📦 STRUCTURE TABLE 'Order'")
print("="*60)
order_cols = db.get_table_columns("Order")
if order_cols:
    for col in order_cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

# 3. Explorer la table Card
print("\n" + "="*60)
print("🎴 STRUCTURE TABLE 'Card'")
print("="*60)
card_cols = db.get_table_columns("Card")
if card_cols:
    for col in card_cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

# 4. Explorer CardState
print("\n" + "="*60)
print("📊 STRUCTURE TABLE 'CardState'")
print("="*60)
state_cols = db.get_table_columns("CardState")
if state_cols:
    for col in state_cols:
        nullable = "NULL" if col['IS_NULLABLE'] == 'YES' else "NOT NULL"
        print(f"  {col['COLUMN_NAME']:30s} {col['DATA_TYPE']:15s} {nullable}")

# 5. Voir quelques CardState pour comprendre les statuts
print("\n" + "="*60)
print("📊 VALEURS CardState")
print("="*60)
states = db.execute_query("SELECT TOP 20 * FROM CardState ORDER BY CardStateId")
if states:
    for s in states:
        print(f"  {s}")

print("\n" + "="*60)
print("✅ Exploration terminée")
print("="*60)
