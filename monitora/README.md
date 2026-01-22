<p align="center">
  <h1 align="center">🔍 Monitora</h1>
  <p align="center">
    <strong>Plateforme interne de gestion et monitoring de chatbots IA</strong>
  </p>
  <p align="center">
    Solution développée par Messages SAS pour déployer et gérer des assistants virtuels intelligents
  </p>
</p>

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Multi-sites** | Gérez plusieurs chatbots pour différents sites depuis un seul dashboard |
| **Widget injectable** | Script simple à intégrer sur n'importe quel site web interne |
| **RAG personnalisable** | Upload de documents pour enrichir les réponses de l'IA |
| **Analytics** | Statistiques détaillées et historique des conversations |
| **Personnalisation** | Couleurs, messages d'accueil, position du widget |

---

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.9+ |
| **Base de données** | Microsoft SQL Server |
| **Authentification** | JWT (JSON Web Tokens) |
| **LLM** | Mistral AI |
| **Embeddings** | E5 Multilingual |
| **Vectorstore** | ChromaDB |

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Python 3.9+
- SQL Server

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
# API disponible sur http://localhost:8001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# Interface sur http://localhost:3001
```

### 3. Base de données
1. Créer une base de données SQL Server
2. Exécuter le script `database/migration_complete_sqlserver.sql`
3. Configurer les variables d'environnement

---

## 📁 Architecture

```
monitora/
├── backend/                # API FastAPI
│   ├── app/
│   │   ├── api/            # Endpoints REST
│   │   ├── core/           # Configuration & Auth JWT
│   │   ├── models/         # Schémas Pydantic
│   │   └── services/       # Logique métier (RAG, LLM)
│   └── requirements.txt
│
├── frontend/               # Interface Next.js
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # Composants React
│   │   └── lib/            # Utilitaires & Auth
│   └── public/widget/      # Script injectable
│
└── database/               # Scripts SQL Server
```

---

## 📄 Licence

Usage interne - © 2026 Messages SAS
