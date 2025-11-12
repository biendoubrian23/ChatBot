---
title: LibriAssist Backend
emoji: 📚
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# LibriAssist - RAG Chatbot Backend

API backend pour LibriAssist, un chatbot intelligent basé sur RAG (Retrieval-Augmented Generation) pour CoolLibri.

## 🚀 Fonctionnalités

- **RAG Pipeline complet** avec ChromaDB
- **Llama 2 7B** pour la génération de réponses
- **703 documents** indexés sur CoolLibri
- **API FastAPI** prête pour production
- **Optimisé GPU** avec quantization 4-bit

## 🔧 Configuration

### Variables d'environnement requises :

- `HF_TOKEN` : Token Hugging Face pour accès aux modèles
- `LLM_MODEL` : Nom du modèle (défaut: meta-llama/Llama-2-7b-chat-hf)

## 📡 API Endpoints

- `GET /` : Informations sur le service
- `GET /health` : Health check
- `POST /api/v1/chat` : Endpoint de chat principal

## 🔗 Frontend

Frontend déployé sur : https://libriassist.netlify.app

## 📄 License

MIT License
