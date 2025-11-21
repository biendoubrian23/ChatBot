"""
Script pour vérifier la structure de la table OrderStatus
"""

from app.services.database import DatabaseService
import asyncio

def check_orderstatus_structure():
    db = DatabaseService()
    try:
        if not db.connect():
            return
        
        cursor = db.connection.cursor()
        
        # Vérifier la structure de la table OrderStatus
        query = '''
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'OrderStatus'
        ORDER BY ORDINAL_POSITION
        '''
        
        cursor.execute(query)
        print('Structure de la table OrderStatus:')
        for row in cursor.fetchall():
            column_name = row.COLUMN_NAME
            data_type = row.DATA_TYPE
            is_nullable = row.IS_NULLABLE
            print(f'  {column_name} ({data_type}) - Nullable: {is_nullable}')
            
        # Voir quelques exemples de données
        query2 = 'SELECT TOP 10 * FROM OrderStatus'
        cursor.execute(query2)
        
        # Récupérer les noms de colonnes
        columns = [column[0] for column in cursor.description]
        print(f'\nColonnes disponibles: {columns}')
        
        print('\nExemples de données OrderStatus:')
        for row in cursor.fetchall():
            row_dict = {}
            for i, col in enumerate(columns):
                row_dict[col] = row[i]
            print(f'  {row_dict}')
        
        cursor.close()
            
    finally:
        db.disconnect()

if __name__ == "__main__":
    check_orderstatus_structure()