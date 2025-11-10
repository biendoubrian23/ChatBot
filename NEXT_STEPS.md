# 🚀 Prochaines étapes - LibriAssist

Ce document vous guide pour démarrer et tester LibriAssist.

---

## 📋 Checklist avant de commencer

### ✅ Prérequis à installer

- [ ] **Python 3.9+** installé → [Télécharger](https://www.python.org/downloads/)
- [ ] **Node.js 18+** installé → [Télécharger](https://nodejs.org/)
- [ ] **Ollama** installé → [Télécharger](https://ollama.ai/)
- [ ] **Git** installé (optionnel) → [Télécharger](https://git-scm.com/)

### ✅ Vérification rapide

Ouvrez PowerShell et testez :

```powershell
python --version    # Doit afficher Python 3.9+
node --version      # Doit afficher v18+
npm --version       # Doit afficher npm
ollama --version    # Doit afficher ollama version
```

---

## 🎯 Étape 1 : Installation (10 minutes)

### Option A : Installation automatique (recommandé)

```powershell
# Dans le dossier CHATBOT
.\install.ps1
```

Ce script va :
1. ✅ Vérifier Python et Node.js
2. ✅ Créer l'environnement virtuel Python
3. ✅ Installer toutes les dépendances backend
4. ✅ Installer toutes les dépendances frontend
5. ✅ Vérifier Ollama et proposer de télécharger Mistral

### Option B : Installation manuelle

Si le script ne fonctionne pas :

```powershell
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Télécharger le modèle Mistral

```powershell
ollama pull mistral:7b
```

⏱️ **Temps estimé** : 5-10 minutes (selon connexion internet)

---

## 📚 Étape 2 : Indexer les documents (2 minutes)

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python scripts\index_documents.py
```

**Ce que fait cette commande** :
1. 📄 Lit le fichier `FAQ CoolLibri.pdf`
2. ✂️ Découpe le texte en chunks intelligents
3. 🧠 Génère les embeddings avec SentenceTransformers
4. 💾 Stocke tout dans ChromaDB

**Résultat attendu** :
```
📚 LibriAssist - Document Indexer
Processing FAQ CoolLibri.pdf
  → Created XX chunks
✅ Indexing complete!
📊 Total documents in vector store: XX
```

Si vous voyez ça, c'est parfait ! ✅

---

## 🚀 Étape 3 : Démarrer le système

### Option A : Démarrage automatique (recommandé)

```powershell
# Dans le dossier CHATBOT
.\start.ps1
```

Ce script va :
1. ✅ Vérifier qu'Ollama tourne
2. ✅ Ouvrir une fenêtre pour le backend
3. ✅ Ouvrir une fenêtre pour le frontend
4. ✅ Ouvrir votre navigateur sur http://localhost:3000

### Option B : Démarrage manuel

**Terminal 1 - Backend** :
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

Attendez de voir :
```
🚀 Starting LibriAssist API...
✅ LibriAssist API is ready!
📍 Listening on http://0.0.0.0:8000
```

**Terminal 2 - Frontend** :
```powershell
cd frontend
npm run dev
```

Attendez de voir :
```
▲ Next.js 14.1.0
- Local: http://localhost:3000
✓ Ready in X.Xs
```

---

## 🧪 Étape 4 : Tester le chatbot

1. **Ouvrir le navigateur** : http://localhost:3000

2. **Vous devriez voir** :
   - Logo LibriAssist (LA) en gradient bleu-violet
   - Message de bienvenue
   - 4 suggestions de questions
   - Zone de saisie en bas

3. **Tester une question** :
   - Cliquez sur une suggestion OU
   - Tapez : "Comment fonctionne CoolLibri ?"
   - Appuyez sur Entrée ou cliquez sur le bouton d'envoi

4. **Résultat attendu** :
   - ⏳ Indicateur de chargement (3 points qui bougent)
   - 💬 Réponse du chatbot après quelques secondes
   - 📚 Sources affichées sous la réponse avec scores de pertinence
   - ⏰ Timestamp de la réponse

---

## ✅ Tests recommandés

### Test 1 : Questions basiques
```
❓ "Qu'est-ce que CoolLibri ?"
❓ "Comment créer un compte ?"
❓ "Quels sont les tarifs ?"
```

### Test 2 : Questions spécifiques
```
❓ "Comment résilier mon abonnement ?"
❓ "Quelles sont les modalités de paiement ?"
❓ "Comment contacter le support ?"
```

### Test 3 : Nouvelle conversation
- Cliquez sur "Nouvelle conversation" en haut à droite
- L'historique doit se réinitialiser
- L'écran de bienvenue doit réapparaître

### Test 4 : Mode sombre
- Changez le thème de votre système (Windows : Paramètres → Personnalisation)
- L'interface doit s'adapter automatiquement

---

## 🔍 Vérifier que tout fonctionne

### Backend (API)

**Health check** : http://localhost:8000/api/v1/health

Résultat attendu :
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "ollama_available": true,
  "vectorstore_loaded": true
}
```

**Documentation API** : http://localhost:8000/docs
- Vous devez voir l'interface Swagger
- 3 endpoints visibles : /chat, /health, /stats

**Stats** : http://localhost:8000/api/v1/stats

Résultat attendu :
```json
{
  "total_documents": XX,
  "collection_name": "coolibri_docs"
}
```

### Frontend

**Console développeur** (F12) :
- Aucune erreur en rouge
- Peut avoir des warnings (normal)

**Network tab** :
- Requêtes vers `http://localhost:8000/api/v1/chat` avec status 200

---

## ❌ Dépannage rapide

### "Ollama not available"

```powershell
# Ouvrir un nouveau terminal
ollama serve
```

### "ECONNREFUSED localhost:8000"

Le backend n'est pas démarré. Lancez :
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

### Réponse très lente (>30 secondes)

- Normal la première fois (chargement du modèle)
- Ensuite devrait être ~3-10 secondes

### Erreur "Module not found"

**Backend** :
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt --force-reinstall
```

**Frontend** :
```powershell
cd frontend
rm -rf node_modules
npm install
```

### Documents non trouvés

```powershell
# Vérifier que le PDF est bien là
dir docs\*.pdf

# Réindexer
cd backend
.\venv\Scripts\Activate.ps1
python scripts\index_documents.py
```

---

## 📊 Performances attendues

| Métrique | Valeur attendue |
|----------|----------------|
| Temps de réponse | 3-10 secondes |
| Précision | Élevée si info dans FAQ |
| Sources affichées | 1-3 documents |
| Score de pertinence | >0.7 pour bonnes réponses |
| Utilisation CPU | Modérée (LLM sur CPU) |
| Utilisation RAM | ~2-4 GB |

---

## 🎯 Prochaines actions

Une fois que tout fonctionne :

1. **Ajouter vos propres PDF** :
   - Placer les PDF dans `docs/`
   - Réexécuter `python scripts\index_documents.py`

2. **Personnaliser le prompt** :
   - Éditer `backend/app/services/llm.py`
   - Modifier la variable `system_prompt`

3. **Ajuster les paramètres RAG** :
   - Éditer `backend/.env`
   - Modifier `CHUNK_SIZE`, `TOP_K_RESULTS`, etc.

4. **Customiser le design** :
   - Éditer les composants dans `frontend/components/`
   - Modifier `tailwind.config.js` pour les couleurs

5. **Déployer en production** :
   - Consulter la section déploiement du README.md
   - Configurer Nginx + Gunicorn + PM2

---

## 📚 Documentation

- **README.md** : Documentation complète
- **QUICKSTART.md** : Guide de démarrage rapide
- **PROJECT_SUMMARY.md** : Résumé technique du projet
- **Backend** : http://localhost:8000/docs (Swagger)

---

## 💬 Besoin d'aide ?

1. Consultez le [README.md](README.md)
2. Vérifiez les logs dans les terminaux
3. Testez le health check : http://localhost:8000/api/v1/health
4. Consultez la console navigateur (F12)

---

## ✅ Checklist finale

Avant de dire "ça marche !" :

- [ ] Installation complète (backend + frontend)
- [ ] Ollama installé et Mistral téléchargé
- [ ] Documents indexés avec succès
- [ ] Backend démarre sans erreur
- [ ] Frontend démarre sans erreur
- [ ] Interface accessible sur localhost:3000
- [ ] Question test fonctionne
- [ ] Réponse générée avec sources
- [ ] Health check retourne "healthy"

Si tous les points sont ✅, **félicitations** ! 🎉

**LibriAssist est opérationnel !** 🚀

---

Bon développement ! 💻✨
