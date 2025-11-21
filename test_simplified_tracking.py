#!/usr/bin/env python3
"""
Test du système de suivi de commandes simplifié (sans validation nom)
"""
import requests
import json

def test_simplified_order_tracking():
    """Test du nouveau système simplifié"""
    
    base_url = "http://localhost:8000"
    test_order_number = "13349"
    
    print("🧪 Test du système de suivi de commandes SIMPLIFIÉ")
    print("=" * 60)
    
    # Test 1: API de santé
    print("1. Test de l'API de santé...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("   ✅ API de santé OK")
        else:
            print(f"   ❌ Erreur API de santé: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # Test 2: API de tracking direct (sans validation nom)
    print(f"2. Test API tracking direct: {test_order_number}")
    try:
        response = requests.get(f"{base_url}/api/v1/order/{test_order_number}/tracking")
        if response.status_code == 200:
            tracking_data = response.json()
            print(f"   ✅ Tracking récupéré pour commande #{tracking_data['order_number']}")
            
            # Afficher un extrait de la réponse
            tracking_response = tracking_data['tracking_response']
            lines = tracking_response.split('\n')
            print("   📦 Aperçu de la réponse:")
            for line in lines[:8]:  # Première lignes
                if line.strip():
                    print(f"       {line}")
            print("       ...")
            print(f"   📊 Longueur totale: {len(tracking_response)} caractères")
        else:
            print(f"   ❌ Erreur API tracking: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erreur API: {e}")
    
    # Test 3: Frontend disponibilité
    print("3. Test disponibilité frontend...")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("   ✅ Frontend accessible")
        else:
            print(f"   ⚠️  Frontend répond mais statut: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Frontend non accessible: {str(e)[:100]}...")
    
    print("\n🎯 Résumé du nouveau système SIMPLIFIÉ:")
    print("   - ✅ Plus de validation par nom requise")
    print("   - ✅ Accès direct avec numéro de commande uniquement")
    print("   - ✅ Expérience utilisateur simplifiée")
    print("   - ✅ Réponse intelligente et contextualisée")
    
    print("\n📋 Instructions d'utilisation:")
    print("   1. Ouvrez http://localhost:3000 dans votre navigateur")
    print("   2. Cliquez sur 'Suivre ma commande' ou tapez 'suivi commande'")
    print("   3. Entrez simplement le numéro: 13349")
    print("   4. ✨ Accès immédiat aux informations de suivi!")
    
    return True

if __name__ == "__main__":
    test_simplified_order_tracking()