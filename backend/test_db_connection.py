"""Script de test pour la connexion SQL Server."""
import sys
sys.path.insert(0, '.')

from app.services.database import db_service

def test_connection():
    """Tester la connexion à SQL Server."""
    print("🔍 Test de connexion à SQL Server...")
    print("=" * 60)
    
    # Test 1: Connexion basique
    result = db_service.test_connection()
    
    if result["success"]:
        print("✅ Connexion réussie !")
        print(f"📊 Base de données: {result['database']}")
        print(f"🖥️  Serveur: {result['server_version'][:100]}...")
    else:
        print(f"❌ Échec: {result.get('error')}")
        return
    
    print("\n" + "=" * 60)
    print("📋 Liste des tables disponibles:")
    print("=" * 60)
    
    # Test 2: Lister les tables
    tables = db_service.list_tables()
    
    if tables:
        for i, table in enumerate(tables, 1):
            print(f"{i:3d}. {table}")
        print(f"\n📊 Total: {len(tables)} tables trouvées")
    else:
        print("❌ Aucune table trouvée ou erreur")
        return
    
    # Test 3: Schéma de la table Cart
    print("\n" + "=" * 60)
    print("🛒 Schéma de la table dbo.Cart:")
    print("=" * 60)
    
    cart_schema = db_service.get_table_schema("Cart")
    
    if cart_schema:
        print(f"{'Colonne':<30} {'Type':<15} {'Nullable':<10} {'Longueur'}")
        print("-" * 70)
        for col in cart_schema:
            length = str(col['max_length']) if col['max_length'] else '-'
            print(f"{col['name']:<30} {col['type']:<15} {col['nullable']:<10} {length}")
    else:
        print("❌ Impossible de récupérer le schéma")

if __name__ == "__main__":
    test_connection()
