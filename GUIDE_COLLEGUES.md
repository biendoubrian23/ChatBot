# 🚀 Guide de Démarrage LibriAssist - Pour Collègues

## 📋 Vue d'ensemble

**LibriAssist** est un chatbot intelligent basé sur RAG (Retrieval-Augmented Generation) qui répond aux questions sur CoolLibri en utilisant 703 documents vectorisés.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE LIBRIASSIST                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (Netlify)                                             │
│  https://libriassist.netlify.app                                │
│           │                                                     │
│           ▼                                                     │
│  Tunnel ngrok                                                   │
│  https://xxxx.ngrok-free.dev/api/v1                             │
│           │                                                     │
│           ▼                                                     │
│  Backend FastAPI (Local - Port 8080)                            │
│  ├─ 703 documents vectorisés (ChromaDB)                         │
│  ├─ Embeddings (sentence-transformers)                          │
│  └─ RAG Pipeline                                                │
│           │                                                     │
│           ▼                                                     │
│  Ollama (Local)                                                 │
│  └─ Modèle: llama3.1:8b                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Prérequis (À installer AVANT le premier lancement)

### 1. Python 3.11+
- Télécharger depuis: https://www.python.org/downloads/
- ✅ Cocher "Add Python to PATH" pendant l'installation

### 2. Ollama
- Télécharger depuis: https://ollama.ai/download
- Après installation, ouvrir un terminal et exécuter:
  ```powershell
  ollama pull llama3.1:8b
  ```
  ⏱️ Cela télécharge ~4.7 GB (peut prendre 10-20 minutes)

### 3. ngrok
- Télécharger depuis: https://ngrok.com/download
- Créer un compte gratuit sur https://dashboard.ngrok.com/signup
- Récupérer votre authtoken sur: https://dashboard.ngrok.com/get-started/your-authtoken
- Configurer ngrok:
  ```powershell
  ngrok authtoken VOTRE_TOKEN_ICI
  ```

### 4. Environnement Python (première fois seulement)
```powershell
# Aller dans le dossier du projet
cd X:\MesApplis\BiendouCorp\ChatBot\backend

# Créer l'environnement virtuel
python -m venv .venv

# Activer l'environnement
.\.venv\Scripts\Activate.ps1

# Installer les dépendances
pip install -r requirements.txt
```

---

## 🎯 Démarrage Rapide (Utilisation Quotidienne)

### Option 1: Script Automatique (RECOMMANDÉ)

**Un seul double-clic suffit !**

1. Aller dans le dossier `X:\MesApplis\BiendouCorp\ChatBot`
2. **Double-cliquer** sur `start_local.ps1`
3. Attendre que tout démarre (~30 secondes)
4. Noter l'URL ngrok affichée (ex: `https://tsunamic-postpositively-noel.ngrok-free.dev`)
5. Ouvrir https://libriassist.netlify.app et tester !

**Le script fait automatiquement:**
- ✅ Vérifie qu'Ollama tourne
- ✅ Vérifie que llama3.1:8b est disponible
- ✅ Active l'environnement Python
- ✅ Lance le backend FastAPI (port 8080)
- ✅ Charge les 703 documents vectorisés
- ✅ Crée le tunnel ngrok

---

### Option 2: Démarrage Manuel (Pour Debug)

#### Terminal 1 - Backend FastAPI
```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 0.0.0.0 --port 8080
```

**Attendez ce message:**
```
✅ LibriAssist API is ready!
📍 Listening on http://0.0.0.0:8080
📚 Vector store contains 703 documents
```

#### Terminal 2 - ngrok Tunnel
```powershell
ngrok http 8080
```

**Copiez l'URL "Forwarding":**
```
Forwarding  https://xxxx.ngrok-free.dev -> http://localhost:8080
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            Copiez cette URL
```

---

## 🔧 Mise à Jour de l'URL ngrok sur Netlify

⚠️ **À faire UNIQUEMENT si l'URL ngrok a changé**

L'URL ngrok change si:
- Vous redémarrez ngrok après plusieurs heures
- Vous utilisez un autre compte ngrok
- La session ngrok expire (plan gratuit)

### Étapes:

1. **Mettre à jour la variable d'environnement Netlify:**
   ```powershell
   cd X:\MesApplis\BiendouCorp\ChatBot\frontend
   netlify env:set NEXT_PUBLIC_API_URL "https://NOUVELLE_URL_NGROK/api/v1" --force
   ```

2. **Redéployer le frontend:**
   ```powershell
   netlify deploy --prod
   ```

3. **Attendre 1-2 minutes** que le déploiement se termine

4. **Tester:** https://libriassist.netlify.app

---

## 🧪 Tests et Vérification

### Test 1: Backend Local
```powershell
curl http://localhost:8080/api/v1/health
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "ollama_available": true,
  "vectorstore_loaded": true
}
```

### Test 2: Tunnel ngrok
Ouvrir dans un navigateur:
```
https://VOTRE_URL_NGROK/api/v1/health
```

**IMPORTANT:** La première fois, ngrok affiche une page de vérification. Cliquez sur "Visit Site".

### Test 3: Frontend Netlify
1. Ouvrir: https://libriassist.netlify.app
2. Poser une question: *"Quels sont vos délais de livraison ?"*
3. Le chatbot doit répondre en ~3-5 secondes avec des infos de CoolLibri

---

## 📊 Monitoring

### Interface Web ngrok
- Ouvrir: http://127.0.0.1:4040
- Voir toutes les requêtes en temps réel
- Utile pour débugger les appels API

### Logs Backend
Le terminal du backend affiche:
```
INFO:     37.26.184.154:0 - "POST /api/v1/chat HTTP/1.1" 200 OK
```
Chaque ligne = une requête du chatbot

---

## ❓ Problèmes Fréquents

### Le backend ne démarre pas
```powershell
# Vérifier que le port 8080 n'est pas utilisé
netstat -ano | findstr :8080

# Si utilisé, tuer le processus
taskkill /PID [NUMERO_PID] /F
```

### Ollama ne répond pas
```powershell
# Vérifier qu'Ollama tourne
ollama list

# Si erreur, relancer Ollama
ollama serve
```

### ngrok affiche "Tunnel not found"
```powershell
# Vérifier votre authtoken
ngrok config check

# Reconfigurer si nécessaire
ngrok authtoken VOTRE_TOKEN
```

### Le chatbot ne répond pas sur Netlify
1. Vérifier que le backend local tourne: http://localhost:8080/api/v1/health
2. Vérifier que ngrok est actif et affiche l'URL
3. Ouvrir l'URL ngrok dans un navigateur pour passer la page de vérification
4. Vérifier les logs ngrok (http://127.0.0.1:4040)

---

## 🛑 Arrêt des Services

### Arrêt Propre
1. **Dans le terminal ngrok:** Appuyer sur `Ctrl+C`
2. **Dans le terminal backend:** Appuyer sur `Ctrl+C`

### Arrêt Forcé (si bloqué)
```powershell
# Trouver le processus Python
tasklist | findstr python

# Tuer le processus
taskkill /IM python.exe /F
```

---

## 📝 Notes Importantes

### ⚠️ Limitations du Plan Gratuit ngrok
- L'URL peut changer à chaque redémarrage
- Maximum 40 connexions/minute
- Tunnel expire après 8 heures d'inactivité

### 💡 Conseil pour Démo Longue
Si vous faites une démo de plusieurs heures:
1. Lancer le script `start_local.ps1` au début
2. **NE PAS FERMER** la fenêtre ngrok
3. Noter l'URL ngrok et la partager avec les collègues
4. Les collègues vont sur https://libriassist.netlify.app pour tester

### 🔒 Sécurité
- Ne jamais committer les tokens ngrok dans Git
- L'URL ngrok est publique mais temporaire
- Pas de données sensibles dans les réponses du chatbot

---

## 📞 Contact & Support

**En cas de problème:**
1. Vérifier la section "Problèmes Fréquents" ci-dessus
2. Consulter les logs du backend et ngrok
3. Contacter l'équipe technique

**URLs Utiles:**
- Frontend: https://libriassist.netlify.app
- Backend local: http://localhost:8080
- Documentation API: http://localhost:8080/docs
- ngrok Dashboard: https://dashboard.ngrok.com

---

## 🎉 C'est Parti !

Vous êtes prêt à faire tourner LibriAssist ! 

**Commande la plus simple:**
```powershell
.\start_local.ps1
```

Bon test ! 🚀
