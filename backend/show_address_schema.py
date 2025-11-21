"""Afficher le schéma de la table Address."""
import sys
sys.path.insert(0, '.')

from app.services.database import db_service

schema = db_service.get_table_schema('Address')

print("Schéma de la table Address:")
print("=" * 60)
for col in schema:
    print(f"{col['name']:<30} {col['type']:<15} {col['nullable']}")
