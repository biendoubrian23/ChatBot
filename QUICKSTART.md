# 🚀 Guide de démarrage rapide - LibriAssist

Ce guide vous aidera à démarrer rapidement LibriAssist en 10 minutes.

## ✅ Prérequis (à installer d'abord)

1. **Python 3.9+** : https://www.python.org/downloads/
2. **Node.js 18+** : https://nodejs.org/
3. **Ollama** : https://ollama.ai/

## 📋 Installation rapide

### 1. Installer Ollama et le modèle (5 min)

```powershell
# Télécharger Ollama depuis https://ollama.ai/download
# Après installation, ouvrir un terminal PowerShell :

# Télécharger le modèle Mistral 7B
ollama pull mistral:7b

# Laisser Ollama tourner en arrière-plan
```

### 2. Configurer le backend (3 min)

```powershell
# Ouvrir PowerShell dans le dossier backend/
cd backend

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement
.\venv\Scripts\Activate.ps1

# Installer les dépendances
pip install -r requirements.txt

# Copier le fichier de configuration
copy .env.example .env
```

### 3. Indexer les documents (2 min)

```powershell
# Toujours dans backend/ avec l'environnement activé
python scripts\index_documents.py
```

Vous devriez voir :
```
📚 LibriAssist - Document Indexer
==================================================
Processing FAQ CoolLibri.pdf
  → Created XX chunks
✅ Indexing complete!
```

### 4. Démarrer le backend (30 sec)

```powershell
# Toujours dans backend/
python main.py
```

Vous devriez voir :
```
🚀 Starting LibriAssist API...
✓ Ollama service is available
✅ LibriAssist API is ready!
📍 Listening on http://0.0.0.0:8000
```

**✅ Gardez ce terminal ouvert !**

### 5. Configurer le frontend (2 min)

```powershell
# Ouvrir un NOUVEAU terminal PowerShell
cd frontend

# Installer les dépendances
npm install

# Copier le fichier de configuration
copy .env.local.example .env.local
```

### 6. Démarrer le frontend (30 sec)

```powershell
# Toujours dans frontend/
npm run dev
```

Vous devriez voir :
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  
✓ Ready in 2.5s
```

## 🎉 C'est prêt !

Ouvrez votre navigateur sur : **http://localhost:3000**

Vous devriez voir l'interface LibriAssist avec l'écran de bienvenue.

## 🧪 Tester

Posez une question comme :
- "Comment fonctionne CoolLibri ?"
- "Quels sont les tarifs ?"
- "Comment créer un compte ?"

Le chatbot devrait répondre en quelques secondes avec les sources.

## ❌ Problèmes courants

### "Ollama not available"

**Solution** : Ouvrir un terminal et exécuter :
```powershell
ollama serve
```

### "ECONNREFUSED localhost:8000"

**Solution** : Le backend n'est pas démarré. Retourner dans le terminal backend et lancer :
```powershell
python main.py
```

### "Cannot find module 'react'"

**Solution** : Réinstaller les dépendances frontend :
```powershell
cd frontend
rm -rf node_modules
npm install
```

### "ChromaDB error"

**Solution** : Réindexer les documents :
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python scripts\index_documents.py
```

## 📝 Commandes utiles

### Arrêter les services

- **Backend** : `Ctrl+C` dans le terminal backend
- **Frontend** : `Ctrl+C` dans le terminal frontend
- **Ollama** : `Ctrl+C` dans le terminal Ollama (si lancé avec `ollama serve`)

### Redémarrer

```powershell
# Backend
cd backend
.\venv\Scripts\Activate.ps1
python main.py

# Frontend (nouveau terminal)
cd frontend
npm run dev
```

### Ajouter de nouveaux PDF

1. Placer les PDF dans le dossier `docs/`
2. Réexécuter :
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python scripts\index_documents.py
```

## 🎯 Prochaines étapes

- Lire le [README complet](README.md) pour plus de détails
- Personnaliser le prompt système
- Ajuster les paramètres de chunking
- Déployer en production

## 💬 Besoin d'aide ?

Consultez la section [Support et Dépannage](README.md#-support-et-dépannage) du README principal.

---

**Bon développement ! 🚀**
