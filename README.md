# 📚 LibriAssist - Chatbot RAG pour CoolLibri

<div align="center">

![LibriAssist Logo](https://img.shields.io/badge/LibriAssist-v1.0.0-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.9+-green?style=for-the-badge&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-teal?style=for-the-badge&logo=fastapi)

**Votre assistant intelligent pour CoolLibri - 100% gratuit et auto-hébergé**

[Installation](#-installation) • [Utilisation](#-utilisation) • [Architecture](#-architecture) • [Déploiement](#-déploiement)

</div>

---

## 🎯 Description

**LibriAssist** est un chatbot RAG (Retrieval-Augmented Generation) intelligent conçu spécialement pour CoolLibri. Il combine la puissance des modèles de langage locaux avec une recherche sémantique avancée pour répondre précisément aux questions des utilisateurs.

### ✨ Caractéristiques principales

- 🚀 **100% Gratuit** - Aucun coût d'API ou de modèle
- 🏠 **Auto-hébergé** - Contrôle total de vos données
- ⚡ **Rapide & Précis** - Réponses en quelques secondes
- 🎨 **Interface moderne** - Design inspiré d'iOS et Revolut
- 🔒 **Sécurisé** - Données locales, pas de cloud
- 🌙 **Dark mode** - Support automatique du thème sombre

---

## 📁 Structure du projet

```
CHATBOT/
├── backend/                    # API Python + RAG Pipeline
│   ├── app/
│   │   ├── api/               # Endpoints FastAPI
│   │   ├── core/              # Configuration
│   │   ├── models/            # Modèles Pydantic
│   │   └── services/          # Services (PDF, vectorisation, LLM, RAG)
│   ├── data/
│   │   └── vectorstore/       # Base de données vectorielle (ChromaDB)
│   ├── scripts/               # Scripts utilitaires
│   ├── main.py                # Point d'entrée de l'API
│   └── requirements.txt       # Dépendances Python
│
├── frontend/                   # Interface Next.js
│   ├── app/                   # Pages Next.js (App Router)
│   ├── components/            # Composants React
│   ├── lib/                   # Utilitaires (API client)
│   ├── types/                 # Types TypeScript
│   └── package.json           # Dépendances Node.js
│
├── docs/                       # Documents PDF (base de connaissance)
│   └── FAQ CoolLibri.pdf      # FAQ à indexer
│
├── scripts/                    # Scripts d'installation et setup
└── README.md                   # Ce fichier
```

---

## 🔧 Technologies utilisées

### Backend
- **FastAPI** - API REST moderne et performante
- **Python 3.9+** - Langage de programmation
- **ChromaDB** - Base de données vectorielle
- **SentenceTransformers** - Génération d'embeddings (all-MiniLM-L6-v2)
- **Ollama** - Serveur LLM local (Mistral 7B / Llama 3)
- **LangChain** - Orchestration RAG
- **PyPDF2 / pdfplumber** - Extraction de texte des PDF

### Frontend
- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling moderne
- **Framer Motion** - Animations fluides
- **Axios** - Client HTTP

---

## 🚀 Installation

### Prérequis

- **Python 3.9+** - [Télécharger Python](https://www.python.org/downloads/)
- **Node.js 18+** - [Télécharger Node.js](https://nodejs.org/)
- **Ollama** - [Télécharger Ollama](https://ollama.ai/)
- **Git** - [Télécharger Git](https://git-scm.com/)

### 📖 Guide de démarrage rapide

Pour démarrer rapidement (10 minutes), consultez le [**QUICKSTART.md**](QUICKSTART.md)

### Installation complète

Voir le guide complet dans [QUICKSTART.md](QUICKSTART.md) pour les instructions détaillées étape par étape.

---

## 💻 Utilisation

### Démarrer le système

1. **Backend** : `cd backend && python main.py`
2. **Frontend** : `cd frontend && npm run dev`
3. **Ouvrir** : http://localhost:3000

Voir [QUICKSTART.md](QUICKSTART.md) pour plus de détails.

---

## 🏗️ Architecture RAG

Le système suit ce pipeline :

**Question utilisateur** → **Embeddings** → **ChromaDB (recherche)** → **Reranking** → **LLM (Mistral)** → **Réponse + Sources**

Détails complets dans la documentation.

---

## 📞 Contact

- **Développeur** : Brian Biendou
- **GitHub** : [@biendoubrian23](https://github.com/biendoubrian23)
- **Projet** : CoolLibri

---

<div align="center">

**Fait avec ❤️ pour CoolLibri**

</div>