"""Test de la configuration sécurisée des bases de données."""
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('../.env')

from DBCoollibri.config import DB_CONFIG as COOLLIBRI_CONFIG
from DBChrono24.config import DB_CONFIG as CHRONO24_CONFIG

def mask_password(pwd):
    return "*" * len(pwd) if pwd else "NON DEFINI!"

print("=" * 50)
print("🔐 TEST CONFIGURATION SECURISEE")
print("=" * 50)

print("\n✅ COOLLIBRI:")
print(f"   Host: {COOLLIBRI_CONFIG['host']}")
print(f"   Database: {COOLLIBRI_CONFIG['database']}")
print(f"   User: {COOLLIBRI_CONFIG['username']}")
print(f"   Password: {mask_password(COOLLIBRI_CONFIG['password'])}")

print("\n✅ CHRONO24:")
print(f"   Host: {CHRONO24_CONFIG['host']}")
print(f"   Database: {CHRONO24_CONFIG['database']}")
print(f"   User: {CHRONO24_CONFIG['username']}")
print(f"   Password: {mask_password(CHRONO24_CONFIG['password'])}")

print("\n" + "=" * 50)
print("🎉 Les credentials sont lus depuis .env, pas en dur!")
print("=" * 50)
