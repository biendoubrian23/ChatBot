# MONITORA - Plateforme de Gestion de Chatbots

## Description
Plateforme SaaS permettant de déployer, gérer et monitorer des chatbots IA sur plusieurs sites web depuis une interface centralisée unique.

---

## 🚀 Quick Start

### 1. Backend
```bash
cd monitora/backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
# Serveur sur http://localhost:8001
```

### 2. Frontend
```bash
cd monitora/frontend
npm install
npm run dev
# Interface sur http://localhost:3001
```

### 3. Base de données
- Créer un projet Supabase
- Exécuter le SQL dans `supabase/schema.sql`
- Configurer les variables d'environnement

---

## 📁 Structure du projet

```
monitora/
├── backend/                # API FastAPI (Python)
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── api/            # Endpoints REST
│       ├── core/           # Configuration
│       ├── models/         # Schémas Pydantic
│       └── services/       # Logique métier (RAG, LLM)
│
├── frontend/               # Interface Next.js
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # Composants React
│   │   └── lib/            # Utilitaires
│   └── public/
│       └── widget/         # Script injectable
│
├── supabase/               # Schéma SQL
│
├── CAHIER_DES_CHARGES.md   # Spécifications complètes
└── RAG_INTEGRATION.md      # Documentation technique RAG
```

---

## 🎯 Fonctionnalités principales

- **Multi-tenant** : Gérer plusieurs chatbots depuis une interface
- **Widget injectable** : Script à copier-coller sur n'importe quel site
- **RAG personnalisable** : Upload de documents, configuration fine
- **Analytics** : Statistiques et historique des conversations
- **Personnalisation** : Couleurs, messages, position du widget

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.9+ |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| LLM | Mistral AI |
| Embeddings | E5 Multilingual |
| Vectorstore | ChromaDB |

---

## 📋 Roadmap

### Phase 1 - MVP ✅
- [ ] Authentification (login/register)
- [ ] CRUD Workspaces
- [ ] Upload documents
- [ ] Widget injectable basique
- [ ] Chat fonctionnel

### Phase 2 - Analytics
- [ ] Dashboard statistiques
- [ ] Historique conversations
- [ ] Questions fréquentes

### Phase 3 - Personnalisation
- [ ] Éditeur visuel du widget
- [ ] Configuration RAG avancée
- [ ] Prompt système personnalisable

### Phase 4 - Scale
- [ ] Multi-LLM (Groq, OpenAI)
- [ ] Rate limiting
- [ ] Pricing/Plans

---

## 📝 Licence
Propriétaire - BiendouCorp
