"""Script pour explorer la structure de la table Order."""
import sys
sys.path.insert(0, '.')

from app.services.database import db_service

def explore_order_table():
    """Explorer la table dbo.Order."""
    
    print("=" * 80)
    print("🛒 Schéma de la table dbo.Order (Commandes):")
    print("=" * 80)
    
    # Schéma
    schema = db_service.get_table_schema("Order")
    
    if schema:
        print(f"{'Colonne':<35} {'Type':<20} {'Nullable':<10} {'Longueur'}")
        print("-" * 80)
        for col in schema:
            length = str(col['max_length']) if col['max_length'] else '-'
            print(f"{col['name']:<35} {col['type']:<20} {col['nullable']:<10} {length}")
        
        print(f"\n📊 Total: {len(schema)} colonnes")
    
    # Sample data
    print("\n" + "=" * 80)
    print("📋 Exemple de données (3 premières commandes):")
    print("=" * 80)
    
    if not db_service.connect():
        print("❌ Impossible de se connecter")
        return
    
    try:
        cursor = db_service.connection.cursor()
        
        # Chercher des colonnes importantes
        query = """
            SELECT TOP 3
                *
            FROM dbo.[Order]
            ORDER BY OrderId DESC
        """
        
        cursor.execute(query)
        
        # Colonnes
        columns = [column[0] for column in cursor.description]
        print(f"\nColonnes: {', '.join(columns)}\n")
        
        # Lignes
        for i, row in enumerate(cursor.fetchall(), 1):
            print(f"--- Commande {i} ---")
            for col, val in zip(columns, row):
                if val is not None and str(val).strip():
                    print(f"  {col}: {val}")
            print()
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        db_service.disconnect()

if __name__ == "__main__":
    explore_order_table()
