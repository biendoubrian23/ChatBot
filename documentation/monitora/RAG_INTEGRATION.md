# MONITORA - Intégration RAG CoolLibri

## Vue d'ensemble

Cette documentation décrit l'intégration des fonctionnalités RAG du chatbot CoolLibri dans la plateforme MONITORA.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                        │
│                     Port: 3001                                  │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard                    │  Widget                         │
│  - Gestion workspaces         │  - Chat public                  │
│  - Config RAG                 │  - Injection JS                 │
│  - Test chatbot               │  - Multi-tenant                 │
│  - Upload documents           │                                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Python (FastAPI)                     │
│                     Port: 8001                                  │
├─────────────────────────────────────────────────────────────────┤
│  API Endpoints:                                                 │
│  - /api/widget/chat           (public, API key auth)            │
│  - /api/widget/config/{id}    (public)                          │
│  - /api/test/chat             (dashboard test)                  │
│  - /api/workspaces/{id}/rag-config                              │
│  - /api/workspaces/{id}/documents                               │
│  - /api/workspaces/{id}/reindex                                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Services                                 │
├─────────────────────────────────────────────────────────────────┤
│  VectorStore (ChromaDB)    │  LLM Provider                      │
│  - Multi-tenant            │  - Mistral AI                      │
│  - Embeddings E5           │  - Groq (option)                   │
│  - 1024 dimensions         │  - OpenAI (option)                 │
├────────────────────────────┼────────────────────────────────────┤
│  RAG Pipeline              │  Document Processor                │
│  - Retrieval + Rerank      │  - PDF, DOCX, TXT, MD              │
│  - Context building        │  - Chunking configurable           │
│  - Cache sémantique        │  - Metadata extraction             │
└────────────────────────────┴────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                        │
│  - workspaces              │  - messages                        │
│  - workspace_rag_config    │  - documents                       │
│  - conversations           │  - usage_stats                     │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration RAG (par défaut CoolLibri)

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| llm_provider | mistral | Fournisseur LLM |
| llm_model | mistral-small-latest | Modèle utilisé |
| temperature | 0.1 | Créativité des réponses |
| max_tokens | 900 | Longueur max réponse |
| top_p | 1.0 | Nucleus sampling |
| chunk_size | 1500 | Taille des chunks (caractères) |
| chunk_overlap | 300 | Chevauchement entre chunks |
| top_k | 8 | Documents récupérés |
| rerank_top_n | 5 | Documents après reranking |
| enable_cache | true | Cache sémantique activé |
| cache_ttl | 7200 | Durée cache (secondes) |
| similarity_threshold | 0.92 | Seuil de similarité cache |

## Structure des fichiers

```
monitora/
├── backend/                      # Backend Python
│   ├── main.py                   # Point d'entrée FastAPI
│   ├── requirements.txt          # Dépendances Python
│   ├── .env                      # Configuration (secrets)
│   └── app/
│       ├── core/
│       │   ├── config.py         # Settings
│       │   └── supabase.py       # Client Supabase
│       ├── api/
│       │   └── routes.py         # Tous les endpoints
│       └── services/
│           ├── vectorstore.py    # ChromaDB + Embeddings
│           ├── llm_provider.py   # Mistral, Groq, etc.
│           └── rag_pipeline.py   # Pipeline RAG complet
│
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       └── workspaces/
│   │           └── [id]/
│   │               ├── page.tsx           # Page serveur
│   │               └── workspace-detail.tsx # Composant client
│   ├── components/
│   │   ├── rag-config-panel.tsx    # Panel config RAG
│   │   └── chat-test-panel.tsx     # Panel test chat
│   └── lib/
│       ├── config.ts               # Config frontend
│       └── types.ts                # Types TypeScript
│
├── public/
│   └── widget.js                   # Widget injectable
│
└── supabase/
    └── schema.sql                  # Schéma BDD complet
```

## Installation

### 1. Backend Python

```bash
cd monitora/backend

# Créer un environnement virtuel
python -m venv venv
venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Copier le fichier d'environnement
copy .env.example .env
# Éditer .env avec vos clés API

# Lancer le serveur
python main.py
```

### 2. Frontend Next.js

```bash
cd monitora

# Installer les dépendances
npm install

# Copier le fichier d'environnement
copy .env.example .env.local
# Éditer .env.local avec vos variables

# Lancer le serveur
npm run dev
```

### 3. Base de données

Exécuter le fichier `supabase/schema.sql` dans votre projet Supabase.

## Variables d'environnement

### Backend (.env)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
MISTRAL_API_KEY=xxx
GROQ_API_KEY=xxx
CORS_ORIGINS=http://localhost:3001
VECTORSTORE_BASE_PATH=./data/vectorstores
EMBEDDING_MODEL=intfloat/multilingual-e5-large
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

## Utilisation

### Dashboard

1. **Configuration RAG** : Onglet "Configuration" dans les détails d'un workspace
   - Ajuster température, chunks, top_k
   - Choisir le modèle LLM
   - Personnaliser le prompt système

2. **Test** : Onglet "Tester" pour prévisualiser les réponses
   - Voir les sources utilisées
   - Voir le temps de traitement
   - Voir la config utilisée

3. **Documents** : Onglet "Documents" pour gérer les documents
   - Upload PDF, DOCX, TXT, MD
   - Voir le nombre de chunks
   - Réindexer si nécessaire

### Widget

```html
<!-- Intégrer sur n'importe quel site -->
<script>
  window.MONITORA_API_URL = 'https://votre-backend.com';
</script>
<script 
  src="https://monitora.app/widget.js" 
  data-workspace-id="VOTRE_WORKSPACE_ID">
</script>
```

## API Reference

### POST /api/widget/chat

Chat public pour le widget.

```json
{
  "message": "Bonjour",
  "workspace_id": "uuid",
  "visitor_id": "optional",
  "conversation_id": "optional"
}
```

Headers: `X-API-Key: workspace_api_key`

### POST /api/test/chat

Chat de test pour le dashboard.

```json
{
  "message": "Question test",
  "workspace_id": "uuid",
  "history": []
}
```

### PUT /api/workspaces/{id}/rag-config

Mettre à jour la configuration RAG.

```json
{
  "temperature": 0.2,
  "top_k": 10,
  "llm_model": "mistral-medium-latest"
}
```

### POST /api/workspaces/{id}/documents/upload

Upload d'un document (multipart/form-data).

## Prochaines étapes

1. [ ] Ajouter l'authentification JWT pour les endpoints dashboard
2. [ ] Implémenter le streaming de réponses dans le widget
3. [ ] Ajouter des métriques et analytics
4. [ ] Implémenter la limite de rate par workspace
5. [ ] Ajouter le support pour plus de formats (HTML, CSV)
