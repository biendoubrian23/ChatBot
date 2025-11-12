"""Script pour récupérer les logs détaillés du Space HF"""
from huggingface_hub import HfApi
import sys

try:
    api = HfApi()
    
    # Récupérer les informations du Space
    space_info = api.space_info(repo_id='brianbiendou/libriassist-backend')
    runtime = api.get_space_runtime(repo_id='brianbiendou/libriassist-backend')
    
    print("=" * 70)
    print("📊 DIAGNOSTIC HUGGING FACE SPACE")
    print("=" * 70)
    print(f"\n🔹 Space ID: {space_info.id}")
    print(f"🔹 Status: {runtime.stage}")
    print(f"🔹 SDK: {space_info.sdk}")
    
    if hasattr(runtime, 'hardware'):
        print(f"🔹 Hardware: {runtime.hardware}")
    
    if hasattr(runtime, 'error_message') and runtime.error_message:
        print(f"\n❌ Message d'erreur:")
        print(runtime.error_message)
    
    print("\n" + "=" * 70)
    print("🔍 POINTS À VÉRIFIER SUR HUGGING FACE:")
    print("=" * 70)
    print("\n1. Allez sur: https://huggingface.co/spaces/brianbiendou/libriassist-backend/logs")
    print("\n2. Cherchez dans les logs:")
    print("   ❌ 'Error loading'")
    print("   ❌ 'ModuleNotFoundError'")
    print("   ❌ 'Permission denied'")
    print("   ❌ 'Out of memory'")
    print("   ❌ 'Port already in use'")
    print("\n3. Vérifiez les fichiers:")
    print("   📁 Settings → Repository → Files")
    print("   ✓ app.py existe ?")
    print("   ✓ requirements.txt existe ?")
    print("   ✓ data/vectorstore/*.sqlite3 existe ?")
    print("\n4. Vérifiez les secrets:")
    print("   🔐 Settings → Repository secrets")
    print("   ✓ GROQ_API_KEY configurée ?")
    print("   ✓ HF_TOKEN configurée ?")
    print("\n" + "=" * 70)
    
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    print(f"Type: {type(e).__name__}")
    sys.exit(1)
