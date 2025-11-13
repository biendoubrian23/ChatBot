# 📘 Guide Complet des Commandes - LibriAssist

Ce guide décrit **toutes les étapes** pour gérer, scraper, indexer et lancer le chatbot LibriAssist.

---

## 📋 Table des matières

1. [Ajouter des documents](#1-ajouter-des-documents)
2. [Scraper le site web](#2-scraper-le-site-web)
3. [Vectorisation et indexation](#3-vectorisation-et-indexation)
4. [Lancement du backend](#4-lancement-du-backend)
5. [Lancement du frontend](#5-lancement-du-frontend)
6. [Surveillance GPU/CPU](#6-surveillance-gpucpu)
7. [Commandes de maintenance](#7-commandes-de-maintenance)

---

## 1️⃣ Ajouter des documents

### 📄 **Types de fichiers acceptés**
- PDF (`.pdf`)
- Fichiers texte (`.txt`)

### 📁 **Où placer les documents ?**

```
X:\MesApplis\BiendouCorp\ChatBot\docs\
```

**Exemple :**
```powershell
# Copier un PDF
Copy-Item "C:\Mes Documents\nouveau_guide.pdf" "X:\MesApplis\BiendouCorp\ChatBot\docs\"

# Copier un fichier texte
Copy-Item "C:\Mes Documents\faq_2024.txt" "X:\MesApplis\BiendouCorp\ChatBot\docs\"
```

### ✅ **Vérifier les fichiers**

```powershell
# Lister tous les documents
Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\docs\" -Filter *.pdf
Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\docs\" -Filter *.txt

# Compter les fichiers
(Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\docs\" -Filter *.pdf).Count
(Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\docs\" -Filter *.txt).Count
```

---

## 2️⃣ Scraper le site web

### 🌐 **Script de scraping depuis le CSV**

Le fichier CSV `les_liens_coollibri.csv` contient toutes les URLs à scraper.

### 📍 **Emplacement du script**
```
X:\MesApplis\BiendouCorp\ChatBot\backend\scripts\scrape_from_csv.py
```

### ▶️ **Commande pour lancer le scraping**

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "X:\MesApplis\BiendouCorp\ChatBot\backend\venv\Scripts\python.exe" scripts\scrape_from_csv.py
```

**OU version courte si vous êtes déjà dans `backend/` :**
```powershell
& "venv\Scripts\python.exe" scripts\scrape_from_csv.py
```

### 📂 **Où vont les résultats du scraping ?**

**Dossier de sortie :**
```
X:\MesApplis\BiendouCorp\ChatBot\backend\docs\scraped\
```

**Fichiers créés :**
- `coollibri_accueil.txt`
- `coollibri_services.txt`
- `coollibri_tarifs.txt`
- `coollibri_blog.txt`
- ... (32 fichiers au total)

### 📦 **Déplacer les fichiers scrapés vers docs/**

**IMPORTANT :** Les fichiers doivent être dans `X:\MesApplis\BiendouCorp\ChatBot\docs\` pour être indexés.

```powershell
# Déplacer tous les fichiers TXT depuis scraped/ vers docs/
Move-Item "X:\MesApplis\BiendouCorp\ChatBot\backend\docs\scraped\*.txt" "X:\MesApplis\BiendouCorp\ChatBot\docs\" -Force
```

**Vérification :**
```powershell
# Compter les fichiers déplacés
(Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\docs\" -Filter *.txt).Count
```

---

## 3️⃣ Vectorisation et indexation

### 🔧 **Processus d'indexation**

L'indexation transforme vos documents en **chunks** (morceaux) puis en **vecteurs** pour la recherche sémantique.

### 📍 **Script d'indexation**
```
X:\MesApplis\BiendouCorp\ChatBot\backend\scripts\index_documents.py
```

### ▶️ **Commande pour indexer**

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "X:\MesApplis\BiendouCorp\ChatBot\backend\venv\Scripts\python.exe" scripts\index_documents.py
```

**OU version courte :**
```powershell
& "venv\Scripts\python.exe" scripts\index_documents.py
```

### 📊 **Que fait le script ?**

1. **Lecture** : Lit tous les PDF et TXT dans `docs/`
2. **Découpage** : Crée des chunks de 550 caractères avec 175 de chevauchement
3. **Vectorisation** : Transforme chaque chunk en vecteur (all-MiniLM-L6-v2)
4. **Stockage** : Sauvegarde dans ChromaDB

### 📂 **Où sont stockés les vecteurs ?**

```
X:\MesApplis\BiendouCorp\ChatBot\backend\data\vectorstore\
```

**Contenu du dossier :**
- `chroma.sqlite3` : Base de données des vecteurs
- `*.parquet` : Fichiers de données vectorielles

### 📈 **Résultat attendu**

```
✅ Indexing complete!
📊 Total documents in vector store: 1138
```

**Détails :**
- **1 PDF** (FAQ CoolLibri) → 91 chunks
- **35 TXT** (site web) → 1047 chunks
- **TOTAL** : 1138 chunks

### 🔍 **Visualiser les chunks créés**

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" scripts\view_chunks.py
```

**Résultat :** Crée un fichier `chunks_export.txt` avec tous les chunks lisibles.

---

## 4️⃣ Lancement du backend

### 🚀 **Démarrer le serveur FastAPI**

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "X:\MesApplis\BiendouCorp\ChatBot\backend\venv\Scripts\python.exe" main.py
```

**OU version courte :**
```powershell
& "venv\Scripts\python.exe" main.py
```

### ✅ **Backend prêt**

Vous devriez voir :
```
🚀 Starting LibriAssist API...
📦 Version: 1.0.0

🔧 Initializing services...
Loading embedding model: all-MiniLM-L6-v2
✓ Embedding model loaded successfully
✓ Vector store initialized with 1138 documents
✓ Ollama service is available

✅ LibriAssist API is ready!
📍 Listening on http://0.0.0.0:8000
📚 Vector store contains 1138 documents
```

### 🌐 **URLs disponibles**

- **API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **Health check** : http://localhost:8000/health

### 🛑 **Arrêter le backend**

Appuyez sur **CTRL+C** dans le terminal.

---

## 5️⃣ Lancement du frontend

### 🎨 **Démarrer Next.js**

**Ouvrez un NOUVEAU terminal** (le backend doit rester actif) :

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\frontend
npm run dev
```

### ✅ **Frontend prêt**

Vous devriez voir :
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.3s
```

### 🌐 **Ouvrir le chatbot**

Allez sur : **http://localhost:3000**

### 🛑 **Arrêter le frontend**

Appuyez sur **CTRL+C** dans le terminal.

---

## 6️⃣ Surveillance GPU/CPU

### 🎮 **Vérifier l'utilisation GPU d'Ollama**

```powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" ps
```

### 📊 **Exemple de sortie**

```
NAME         ID              SIZE      PROCESSOR          CONTEXT    UNTIL
phi3:mini    4f2222927938    4.6 GB    37%/63% CPU/GPU    4096       4 minutes from now
```

**Interprétation :**
- `37%/63% CPU/GPU` → ✅ **63% sur GPU** (excellent !)
- `4.6 GB` → Taille du modèle en mémoire
- `4096` → Contexte maximum (tokens)

### 💻 **Surveillance CPU système (Windows)**

```powershell
# Utilisation CPU globale
Get-Counter '\Processor(_Total)\% Processor Time'

# Utilisation mémoire
Get-Counter '\Memory\Available MBytes'
```

### 🎮 **Surveillance GPU détaillée**

**Si vous avez NVIDIA GPU :**
```powershell
nvidia-smi
```

**Résultat attendu :**
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.xxx      Driver Version: 535.xxx       CUDA Version: 12.x  |
|-------------------------------+----------------------+----------------------+
| GPU  Name            TCC/WDDM | Bus-Id        Disp.A | Volatile Uncorr. ECC |
|===============================+======================+======================|
|   0  NVIDIA GeForce RTX...   |   0%   63%    4.6GB  |       N/A            |
+-------------------------------+----------------------+----------------------+
```

### 📈 **Surveiller les performances en temps réel**

**Ollama en continu :**
```powershell
# Rafraîchir toutes les 2 secondes
while ($true) { cls; & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" ps; Start-Sleep 2 }
```

**Arrêter :** CTRL+C

---

## 7️⃣ Commandes de maintenance

### 🔄 **Réindexer après ajout de documents**

```powershell
# 1. Ajouter vos nouveaux fichiers dans docs/
Copy-Item "C:\nouveau_doc.pdf" "X:\MesApplis\BiendouCorp\ChatBot\docs\"

# 2. Réindexer
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" scripts\index_documents.py

# 3. Redémarrer le backend
& "venv\Scripts\python.exe" main.py
```

### 🌐 **Rescraper le site web**

```powershell
# 1. Scraper
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" scripts\scrape_from_csv.py

# 2. Déplacer les fichiers
Move-Item "backend\docs\scraped\*.txt" "docs\" -Force

# 3. Réindexer
& "venv\Scripts\python.exe" scripts\index_documents.py

# 4. Redémarrer le backend
& "venv\Scripts\python.exe" main.py
```

### 🗑️ **Nettoyer la base vectorielle**

```powershell
# Supprimer le vectorstore (ATTENTION : perte de données !)
Remove-Item "X:\MesApplis\BiendouCorp\ChatBot\backend\data\vectorstore\*" -Recurse -Force

# Réindexer tout
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" scripts\index_documents.py
```

### 📊 **Vérifier l'état du système**

```powershell
# Nombre de documents
(Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\docs\").Count

# Taille du vectorstore
(Get-ChildItem "X:\MesApplis\BiendouCorp\ChatBot\backend\data\vectorstore\" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

# Modèles Ollama installés
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

---

## 🚀 **Script tout-en-un**

### **Lancement rapide (backend + frontend)**

Vous avez déjà un script à la racine :

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot
.\start.ps1
```

Ce script lance automatiquement :
1. Backend (port 8000)
2. Frontend (port 3000)

---

## 📋 **Récapitulatif des chemins importants**

| Élément | Chemin |
|---------|--------|
| **Documents sources** | `X:\MesApplis\BiendouCorp\ChatBot\docs\` |
| **Fichiers scrapés** | `X:\MesApplis\BiendouCorp\ChatBot\backend\docs\scraped\` |
| **Vectorstore** | `X:\MesApplis\BiendouCorp\ChatBot\backend\data\vectorstore\` |
| **Script scraping** | `X:\MesApplis\BiendouCorp\ChatBot\backend\scripts\scrape_from_csv.py` |
| **Script indexation** | `X:\MesApplis\BiendouCorp\ChatBot\backend\scripts\index_documents.py` |
| **Backend main** | `X:\MesApplis\BiendouCorp\ChatBot\backend\main.py` |
| **Ollama** | `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` |

---

## 🎯 **Workflow complet : De A à Z**

### **Scénario : Ajouter de nouveaux documents et mettre à jour le bot**

```powershell
# 1. Scraper le site web
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" scripts\scrape_from_csv.py

# 2. Déplacer les fichiers scrapés
Move-Item "docs\scraped\*.txt" "..\docs\" -Force

# 3. Ajouter vos propres documents
Copy-Item "C:\MesDocs\nouveau_guide.pdf" "..\docs\"

# 4. Réindexer tout
& "venv\Scripts\python.exe" scripts\index_documents.py

# 5. Vérifier GPU Ollama
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" ps

# 6. Lancer le backend
& "venv\Scripts\python.exe" main.py

# 7. Dans un NOUVEAU terminal : Lancer le frontend
cd X:\MesApplis\BiendouCorp\ChatBot\frontend
npm run dev

# 8. Ouvrir le navigateur
Start-Process "http://localhost:3000"
```

---

## ⚡ **Commandes rapides (cheatsheet)**

```powershell
# === SCRAPING ===
& "venv\Scripts\python.exe" scripts\scrape_from_csv.py
Move-Item "backend\docs\scraped\*.txt" "docs\" -Force

# === INDEXATION ===
& "venv\Scripts\python.exe" scripts\index_documents.py

# === LANCEMENT ===
& "venv\Scripts\python.exe" main.py                    # Backend
npm run dev                                            # Frontend

# === MONITORING ===
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" ps   # GPU usage
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list # Modèles

# === MAINTENANCE ===
& "venv\Scripts\python.exe" scripts\view_chunks.py     # Voir chunks
```

---

## 🎉 **C'est tout !**

Vous avez maintenant **toutes les commandes** pour gérer LibriAssist de bout en bout ! 🚀

**Bon développement ! 💻**
