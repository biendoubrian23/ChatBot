"""
Script de test pour LibriAssist
Vérifie que backend et frontend sont opérationnels
"""
import requests
import time
from colorama import init, Fore, Style

init(autoreset=True)

print(f"{Fore.CYAN}{'='*60}")
print(f"{Fore.CYAN}🚀 TEST DE LibriAssist")
print(f"{Fore.CYAN}{'='*60}\n")

# Test 1: Backend Health Check
print(f"{Fore.YELLOW}📡 Test 1: Backend Hugging Face...")
try:
    response = requests.get(
        "https://brianbiendou-libriassist-backend.hf.space/health",
        timeout=10
    )
    if response.status_code == 200:
        print(f"{Fore.GREEN}✅ Backend OK - Status: {response.status_code}")
        print(f"{Fore.GREEN}   Response: {response.json()}")
    else:
        print(f"{Fore.RED}❌ Backend Error - Status: {response.status_code}")
except Exception as e:
    print(f"{Fore.RED}❌ Backend non accessible: {e}")

print()

# Test 2: Backend Root
print(f"{Fore.YELLOW}📡 Test 2: Backend Info...")
try:
    response = requests.get(
        "https://brianbiendou-libriassist-backend.hf.space/",
        timeout=10
    )
    if response.status_code == 200:
        print(f"{Fore.GREEN}✅ Backend Info OK")
        data = response.json()
        print(f"{Fore.GREEN}   Status: {data.get('status')}")
        print(f"{Fore.GREEN}   Documents: {data.get('documents')}")
except Exception as e:
    print(f"{Fore.RED}❌ Backend info error: {e}")

print()

# Test 3: Chat API
print(f"{Fore.YELLOW}💬 Test 3: Chat API...")
try:
    response = requests.post(
        "https://brianbiendou-libriassist-backend.hf.space/api/v1/chat",
        json={"message": "Quels sont vos délais de livraison ?"},
        timeout=30
    )
    if response.status_code == 200:
        print(f"{Fore.GREEN}✅ Chat API OK")
        data = response.json()
        print(f"{Fore.GREEN}   Réponse: {data.get('response')[:100]}...")
    else:
        print(f"{Fore.RED}❌ Chat Error - Status: {response.status_code}")
except Exception as e:
    print(f"{Fore.RED}❌ Chat API error: {e}")

print()

# Test 4: Frontend
print(f"{Fore.YELLOW}🌐 Test 4: Frontend Netlify...")
try:
    response = requests.get("https://libriassist.netlify.app/", timeout=10)
    if response.status_code == 200:
        print(f"{Fore.GREEN}✅ Frontend OK - Status: {response.status_code}")
    else:
        print(f"{Fore.RED}❌ Frontend Error - Status: {response.status_code}")
except Exception as e:
    print(f"{Fore.RED}❌ Frontend error: {e}")

print(f"\n{Fore.CYAN}{'='*60}")
print(f"{Fore.CYAN}📊 RÉSUMÉ")
print(f"{Fore.CYAN}{'='*60}")
print(f"{Fore.WHITE}Backend  : https://brianbiendou-libriassist-backend.hf.space")
print(f"{Fore.WHITE}Frontend : https://libriassist.netlify.app")
print(f"{Fore.CYAN}{'='*60}\n")
