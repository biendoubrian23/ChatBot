"""Test rapide des configurations Supabase"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=== Tests Supabase ===\n")

# Test 1: Table document_chunks
try:
    result = supabase.table('document_chunks').select('id').limit(1).execute()
    print("✅ Table document_chunks existe")
except Exception as e:
    print(f"❌ Table document_chunks: {e}")

# Test 2: Colonne storage_path
try:
    result = supabase.table('documents').select('storage_path').limit(1).execute()
    print("✅ Colonne storage_path existe")
except Exception as e:
    print(f"❌ Colonne storage_path: {e}")

# Test 3: Fonction match_documents
try:
    result = supabase.rpc('match_documents', {
        'query_embedding': [0.1] * 384,
        'match_workspace_id': '00000000-0000-0000-0000-000000000000',
        'match_count': 1,
        'match_threshold': 0.1
    }).execute()
    print("✅ Fonction match_documents existe")
except Exception as e:
    if 'does not exist' in str(e).lower():
        print(f"❌ Fonction match_documents MANQUANTE!")
    else:
        print(f"✅ Fonction match_documents existe (résultat: {e})")

# Test 4: Storage
try:
    test_content = b'test monitora storage'
    supabase.storage.from_('documents').upload('_test/test.txt', test_content, {'upsert': 'true'})
    supabase.storage.from_('documents').remove(['_test/test.txt'])
    print("✅ Storage fonctionne")
except Exception as e:
    print(f"❌ Storage: {e}")

print("\n=== Fin des tests ===")
