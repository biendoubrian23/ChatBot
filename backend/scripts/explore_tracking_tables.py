"""
Script pour explorer les tables de la base de données et trouver
les informations de tracking et statuts.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database import DatabaseService
import pyodbc

def explore_order_status_table():
    """Explorer la table OrderStatus pour les statuts"""
    db = DatabaseService()
    if not db.connect():
        print("❌ Impossible de se connecter")
        return
    
    try:
        cursor = db.connection.cursor()
        
        print("\n" + "="*80)
        print("📊 TABLE: OrderStatus")
        print("="*80)
        
        # Obtenir la structure de la table
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'OrderStatus'
            ORDER BY ORDINAL_POSITION
        """)
        
        print("\n🔍 Structure de la table:")
        for row in cursor.fetchall():
            print(f"  - {row.COLUMN_NAME}: {row.DATA_TYPE} (NULL: {row.IS_NULLABLE})")
        
        # Récupérer tous les statuts
        cursor.execute("SELECT * FROM dbo.OrderStatus")
        columns = [column[0] for column in cursor.description]
        
        print(f"\n📋 Données (Colonnes: {', '.join(columns)}):")
        print("-" * 80)
        
        for row in cursor.fetchall():
            row_dict = dict(zip(columns, row))
            print(f"\n{row_dict}")
        
        cursor.close()
        
    except pyodbc.Error as e:
        print(f"❌ Erreur: {e}")
    finally:
        db.disconnect()


def explore_shipping_company_table():
    """Explorer la table ShippingCompany pour les transporteurs"""
    db = DatabaseService()
    if not db.connect():
        print("❌ Impossible de se connecter")
        return
    
    try:
        cursor = db.connection.cursor()
        
        print("\n" + "="*80)
        print("🚚 TABLE: ShippingCompany")
        print("="*80)
        
        # Structure
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'ShippingCompany'
            ORDER BY ORDINAL_POSITION
        """)
        
        print("\n🔍 Structure de la table:")
        for row in cursor.fetchall():
            print(f"  - {row.COLUMN_NAME}: {row.DATA_TYPE} (NULL: {row.IS_NULLABLE})")
        
        # Données
        cursor.execute("SELECT * FROM dbo.ShippingCompany")
        columns = [column[0] for column in cursor.description]
        
        print(f"\n📋 Données (Colonnes: {', '.join(columns)}):")
        print("-" * 80)
        
        for row in cursor.fetchall():
            row_dict = dict(zip(columns, row))
            print(f"\n{row_dict}")
        
        cursor.close()
        
    except pyodbc.Error as e:
        print(f"❌ Erreur: {e}")
    finally:
        db.disconnect()


def explore_order_line_tracking():
    """Explorer OrderLine pour les infos de tracking (chrono, dates, etc.)"""
    db = DatabaseService()
    if not db.connect():
        print("❌ Impossible de se connecter")
        return
    
    try:
        cursor = db.connection.cursor()
        
        print("\n" + "="*80)
        print("📦 TABLE: OrderLine (colonnes de tracking)")
        print("="*80)
        
        # Structure complète
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'OrderLine'
            ORDER BY ORDINAL_POSITION
        """)
        
        print("\n🔍 Toutes les colonnes:")
        for row in cursor.fetchall():
            print(f"  - {row.COLUMN_NAME}: {row.DATA_TYPE} (NULL: {row.IS_NULLABLE})")
        
        # Exemple avec la commande 13349
        print("\n📋 Exemple avec commande 13349:")
        print("-" * 80)
        
        cursor.execute("""
            SELECT 
                OrderLineId,
                OrderId,
                ProductId,
                ChronoNumber,
                DateProduction,
                DateShippingEstimatedFinal,
                DateShippingConfirmed,
                NumberPagesTotal,
                TrackingUrl,
                AllFilesRetrieved,
                ReadyForReproduction,
                Quantity
            FROM dbo.OrderLine
            WHERE OrderId = 13349
        """)
        
        columns = [column[0] for column in cursor.description]
        for row in cursor.fetchall():
            row_dict = dict(zip(columns, row))
            print(f"\n{row_dict}")
        
        cursor.close()
        
    except pyodbc.Error as e:
        print(f"❌ Erreur: {e}")
    finally:
        db.disconnect()


def explore_order_line_status():
    """Explorer OrderLineStatus pour le statut de chaque ligne"""
    db = DatabaseService()
    if not db.connect():
        print("❌ Impossible de se connecter")
        return
    
    try:
        cursor = db.connection.cursor()
        
        print("\n" + "="*80)
        print("📊 TABLE: OrderLineStatus")
        print("="*80)
        
        # Structure
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'OrderLineStatus'
            ORDER BY ORDINAL_POSITION
        """)
        
        print("\n🔍 Structure:")
        for row in cursor.fetchall():
            print(f"  - {row.COLUMN_NAME}: {row.DATA_TYPE} (NULL: {row.IS_NULLABLE})")
        
        # Vérifier s'il y a des données
        cursor.execute("SELECT TOP 20 * FROM dbo.OrderLineStatus")
        columns = [column[0] for column in cursor.description]
        
        print(f"\n📋 Exemples de données:")
        print("-" * 80)
        
        for row in cursor.fetchall():
            row_dict = dict(zip(columns, row))
            print(f"\n{row_dict}")
        
        cursor.close()
        
    except pyodbc.Error as e:
        print(f"❌ Erreur: {e}")
    finally:
        db.disconnect()


if __name__ == "__main__":
    print("🔍 EXPLORATION DES TABLES DE TRACKING")
    print("="*80)
    
    # 1. Statuts de commande
    explore_order_status_table()
    
    # 2. Transporteurs
    explore_shipping_company_table()
    
    # 3. Informations de tracking dans OrderLine
    explore_order_line_tracking()
    
    # 4. Statuts de ligne de commande
    explore_order_line_status()
    
    print("\n" + "="*80)
    print("✅ Exploration terminée")
    print("="*80)
