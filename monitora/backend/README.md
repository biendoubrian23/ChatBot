# MONITORA - Backend API (FastAPI)

## Description
Backend Python FastAPI pour la plateforme MONITORA. Gère l'authentification, les workspaces, le RAG et le chat.

## Port par défaut
- **Développement** : 8001

---

## Structure des dossiers

```
backend/
├── main.py              # Point d'entrée FastAPI
├── requirements.txt     # Dépendances Python
├── .env                 # Variables d'environnement
└── app/
    ├── api/             # Endpoints API
    ├── core/            # Configuration & Supabase
    ├── models/          # Modèles Pydantic
    └── services/        # Logique métier (RAG, LLM, etc.)
```

---

## Étapes d'implémentation

### Phase 1 - Setup de base
- [ ] Créer `main.py` avec app FastAPI
- [ ] Configurer CORS pour le frontend (localhost:3001)
- [ ] Créer `requirements.txt` avec dépendances
- [ ] Créer `.env` avec les variables Supabase et Mistral
- [ ] Tester que le serveur démarre

### Phase 2 - Configuration Supabase
- [ ] Créer client Supabase dans `app/core/supabase.py`
- [ ] Tester connexion à la base de données
- [ ] Créer les tables via SQL dans Supabase

### Phase 3 - API Workspaces
- [ ] CRUD workspaces (create, read, update, delete)
- [ ] Génération d'API key unique par workspace
- [ ] Validation du domaine autorisé

### Phase 4 - API Documents
- [ ] Upload de fichiers (PDF, TXT, MD)
- [ ] Stockage des métadonnées dans Supabase
- [ ] Endpoint pour lister les documents
- [ ] Endpoint pour supprimer un document

### Phase 5 - Services RAG
- [ ] Copier/adapter le service vectorstore de CoolLibri
- [ ] Copier/adapter le pipeline RAG
- [ ] Adapter pour multi-tenant (1 vectorstore par workspace)
- [ ] Endpoint d'indexation des documents

### Phase 6 - API Chat
- [ ] Endpoint `/api/widget/chat` pour le widget public
- [ ] Endpoint `/api/test/chat` pour le dashboard
- [ ] Authentification par API key pour le widget
- [ ] Sauvegarde des conversations dans Supabase

### Phase 7 - Analytics
- [ ] Endpoint pour récupérer les stats d'un workspace
- [ ] Agrégation des conversations par jour
- [ ] Questions les plus posées

---

## Variables d'environnement requises

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SUPABASE_ANON_KEY=xxx
MISTRAL_API_KEY=xxx
MISTRAL_MODEL=mistral-small-latest
CORS_ORIGINS=http://localhost:3001
```

---

## Commande de démarrage

```bash
cd monitora/backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```
