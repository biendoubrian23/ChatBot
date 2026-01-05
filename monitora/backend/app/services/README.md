# Services - Logique Métier

## Description
Contient toute la logique métier : RAG, LLM, vectorstore, etc.
Ces services sont copiés/adaptés du chatbot CoolLibri existant.

---

## Fichiers à créer

### `vectorstore.py` - Gestion des embeddings
À copier depuis le backend CoolLibri et adapter pour multi-tenant.

- [ ] Utiliser ChromaDB ou autre vectorstore
- [ ] Stocker les vectorstores par workspace_id
- [ ] Path: `./data/vectorstores/{workspace_id}/`
- [ ] Méthodes:
  - `create_vectorstore(workspace_id)`
  - `add_documents(workspace_id, documents)`
  - `search(workspace_id, query, top_k)`
  - `delete_vectorstore(workspace_id)`

---

### `embeddings.py` - Service d'embeddings
- [ ] Utiliser le modèle E5 multilingual (comme CoolLibri)
- [ ] Singleton pour éviter de recharger le modèle
- [ ] Méthode `embed(texts: list[str]) -> list[list[float]]`

---

### `llm_provider.py` - Fournisseur LLM
- [ ] Support Mistral AI (prioritaire)
- [ ] Support Groq (optionnel)
- [ ] Support OpenAI (optionnel)
- [ ] Interface commune pour tous les providers
- [ ] Méthodes:
  - `generate(prompt, config) -> str`
  - `stream(prompt, config) -> AsyncGenerator`

---

### `rag_pipeline.py` - Pipeline RAG complet
À adapter depuis CoolLibri.

- [ ] Récupérer la config RAG du workspace
- [ ] Charger le vectorstore du workspace
- [ ] Recherche sémantique
- [ ] Reranking (optionnel)
- [ ] Construction du prompt
- [ ] Appel au LLM
- [ ] Retour de la réponse + sources

---

### `document_processor.py` - Traitement des documents
- [ ] Parser PDF (PyPDF2 ou pdfplumber)
- [ ] Parser DOCX (python-docx)
- [ ] Parser TXT/MD (lecture directe)
- [ ] Chunking avec overlap
- [ ] Extraction de métadonnées

---

### `analytics_service.py` - Calcul des statistiques
- [ ] Compter conversations par période
- [ ] Compter messages
- [ ] Calculer temps de réponse moyen
- [ ] Identifier questions fréquentes

---

## Étapes d'implémentation

1. [ ] Copier `embeddings.py` de CoolLibri et adapter
2. [ ] Copier `vectorstore.py` et adapter pour multi-tenant
3. [ ] Copier `llm_provider.py` et simplifier
4. [ ] Copier `rag_pipeline.py` et adapter
5. [ ] Créer `document_processor.py` (nouveau)
6. [ ] Créer `analytics_service.py` (nouveau)

---

## Configuration RAG par défaut (comme CoolLibri)

```python
DEFAULT_RAG_CONFIG = {
    "llm_provider": "mistral",
    "llm_model": "mistral-small-latest",
    "temperature": 0.1,
    "max_tokens": 900,
    "top_p": 1.0,
    "chunk_size": 1500,
    "chunk_overlap": 300,
    "top_k": 8,
    "rerank_top_n": 5,
    "enable_cache": True,
    "cache_ttl": 7200,
    "similarity_threshold": 0.92
}
```
