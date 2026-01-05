# API - Endpoints REST

## Description
Contient tous les endpoints de l'API REST FastAPI.

---

## Fichiers à créer

### `routes.py` - Router principal
Regroupe tous les routers ou contient tous les endpoints.

### Structure des endpoints

---

## Endpoints à implémenter

### Authentification (optionnel côté backend)
> Note: L'auth est gérée par Supabase côté frontend. Le backend vérifie juste le JWT.

- [ ] `POST /api/auth/verify` - Vérifier un token JWT Supabase

---

### Workspaces
- [ ] `GET /api/workspaces` - Liste des workspaces de l'utilisateur
- [ ] `POST /api/workspaces` - Créer un workspace
- [ ] `GET /api/workspaces/{id}` - Détails d'un workspace
- [ ] `PUT /api/workspaces/{id}` - Modifier un workspace
- [ ] `DELETE /api/workspaces/{id}` - Supprimer un workspace
- [ ] `POST /api/workspaces/{id}/regenerate-key` - Regénérer l'API key

---

### Documents
- [ ] `GET /api/workspaces/{id}/documents` - Liste des documents
- [ ] `POST /api/workspaces/{id}/documents/upload` - Upload un document
- [ ] `DELETE /api/workspaces/{id}/documents/{doc_id}` - Supprimer un document
- [ ] `POST /api/workspaces/{id}/reindex` - Réindexer tous les documents

---

### Chat Widget (public)
- [ ] `POST /api/widget/chat` - Envoyer un message (auth par API key)
- [ ] `GET /api/widget/config/{workspace_id}` - Config du widget (couleurs, etc.)

---

### Chat Test (dashboard)
- [ ] `POST /api/test/chat` - Tester le chatbot depuis le dashboard

---

### Analytics
- [ ] `GET /api/workspaces/{id}/analytics` - Stats du workspace
- [ ] `GET /api/workspaces/{id}/conversations` - Liste des conversations
- [ ] `GET /api/workspaces/{id}/conversations/{conv_id}` - Détails conversation

---

### Configuration RAG
- [ ] `GET /api/workspaces/{id}/rag-config` - Config RAG actuelle
- [ ] `PUT /api/workspaces/{id}/rag-config` - Modifier config RAG

---

## Middleware à appliquer
- CORS
- Validation JWT pour endpoints protégés
- Rate limiting (future)
