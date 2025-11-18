# 🚀 QUE LANCE EXACTEMENT LE BACKEND ?

## 1️⃣ COMMANDE QUE TU EXÉCUTES

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

---

## 2️⃣ ÉTAPE PAR ÉTAPE : QU'EST-CE QUI SE PASSE ?

### ✅ Étape 1 : Activation de l'environnement virtuel

```powershell
.\.venv\Scripts\Activate.ps1
```

**Action :**
- Charge l'environnement Python isolé (.venv)
- Active les dépendances (FastAPI, Ollama, ChromaDB, etc.)
- Change le prompt en `(.venv) PS X:\...`

---

### ✅ Étape 2 : Lancement d'Uvicorn

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

**Décodage :**
- `uvicorn` = Serveur ASGI (Web server pour Python async)
- `main:app` = Fichier `main.py`, objet `app` (FastAPI app)
- `--reload` = Mode développement (recharge auto si changements)
- `--host 0.0.0.0` = Écoute SUR TOUTES LES INTERFACES (localhost + IP locale + Internet)
- `--port 8080` = Port d'écoute

---

## 3️⃣ CE QUI SE LANCE RÉELLEMENT

### 📊 Processus de démarrage

```
Uvicorn démarre
    ↓
Charge le fichier main.py
    ↓
Crée l'objet FastAPI (app)
    ↓
Déclenche @app.on_event("startup")
    ├─ Charge EmbeddingService
    │   └─ Charge modèle SentenceTransformers (~500MB)
    │      └─ "paraphrase-multilingual-mpnet-base-v2"
    │
    ├─ Charge VectorStoreService
    │   └─ Charge ChromaDB
    │      └─ Charge vectorstore depuis ./data/vectorstore/
    │         └─ chroma.sqlite3 (8252 documents vectorisés)
    │
    ├─ Charge OllamaService
    │   └─ Se connecte à Ollama (http://localhost:11434)
    │      └─ Vérifie disponibilité du modèle llama3.1:8b
    │
    └─ Crée RAGPipeline
        └─ Combine tout ensemble
    
    ↓
Uvicorn écoute sur 0.0.0.0:8080
    ↓
"✅ LibriAssist API is ready!"
```

---

## 4️⃣ À QUOI RESSEMBLE LE OUTPUT AU DÉMARRAGE ?

```
INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)
INFO:     Started reloader process [20576] using WatchFiles

🚀 Starting LibriAssist API...
📦 Version: 1.0.0

🔧 Initializing services...

Loading embedding model: paraphrase-multilingual-mpnet-base-v2
✓ Embedding model loaded successfully

✓ Vector store initialized with 8252 documents

✓ Ollama service is available

✅ LibriAssist API is ready!
📍 Listening on http://0.0.0.0:8080
📚 Vector store contains 8252 documents

💡 Tip: Use /docs for API documentation
```

---

## 5️⃣ CE QUI EST MAINTENANT ACCESSIBLE

### 📡 En local (sur ta machine)

```
http://localhost:8080                    # Page d'accueil
http://localhost:8080/api/v1/chat        # Endpoint chat
http://localhost:8080/docs                # Documentation Swagger
http://127.0.0.1:8080                    # Localhost (alias)
```

### 🌐 Sur ton réseau local

```
http://192.168.1.100:8080/               # Si ta machine a cette IP
http://[IP_DE_TA_MACHINE]:8080/          # Depuis un autre PC
```

### ❌ Depuis Internet

```
❌ http://ta-ip-publique:8080/           # Ne fonctionne PAS (routeur bloque)
❌ https://ta-ip-publique:8080/          # Ne fonctionne PAS (pas HTTPS)
```

---

## 6️⃣ C'EST LÀ QUE NGROK INTERVIENT

### 🔗 NGROK = Tunnel Internet

```powershell
ngrok http 8080
```

**Qu'est-ce que ça fait :**

```
┌─────────────────────────────────────────────────────────┐
│  Ta machine (X:\MesApplis\BiendouCorp\ChatBot)         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Backend FastAPI                                │  │
│  │  Uvicorn: 0.0.0.0:8080                         │  │
│  │  ✅ Écoute sur port 8080                       │  │
│  └─────────────────────────────────────────────────┘  │
│           ↑                                            │
│           │ localhost:8080                            │
│           │                                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │  NGROK Agent (process)                          │  │
│  │  - Crée connexion sortante vers ngrok.io       │  │
│  │  - Obtient URL temporaire                       │  │
│  │  - Crée tunnel bidirectionnel                   │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           │
           │ Tunnel chiffré HTTPS
           │
           ↓
    ┌──────────────────────┐
    │   ngrok.io servers   │
    │   (Serveurs publics) │
    │                      │
    │ https://XXXX.ngrok... │  ← URL générée dynamiquement
    │ (change chaque fois) │
    └──────────────────────┘
           │
           │
           ↓
    ┌──────────────────────┐
    │   Internet Public    │
    │                      │
    │  Accessible PARTOUT  │
    │  CoolLibri, Widget,  │
    │  n'importe où !      │
    └──────────────────────┘
```

---

## 7️⃣ OUTPUT DE NGROK AU DÉMARRAGE

```
ngrok                                                  (Ctrl+C to quit)

Session Status                online                                                                                      
Account                       Free                                                                                        
Version                        3.3.0                                                                                       
Region                         Europe (eu)                                                                                 
Latency                        25ms                                                                                        
Web Interface                  http://127.0.0.1:4040                                                                       
Forwarding                     https://8f4a-2001-0db8-85a3-0000-0000-8a2e-0370-1234.eu.ngrok.io -> http://localhost:8080  
                                                                                                                            
Connections                    ttl     opn     rt1     rt5     p50     p90                                                
                                0       0       0.00    0.00    0.00    0.00  
```

**C'est quoi :**
- `Forwarding`: URL publique → localhost:8080
- `Web Interface`: http://127.0.0.1:4040 (dashboard NGROK local)
- **L'URL change à chaque redémarrage !**

---

## 8️⃣ COMMENT ÇA FONCTIONNE EN DÉTAIL

### 🔄 Flux de requête via NGROK

```
1️⃣ CLIENT (Widget sur CoolLibri)
   Demande: https://8f4a-...ngrok.io/api/v1/chat
   Body: {"question": "Où en est ma commande ?"}
       │
       ↓
2️⃣ NGROK Serveur Public (ngrok.io)
   Reçoit la requête
   Enregistre dans logs
       │
       ↓
3️⃣ NGROK Client Local (sur ta machine)
   Reçoit la requête via tunnel chiffré
   Envoie à http://localhost:8080/api/v1/chat
       │
       ↓
4️⃣ BACKEND FastAPI (Uvicorn)
   Reçoit sur port 8080
   Traite: RAG Pipeline → Ollama → Réponse
       │
       ↓
5️⃣ Réponse remonte
   FastAPI → NGROK Client → NGROK Serveur → Client
       │
       ↓
6️⃣ CLIENT reçoit la réponse
   Widget affiche la réponse au client CoolLibri
```

---

## 9️⃣ LE LLM (Ollama) N'EST PAS SUR NGROK

### ❌ IMPORTANT : Ollama n'est PAS sur Internet

```
┌─────────────────────────────────────────┐
│  Ta machine                             │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Backend FastAPI (port 8080)     │  │  ← Sur NGROK
│  │  Uvicorn                         │  │
│  └────────────┬─────────────────────┘  │
│               │ Requête: localhost:... │
│               ↓                        │
│  ┌──────────────────────────────────┐  │
│  │  Ollama (port 11434)             │  │  ← PAS sur NGROK
│  │  Modèle: llama3.1:8b             │  │     (local uniquement)
│  │  GPU: CUDA/Metal                 │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
         ↑
         │ NGROK tunnel
         ↓
    Internet public
    (Clients CoolLibri)
```

---

## 🔟 ARCHITECTURE COMPLÈTE

```
┌──────────────────────────────────────────────────────────────────┐
│                    SITE COOLLIBRI (Internet)                     │
│                    Widget ChatBot                                 │
│                    (Client Vue/JavaScript)                        │
└─────────────────┬──────────────────────────────────────────────┘
                  │ HTTPS Request
                  │ https://8f4a-...ngrok.io/api/v1/chat
                  │
                  ▼
        ┌─────────────────────────┐
        │   NGROK Public URL      │
        │ (https://XXXX.ngrok...) │
        │ Region: eu              │
        │ Session: active         │
        └──────────────┬──────────┘
                       │ Tunnel chiffré
                       │
       ┌───────────────┴───────────────┐
       │   Ta Machine (local)          │
       │                               │
       │  ┌─────────────────────────┐  │
       │  │  NGROK Agent            │  │
       │  │  Port: 8080 ←→ Internet │  │
       │  └──────────┬──────────────┘  │
       │             │ localhost:8080   │
       │             ↓                  │
       │  ┌─────────────────────────┐  │
       │  │  FastAPI + Uvicorn      │  │
       │  │  Port: 8080             │  │
       │  │  - Route /api/v1/chat   │  │
       │  │  - CORS configured      │  │
       │  └──────────┬──────────────┘  │
       │             │ RAG Pipeline     │
       │             ↓                  │
       │  ┌─────────────────────────┐  │
       │  │  Services               │  │
       │  │  - EmbeddingService     │  │
       │  │  - VectorStore (ChromaDB)   │
       │  │  - OllamaService        │  │
       │  │  - RAGPipeline          │  │
       │  └──────────┬──────────────┘  │
       │             │ localhost:11434 │
       │             ↓                  │
       │  ┌─────────────────────────┐  │
       │  │  Ollama                 │  │
       │  │  Port: 11434 (local)    │  │
       │  │  Model: llama3.1:8b     │  │
       │  │  GPU Processing         │  │
       │  └─────────────────────────┘  │
       │                               │
       └───────────────────────────────┘
```

---

## 1️⃣1️⃣ POUR RÉSUMER

### Commande `uvicorn main:app --reload --host 0.0.0.0 --port 8080`

**Lance :**
1. ✅ **FastAPI app** sur port 8080
2. ✅ **Services** : EmbeddingService, VectorStore, Ollama, RAGPipeline
3. ✅ **Endpoints** : /api/v1/chat, /docs, etc.
4. ✅ **CORS** : Configure les origines acceptées
5. ✅ **Accessible** : localhost:8080 + réseau local

### Commande `ngrok http 8080`

**Crée :**
1. ✅ **Tunnel public** depuis Internet → localhost:8080
2. ✅ **URL temporaire** : https://XXXX-XXXX.ngrok.io
3. ✅ **Chiffrement HTTPS** automatique
4. ✅ **Accès** : Depuis CoolLibri (Internet) vers ton backend (local)

### ⚠️ Ollama (LLM)

- **N'est PAS sur NGROK** (resterait local)
- ✅ Communique en local: localhost:11434
- ✅ Processus GPU intensif (pas besoin d'être sur Internet)
- ✅ Le backend (NGROK) appelle Ollama en interne

---

## 🎯 FLUX COMPLET D'UNE QUESTION

```
1. Client CoolLibri tape: "Où est ma commande ?"
                          │
                          ↓ HTTPS (NGROK)
2. Backend reçoit sur http://localhost:8080/api/v1/chat
                          │
                          ↓ Traitement
3. RAGPipeline analyse question
   - Vectorize question (EmbeddingService)
   - Search ChromaDB (VectorStore)
   - Format context
                          │
                          ↓ Requête locale
4. Appel Ollama sur http://localhost:11434
   - Envoie: context + question + system_prompt
   - Génère réponse avec llama3.1:8b
                          │
                          ↓ Réponse
5. Backend retourne réponse
                          │
                          ↓ HTTPS (NGROK)
6. Client reçoit réponse et l'affiche
```

---

**Des questions sur une partie spécifique ?** 🚀
