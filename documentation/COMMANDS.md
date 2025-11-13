# 📝 Commandes utiles - LibriAssist

Guide de référence rapide pour toutes les commandes importantes.

---

## 🚀 Installation et démarrage

### Installation complète
```powershell
# Installation automatique (recommandé)
.\install.ps1

# OU installation manuelle
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Télécharger le modèle LLM
```powershell
# Mistral 7B (recommandé)
ollama pull mistral:7b

# OU Llama 3 8B
ollama pull llama3:8b

# Lister les modèles installés
ollama list
```

### Indexer les documents
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python scripts\index_documents.py
```

### Démarrer l'application
```powershell
# Démarrage automatique (recommandé)
.\start.ps1

# OU démarrage manuel

# Terminal 1 - Backend
cd backend
.\venv\Scripts\Activate.ps1
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🔧 Développement

### Backend

```powershell
# Activer l'environnement virtuel
cd backend
.\venv\Scripts\Activate.ps1

# Démarrer avec hot-reload
python main.py

# Installer une nouvelle dépendance
pip install nom-du-package
pip freeze > requirements.txt

# Tester l'API
curl http://localhost:8000/api/v1/health

# Voir les logs
python main.py
```

### Frontend

```powershell
cd frontend

# Démarrer en développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm run start

# Linter
npm run lint

# Installer une dépendance
npm install nom-du-package

# Mettre à jour les dépendances
npm update
```

---

## 📊 Tests et vérification

### Tester l'API

```powershell
# Health check
curl http://localhost:8000/api/v1/health

# Stats
curl http://localhost:8000/api/v1/stats

# Test de chat (PowerShell)
$body = @{
    question = "Comment fonctionne CoolLibri ?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/chat" -Method Post -Body $body -ContentType "application/json"
```

### Vérifier ChromaDB

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python

# Dans Python
>>> from app.services.embeddings import EmbeddingService
>>> from app.services.vectorstore import VectorStoreService
>>> 
>>> embedding_service = EmbeddingService()
>>> vectorstore = VectorStoreService("./data/vectorstore", embedding_service)
>>> print(vectorstore.count())
>>> exit()
```

### Tester Ollama

```powershell
# Vérifier qu'Ollama tourne
ollama list

# Tester le modèle
ollama run mistral:7b "Bonjour, comment vas-tu ?"

# Voir les modèles disponibles
ollama list
```

---

## 🗂️ Gestion des documents

### Ajouter un nouveau PDF

```powershell
# 1. Copier le PDF dans docs/
Copy-Item "chemin/vers/document.pdf" -Destination "docs/"

# 2. Réindexer
cd backend
.\venv\Scripts\Activate.ps1
python scripts\index_documents.py
```

### Vider le vector store

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python

# Dans Python
>>> from app.services.embeddings import EmbeddingService
>>> from app.services.vectorstore import VectorStoreService
>>> 
>>> embedding_service = EmbeddingService()
>>> vectorstore = VectorStoreService("./data/vectorstore", embedding_service)
>>> vectorstore.clear()
>>> exit()
```

---

## ⚙️ Configuration

### Modifier les paramètres RAG

```powershell
# Éditer backend/.env
notepad backend\.env

# Paramètres importants :
# CHUNK_SIZE=800              # Taille des chunks
# CHUNK_OVERLAP=100           # Overlap entre chunks
# TOP_K_RESULTS=5             # Nombre de documents à récupérer
# RERANK_TOP_N=3              # Nombre final après reranking
# OLLAMA_MODEL=mistral:7b     # Modèle LLM à utiliser
```

### Changer le modèle LLM

```powershell
# 1. Télécharger le nouveau modèle
ollama pull llama3:8b

# 2. Modifier backend/.env
notepad backend\.env
# Changer : OLLAMA_MODEL=llama3:8b

# 3. Redémarrer le backend
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

### Modifier l'URL de l'API

```powershell
# Frontend - éditer .env.local
notepad frontend\.env.local
# Changer : NEXT_PUBLIC_API_URL=http://votre-serveur:8000/api/v1

# Rebuild le frontend
cd frontend
npm run build
```

---

## 🔍 Debugging

### Logs backend

```powershell
# Les logs s'affichent directement dans le terminal où tourne l'API
# Pour sauvegarder dans un fichier :
cd backend
.\venv\Scripts\Activate.ps1
python main.py > logs.txt 2>&1
```

### Logs frontend

```powershell
# Console navigateur (F12)
# OU dans le terminal Next.js
cd frontend
npm run dev
```

### Vérifier les ports utilisés

```powershell
# Voir ce qui écoute sur un port
netstat -ano | findstr :8000   # Backend
netstat -ano | findstr :3000   # Frontend
netstat -ano | findstr :11434  # Ollama
```

### Tuer un processus bloquant un port

```powershell
# Trouver le PID
netstat -ano | findstr :8000

# Tuer le processus (remplacer XXXX par le PID)
taskkill /PID XXXX /F
```

---

## 🧹 Nettoyage

### Nettoyer les caches

```powershell
# Backend
cd backend
Remove-Item -Recurse -Force __pycache__
Remove-Item -Recurse -Force app\__pycache__
Remove-Item -Recurse -Force app\*\__pycache__

# Frontend
cd frontend
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache
```

### Réinstallation complète

```powershell
# Backend
cd backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
npm install
```

### Supprimer le vector store

```powershell
cd backend\data
Remove-Item -Recurse -Force vectorstore\*
# Garder le .gitkeep
New-Item -Path "vectorstore\.gitkeep" -ItemType File
```

---

## 📦 Build de production

### Backend

```powershell
cd backend

# S'assurer que toutes les dépendances sont installées
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Installer Gunicorn (pour Linux/production)
pip install gunicorn

# Lancer avec Gunicorn (Linux)
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend

```powershell
cd frontend

# Build de production
npm run build

# Démarrer en production
npm run start

# Ou avec PM2 (production)
npm install -g pm2
pm2 start npm --name "libriassist" -- start
pm2 save
pm2 startup
```

---

## 🔄 Mise à jour

### Mettre à jour les dépendances Python

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Voir les packages obsolètes
pip list --outdated

# Mettre à jour un package
pip install --upgrade nom-du-package

# Mettre à jour requirements.txt
pip freeze > requirements.txt
```

### Mettre à jour les dépendances Node

```powershell
cd frontend

# Voir les packages obsolètes
npm outdated

# Mettre à jour un package
npm update nom-du-package

# Mettre à jour tous les packages (attention !)
npm update
```

---

## 🌐 Git

### Initialiser le repo (si pas déjà fait)

```powershell
git init
git add .
git commit -m "Initial commit - LibriAssist v1.0"
git branch -M main
git remote add origin https://github.com/biendoubrian23/ChatBot.git
git push -u origin main
```

### Commits réguliers

```powershell
# Voir les changements
git status

# Ajouter les fichiers
git add .

# Commit
git commit -m "Description du changement"

# Push
git push
```

---

## 🆘 Dépannage rapide

### Backend ne démarre pas

```powershell
# Vérifier Python
python --version

# Réinstaller les dépendances
cd backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend ne démarre pas

```powershell
# Vérifier Node
node --version
npm --version

# Nettoyer et réinstaller
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
npm install
```

### Ollama ne répond pas

```powershell
# Redémarrer Ollama
taskkill /IM ollama.exe /F
ollama serve

# Vérifier le modèle
ollama list
ollama pull mistral:7b
```

### Erreur CORS

```powershell
# Vérifier backend/.env
notepad backend\.env
# S'assurer que CORS_ORIGINS contient http://localhost:3000
```

---

## 📚 Documentation

### Générer la doc API

L'API FastAPI génère automatiquement la documentation Swagger :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

### Ouvrir les docs

```powershell
# README principal
notepad README.md

# Guide de démarrage
notepad QUICKSTART.md

# Prochaines étapes
notepad NEXT_STEPS.md

# Architecture
notepad ARCHITECTURE.md

# Résumé du projet
notepad PROJECT_SUMMARY.md
```

---

## 🎯 Commandes fréquentes (mémo)

```powershell
# Démarrer tout
.\start.ps1

# Indexer documents
cd backend ; .\venv\Scripts\Activate.ps1 ; python scripts\index_documents.py

# Health check
curl http://localhost:8000/api/v1/health

# Réinstaller tout
.\install.ps1

# Ouvrir l'app
Start-Process "http://localhost:3000"
```

---

Gardez ce fichier à portée de main pour une référence rapide ! 📖✨
