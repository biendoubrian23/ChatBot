"""
Monitoring automatique du backend LibriAssist
Attend que le backend soit prêt et notifie
"""
import requests
import time
from datetime import datetime
from colorama import init, Fore, Style

init(autoreset=True)

print(f"{Fore.CYAN}{'='*60}")
print(f"{Fore.CYAN}⏰ MONITORING BACKEND LibriAssist")
print(f"{Fore.CYAN}{'='*60}\n")

backend_url = "https://brianbiendou-libriassist-backend.hf.space"
max_attempts = 20
wait_time = 15  # secondes entre chaque test

for attempt in range(1, max_attempts + 1):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{Fore.YELLOW}[{timestamp}] Tentative {attempt}/{max_attempts}...")
    
    try:
        # Test 1: Endpoint racine
        response = requests.get(f"{backend_url}/", timeout=10)
        
        if response.status_code == 200:
            print(f"{Fore.GREEN}\n🎉 BACKEND PRÊT !")
            data = response.json()
            print(f"{Fore.GREEN}{'='*60}")
            print(f"{Fore.WHITE}Status: {data.get('status')}")
            print(f"{Fore.WHITE}Model: {data.get('model', 'N/A')}")
            print(f"{Fore.WHITE}Documents: {data.get('documents', 0)}")
            print(f"{Fore.GREEN}{'='*60}\n")
            
            # Test 2: Health check
            health = requests.get(f"{backend_url}/health", timeout=5)
            if health.status_code == 200:
                health_data = health.json()
                print(f"{Fore.GREEN}✅ Health Check:")
                for service, status in health_data.get('services', {}).items():
                    icon = "✅" if status else "❌"
                    print(f"{Fore.WHITE}   {icon} {service}: {status}")
            
            print(f"\n{Fore.CYAN}🌐 Vous pouvez maintenant utiliser:")
            print(f"{Fore.WHITE}   Frontend: https://libriassist.netlify.app")
            print(f"{Fore.WHITE}   Backend:  {backend_url}")
            break
        else:
            print(f"{Fore.RED}   ❌ Status: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print(f"{Fore.RED}   ⏳ Timeout - Service encore en démarrage")
    except requests.exceptions.ConnectionError:
        print(f"{Fore.RED}   🔌 Connexion impossible - Service pas encore disponible")
    except Exception as e:
        print(f"{Fore.RED}   ❌ Erreur: {str(e)[:50]}")
    
    if attempt < max_attempts:
        print(f"{Fore.YELLOW}   ⏰ Nouvelle tentative dans {wait_time}s...\n")
        time.sleep(wait_time)
    else:
        print(f"\n{Fore.RED}❌ Timeout après {max_attempts} tentatives")
        print(f"{Fore.YELLOW}Vérifiez les logs: {backend_url}")
