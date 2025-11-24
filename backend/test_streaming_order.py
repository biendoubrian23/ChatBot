"""Test du streaming des réponses de commande."""
import requests
import sys

def test_streaming_order(order_number: int):
    """Test le streaming pour une commande."""
    url = f"http://localhost:8000/api/v1/order/{order_number}/tracking/stream"
    
    print(f"🧪 Test streaming pour commande #{order_number}")
    print("=" * 60)
    
    try:
        response = requests.get(url, stream=True, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Erreur {response.status_code}: {response.text}")
            return
        
        print("✅ Connexion streaming établie")
        print("\n📝 Réponse streamée :\n")
        
        full_content = ""
        chunk_count = 0
        
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith('data: '):
                    import json
                    try:
                        data = json.loads(decoded[6:])
                        
                        if data.get('type') == 'token':
                            content = data.get('content', '')
                            full_content = content
                            chunk_count += 1
                            # Afficher en temps réel
                            print(f"\r{content}", end='', flush=True)
                        
                        elif data.get('type') == 'done':
                            print(f"\n\n✅ Streaming terminé ({chunk_count} chunks reçus)")
                        
                        elif data.get('type') == 'error':
                            print(f"\n❌ Erreur: {data.get('message')}")
                    
                    except json.JSONDecodeError as e:
                        print(f"\n⚠️ Erreur parsing JSON: {e}")
        
        print("\n" + "=" * 60)
        print(f"📊 Total: {len(full_content)} caractères")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur requête: {e}")
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrompu par l'utilisateur")


if __name__ == "__main__":
    order_num = int(sys.argv[1]) if len(sys.argv) > 1 else 13305
    test_streaming_order(order_num)
