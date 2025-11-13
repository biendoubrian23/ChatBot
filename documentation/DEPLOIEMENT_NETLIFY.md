# 🚀 Déploiement Frontend (Netlify) + Backend (Local)

## 📋 Vue d'ensemble

- **Frontend** : Hébergé sur Netlify (gratuit, HTTPS automatique)
- **Backend** : Tourne sur votre PC local avec ngrok pour exposition publique
- **Communication** : Frontend Netlify → ngrok tunnel → Backend local

---

## 🔧 Étape 1 : Installer ngrok

### Option A - Téléchargement manuel (recommandé)

1. **Télécharger ngrok** : https://ngrok.com/download
2. **Extraire** le fichier ZIP dans un dossier (ex: `C:\ngrok\`)
3. **Créer un compte gratuit** sur https://ngrok.com/signup
4. **Obtenir votre authtoken** : https://dashboard.ngrok.com/get-started/your-authtoken

### Option B - Via PowerShell (admin requis)

```powershell
# Télécharger ngrok
Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile "$env:TEMP\ngrok.zip"

# Extraire
Expand-Archive -Path "$env:TEMP\ngrok.zip" -DestinationPath "C:\ngrok\" -Force

# Ajouter au PATH (session actuelle)
$env:Path += ";C:\ngrok"
```

### Configuration ngrok

```powershell
# Configurer votre authtoken (récupéré sur https://dashboard.ngrok.com)
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

---

## 🌐 Étape 2 : Exposer le backend local

### Démarrer le backend

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" main.py
```

**Le backend démarre sur** : `http://localhost:8000`

### Créer le tunnel ngrok (nouveau terminal)

```powershell
# Exposer le port 8000 via ngrok
ngrok http 8000
```

**Résultat attendu :**
```
ngrok                                                                           (Ctrl+C to quit)

Session Status                online
Account                       votre.email@gmail.com (Plan: Free)
Version                       3.x.x
Region                        Europe (eu)
Latency                       12ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:8000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**🔑 IMPORTANT** : Notez l'URL HTTPS : `https://abc123def456.ngrok-free.app`

---

## 🔐 Étape 3 : Configurer CORS pour ngrok

Modifiez `backend/app/core/config.py` pour autoriser l'URL ngrok :

```python
# CORS
cors_origins: List[str] = [
    "http://localhost:3000",           # Local dev
    "http://localhost:5173",           # Alternative local
    "https://*.netlify.app",           # Netlify
    "https://*.ngrok-free.app",        # ngrok
    "https://abc123def456.ngrok-free.app"  # Votre URL ngrok spécifique
]
```

**Redémarrer le backend après modification !**

---

## 📦 Étape 4 : Préparer le frontend pour Netlify

### Créer un fichier `.env.production`

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\frontend
```

Créez le fichier `.env.production` :

```env
NEXT_PUBLIC_API_URL=https://abc123def456.ngrok-free.app/api/v1
```

**Remplacez** `abc123def456.ngrok-free.app` par votre vraie URL ngrok !

### Créer `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🚀 Étape 5 : Déployer sur Netlify

### Option A - Via l'interface Netlify (recommandé)

1. **Se connecter** : https://app.netlify.com/
2. **New site** → **Import an existing project**
3. **Choisir GitHub** → Autoriser l'accès
4. **Sélectionner** : `biendoubrian23/ChatBot`
5. **Configuration** :
   - **Base directory** : `frontend`
   - **Build command** : `npm run build`
   - **Publish directory** : `frontend/.next`
6. **Environment variables** :
   - Key : `NEXT_PUBLIC_API_URL`
   - Value : `https://abc123def456.ngrok-free.app/api/v1`
7. **Deploy site** !

### Option B - Via Netlify CLI

```powershell
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Initialiser le site
cd X:\MesApplis\BiendouCorp\ChatBot\frontend
netlify init

# Déployer
netlify deploy --prod
```

---

## ✅ Étape 6 : Tester le déploiement

1. **URL Netlify** : `https://votre-site.netlify.app`
2. **Ouvrir le site** et tester une question
3. **Vérifier les logs** :
   - **Backend** : Terminal où tourne `main.py`
   - **ngrok** : Interface web `http://127.0.0.1:4040`

---

## 🔄 Workflow quotidien

### Chaque fois que vous voulez utiliser le chatbot :

```powershell
# Terminal 1 : Backend
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" main.py

# Terminal 2 : ngrok
ngrok http 8000
```

**⚠️ ATTENTION** : L'URL ngrok change à chaque redémarrage (plan gratuit) !

### Solution pour URL stable (ngrok payant) :

**Plan gratuit** : URL change à chaque fois → Modifier `.env.production` et redéployer

**Plan payant (8$/mois)** : Domaine fixe `https://votre-nom.ngrok.io`

---

## 💡 Alternative : Garder l'URL ngrok fixe

### Créer un domaine ngrok réservé (gratuit limité)

```powershell
ngrok http 8000 --domain=votre-nom-unique.ngrok-free.app
```

**Ensuite** : Utilisez cette URL dans `.env.production` de manière permanente.

---

## 🛡️ Sécurité ngrok

### Ajouter une authentification basique (optionnel)

```powershell
ngrok http 8000 --basic-auth="username:password"
```

Puis dans le frontend, ajoutez l'header :

```typescript
headers: {
  'Authorization': 'Basic ' + btoa('username:password')
}
```

---

## 📊 Monitoring

### Ngrok Dashboard
- **URL** : http://127.0.0.1:4040
- **Voir** : Requêtes en temps réel, latence, erreurs

### Netlify Analytics
- **URL** : https://app.netlify.com/sites/votre-site/analytics
- **Voir** : Visites, performances, build logs

---

## 🔧 Dépannage

### "ERR_ABORTED 404 (Not Found)"

**Cause** : URL ngrok incorrecte dans `.env.production`

**Solution** :
1. Vérifier l'URL ngrok active : `ngrok http 8000`
2. Mettre à jour `.env.production`
3. Rebuild : `npm run build`
4. Redéployer sur Netlify

### "CORS policy error"

**Cause** : Backend n'autorise pas l'origine Netlify

**Solution** :
1. Ajouter l'URL Netlify dans `cors_origins` (config.py)
2. Redémarrer le backend

### ngrok : "Session Expired"

**Cause** : Plan gratuit = sessions de 2h maximum

**Solution** : Redémarrer ngrok toutes les 2h OU passer au plan payant

---

## 📝 Résumé des URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Backend local** | `http://localhost:8000` | Accessible uniquement sur votre PC |
| **Tunnel ngrok** | `https://abc123.ngrok-free.app` | Change à chaque redémarrage (gratuit) |
| **Frontend Netlify** | `https://votre-site.netlify.app` | URL fixe, HTTPS automatique |
| **ngrok Dashboard** | `http://127.0.0.1:4040` | Monitoring en temps réel |

---

## 🚀 Commandes rapides

```powershell
# === BACKEND + NGROK ===
# Terminal 1
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" main.py

# Terminal 2
ngrok http 8000

# === DÉPLOIEMENT NETLIFY ===
cd X:\MesApplis\BiendouCorp\ChatBot\frontend
netlify deploy --prod

# === BUILD LOCAL ===
npm run build
```

---

## 💰 Coûts

- **Netlify** : Gratuit (100 GB bande passante/mois)
- **ngrok gratuit** : URL change, sessions 2h, 1 tunnel
- **ngrok payant** : 8$/mois (URL fixe, sessions illimitées, 3 tunnels)

---

**Bon déploiement ! 🎉**
