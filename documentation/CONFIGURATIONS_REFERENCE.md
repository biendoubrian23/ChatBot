# 🎛️ RÉFÉRENCE RAPIDE - 3 CONFIGURATIONS À TESTER

## Configuration 1️⃣ : PRÉCISION MAXIMALE

**Objectif** : Fidélité absolue aux sources, zéro hallucination

### Fichier `backend/app/core/config.py` (lignes 20-27)
```python
class Settings(BaseSettings):
    # LLM Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"  # ← CHANGER LE MODÈLE
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 300
    top_k_results: int = 8      # ← 8 documents
    rerank_top_n: int = 4        # ← 4 meilleurs
```

### Fichier `backend/app/services/llm.py` (ligne ~78)
```python
options={
    "temperature": 0.0,          # ← Zéro créativité
    "top_p": 0.3,               # ← Très conservateur
    "top_k": 20,                # ← Vocabulaire restreint
    "num_predict": 800,         # ← Réponses moyennes
    "repeat_penalty": 1.2,
}
```

**Cas d'usage** : Questions avec chiffres précis, données critiques

---

## Configuration 2️⃣ : ÉQUILIBRÉE (RECOMMANDÉE)

**Objectif** : Bon compromis précision/fluidité

### Fichier `backend/app/core/config.py` (lignes 20-27)
```python
class Settings(BaseSettings):
    # LLM Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"  # ← CHANGER LE MODÈLE
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 300
    top_k_results: int = 10      # ← 10 documents
    rerank_top_n: int = 5        # ← 5 meilleurs
```

### Fichier `backend/app/services/llm.py` (ligne ~78)
```python
options={
    "temperature": 0.15,         # ← Très légère variation
    "top_p": 0.5,               # ← Équilibré
    "top_k": 40,                # ← Vocabulaire riche
    "num_predict": 900,         # ← Réponses détaillées
    "repeat_penalty": 1.2,
}
```

**Cas d'usage** : Usage quotidien chatbot, questions variées

---

## Configuration 3️⃣ : RÉPONSES COMPLÈTES

**Objectif** : Réponses détaillées et exhaustives

### Fichier `backend/app/core/config.py` (lignes 20-27)
```python
class Settings(BaseSettings):
    # LLM Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"  # ← CHANGER LE MODÈLE
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 300
    top_k_results: int = 12      # ← 12 documents
    rerank_top_n: int = 6        # ← 6 meilleurs
```

### Fichier `backend/app/services/llm.py` (ligne ~78)
```python
options={
    "temperature": 0.2,          # ← Légère créativité
    "top_p": 0.6,               # ← Plus de diversité
    "top_k": 50,                # ← Vocabulaire très riche
    "num_predict": 1200,        # ← Réponses longues
    "repeat_penalty": 1.2,
}
```

**Cas d'usage** : Questions complexes, explications détaillées

---

## 📋 TABLEAU RÉCAPITULATIF

| Paramètre | Config 1 (Précision) | Config 2 (Équilibrée) | Config 3 (Complète) |
|-----------|----------------------|-----------------------|---------------------|
| **temperature** | 0.0 | 0.15 | 0.2 |
| **top_p** | 0.3 | 0.5 | 0.6 |
| **top_k** | 20 | 40 | 50 |
| **num_predict** | 800 | 900 | 1200 |
| **top_k_results** | 8 | 10 | 12 |
| **rerank_top_n** | 4 | 5 | 6 |

---

## 🔄 PROCÉDURE RAPIDE

1. **Copier-coller** la configuration dans les 2 fichiers
2. **Sauvegarder** les fichiers
3. **Redémarrer** le backend :
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --reload --host 0.0.0.0 --port 8080
   ```
4. **Tester** les 30 questions
5. **Passer** à la configuration suivante

---

## 🎯 ORDRE DE TEST RECOMMANDÉ

### Pour chaque modèle (llama3.1:8b, llama3.2:3b, mistral:7b, phi3:medium) :

1. **Config 2 (Équilibrée)** - Tester en premier (baseline)
2. **Config 1 (Précision)** - Comparer avec baseline
3. **Config 3 (Complète)** - Comparer avec baseline

Cela permet de voir rapidement si les extrêmes améliorent ou dégradent les résultats.

---

**⚠️ IMPORTANT** : Toujours redémarrer le backend après chaque modification !
