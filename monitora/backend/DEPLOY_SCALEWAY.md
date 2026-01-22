# Déploiement Monitora sur Scaleway

## 🎯 Option recommandée : Serverless Containers

### Prérequis
- Compte Scaleway avec un projet créé
- [Scaleway CLI](https://www.scaleway.com/en/cli/) installé
- Docker installé localement

---

## 📋 Étapes de déploiement

### 1. Configurer Scaleway CLI
```bash
scw init
```

### 2. Créer un registre de containers
```bash
scw registry namespace create name=monitora-registry region=fr-par
```

### 3. Se connecter au registre
```bash
docker login rg.fr-par.scw.cloud/monitora-registry -u nologin --password-stdin <<< $(scw iam api-key list -o json | jq -r '.[0].secret_key')
```

### 4. Build et push de l'image
```bash
cd backend

# Build l'image
docker build -t rg.fr-par.scw.cloud/monitora-registry/monitora-backend:latest .

# Push vers Scaleway
docker push rg.fr-par.scw.cloud/monitora-registry/monitora-backend:latest
```

### 5. Créer le container serverless

Via l'interface Scaleway Console :
1. Aller dans **Serverless** > **Containers**
2. Cliquer **Create Container**
3. Sélectionner l'image `monitora-backend:latest`
4. Configurer :
   - **Port** : 8001
   - **Min instances** : 1 (pour éviter le cold start)
   - **Max instances** : 5
   - **Memory** : 2048 MB (pour sentence-transformers)
   - **CPU** : 1000m

### 6. Configurer les variables d'environnement

Dans Scaleway Console, ajouter ces secrets :

| Variable | Description |
|----------|-------------|
| `DATABASE_MODE` | `sqlserver` |
| `SQLSERVER_HOST` | Adresse du serveur SQL |
| `SQLSERVER_PORT` | `1433` |
| `SQLSERVER_DATABASE` | Nom de la base |
| `SQLSERVER_USER` | Utilisateur SQL |
| `SQLSERVER_PASSWORD` | Mot de passe SQL |
| `JWT_SECRET` | Clé secrète pour JWT (générer avec `openssl rand -hex 32`) |
| `MISTRAL_API_KEY` | Clé API Mistral |
| `GROQ_API_KEY` | Clé API Groq (optionnel) |

---

## 🔧 Configuration réseau

### Ouvrir l'accès SQL Server
Votre SQL Server doit être accessible depuis Scaleway :
- Si SQL Server est chez Messages SAS : ouvrir le firewall pour les IPs Scaleway
- Alternative : utiliser un VPN ou Scaleway Private Networks

---

## ✅ Vérification

Une fois déployé, tester :
```bash
curl https://votre-container.functions.fnc.fr-par.scw.cloud/health
```

Réponse attendue :
```json
{"status": "ok", "service": "monitora-backend"}
```

---

## 📊 Coûts estimés

| Ressource | Coût/mois |
|-----------|-----------|
| Container Serverless (2GB RAM, 1 instance min) | ~15-30€ |
| Registry | Gratuit (premiers 10GB) |
| Bandwidth | ~0.01€/GB |

---

## 🚀 Déploiement rapide (script)

```powershell
# deploy-scaleway.ps1
$REGISTRY = "rg.fr-par.scw.cloud/monitora-registry"
$IMAGE = "monitora-backend"
$TAG = "latest"

Write-Host "Building Docker image..."
docker build -t "${REGISTRY}/${IMAGE}:${TAG}" .

Write-Host "Pushing to Scaleway..."
docker push "${REGISTRY}/${IMAGE}:${TAG}"

Write-Host "Done! Mise à jour du container dans Scaleway Console."
```
