# Flux Détaillé : De la Question à la Réponse

## 📊 Vue d'ensemble du processus

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT POSE UNE QUESTION                                                │
│ "Quel est le délai de livraison pour une impression de livre ?"         │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼ ÉTAPE 1️⃣ : VECTORISATION DE LA QUESTION
┌─────────────────────────────────────────────────────────────────────────┐
│ Modèle: SentenceTransformers (paraphrase-multilingual-mpnet-base-v2)   │
│ ✅ Commande: embedding_service.embed_text(query)                       │
│                                                                         │
│ INPUT:  "Quel est le délai de livraison ..."                          │
│ OUTPUT: [-0.234, 0.567, -0.891, 0.123, ..., 0.456]  (768 nombres)    │
│                                                                         │
│ Ça représente le SENS sémantique de la question                        │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼ ÉTAPE 2️⃣ : SIMILARITY SEARCH (Recherche de similarité)
┌─────────────────────────────────────────────────────────────────────────┐
│ Tool: ChromaDB                                                          │
│ ✅ Commande: vectorstore.collection.query(                             │
│              query_embeddings=[query_vector],                           │
│              n_results=6)                                               │
│                                                                         │
│ PROCESSUS:                                                              │
│ 1. Prend le vecteur de la question                                     │
│ 2. Le compare avec TOUS les vecteurs des documents en BDD              │
│ 3. Calcule la distance cosinus entre le vecteur query et les autres    │
│ 4. Retourne les 6 documents les PLUS SIMILAIRES                        │
│                                                                         │
│ RÉSULTAT: Top 6 documents avec scores de similarité                    │
│  - Document 1: "Délai standard 7-10 jours"           Score: 0.89      │
│  - Document 2: "Délai express 2-3 jours"             Score: 0.87      │
│  - Document 3: "Tarif délai rapide +10€"             Score: 0.82      │
│  - Document 4: "Zones de livraison"                  Score: 0.79      │
│  - Document 5: "Frais de port"                       Score: 0.71      │
│  - Document 6: "Retard de livraison"                 Score: 0.68      │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼ ÉTAPE 3️⃣ : RERANKING (Tri des résultats)
┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Commande: rerank_documents(query, documents)                        │
│                                                                         │
│ PROCESSUS:                                                              │
│ 1. Trie les 6 documents par score (meilleur d'abord)                  │
│ 2. Prend les top 3 (rerank_top_n = 3)                                 │
│                                                                         │
│ RÉSULTAT FINAL (Top 3):                                               │
│  - "Délai standard 7-10 jours"           Score: 0.89                  │
│  - "Délai express 2-3 jours"             Score: 0.87                  │
│  - "Tarif délai rapide +10€"             Score: 0.82                  │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼ ÉTAPE 4️⃣ : FORMATAGE DU CONTEXTE
┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Commande: format_context(reranked_documents)                        │
│                                                                         │
│ TRANSFORMATION:                                                         │
│ De documents structurés → À texte lisible                              │
│                                                                         │
│ OUTPUT:                                                                 │
│ """                                                                     │
│ [Document 1 - Source: coollibri_delais.txt]                           │
│ Délai standard 7-10 jours ouvrables. Nous prenons soin...             │
│                                                                         │
│ [Document 2 - Source: coollibri_delais-rapides.txt]                   │
│ Délai express 2-3 jours. Frais supplémentaires +10€...                │
│                                                                         │
│ [Document 3 - Source: coollibri_tarifs.txt]                           │
│ Les tarifs accélérés s'ajoutent à votre commande...                   │
│ """                                                                     │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼ ÉTAPE 5️⃣ : ENVOI AU MODÈLE LLM (Ollama/Llama3.1)
┌─────────────────────────────────────────────────────────────────────────┐
│ ✅ Commande: llama.generate_response(                                  │
│              query=question,                                            │
│              context=context_formaté,                                   │
│              system_prompt=prompt_système,                              │
│              history=historique_conversation)                           │
│                                                                         │
│ CE QUE LE MODÈLE REÇOIT EN ENTRÉE:                                   │
│                                                                         │
│ 🔹 SYSTEM PROMPT (Instructions au modèle):                            │
│    "Tu es le service client de CoolLibri...                           │
│     Réponds directement avec confiance...                              │
│     3-4 phrases maximum..."                                            │
│                                                                         │
│ 🔹 CONTEXTE RÉCUPÉRÉ (Les 3 meilleurs documents):                     │
│    "[Document 1 - Source: ...]                                        │
│     Délai standard 7-10 jours...                                      │
│     ...                                                                │
│     [Document 2 - Source: ...]                                        │
│     Délai express 2-3 jours..."                                       │
│                                                                         │
│ 🔹 HISTORIQUE (Derniers messages de la conversation):                 │
│    "Client: Bonjour                                                   │
│     Assistant: Bienvenue sur CoolLibri...                             │
│     Client: Quel est le délai..."                                     │
│                                                                         │
│ 🔹 LA QUESTION:                                                        │
│    "Quel est le délai de livraison pour une impression ?"             │
│                                                                         │
│ 📝 PROMPT FINAL CONSTRUIT:                                             │
│    """                                                                  │
│    INFORMATIONS DISPONIBLES:                                           │
│    [Document 1 - Source: coollibri_delais.txt]                        │
│    Délai standard 7-10 jours...                                       │
│                                                                         │
│    [Document 2 - Source: coollibri_delais-rapides.txt]                │
│    Délai express 2-3 jours...                                         │
│                                                                         │
│    [Document 3 - Source: coollibri_tarifs.txt]                        │
│    Les tarifs accélérés...                                            │
│                                                                         │
│    HISTORIQUE DE LA CONVERSATION:                                      │
│    Client: Bonjour                                                     │
│    Assistant: Bienvenue...                                             │
│    Client: Quel est le délai ?                                        │
│                                                                         │
│    QUESTION DU CLIENT: Quel est le délai de livraison ?               │
│                                                                         │
│    INSTRUCTIONS:                                                       │
│    - Tu ES le service client...                                       │
│    - Réponds directement avec confiance...                            │
│    - 3-4 phrases maximum...                                           │
│                                                                         │
│    RÉPONSE DU SERVICE CLIENT:                                         │
│    """                                                                  │
│                                                                         │
│ ⚙️ PARAMÈTRES DE GÉNÉRATION:                                          │
│    - temperature: 0.1 (réponses précises)                             │
│    - top_p: 0.3 (moins de créativité)                                 │
│    - top_k: 30 (options limités)                                      │
│    - num_predict: 400 (max 400 tokens)                                │
│    - repeat_penalty: 1.3 (pas de répétitions)                         │
│                                                                         │
│ ⚠️ IMPORTANT: LE MODÈLE NE VOIT JAMAIS LES VECTEURS !                 │
│    Il reçoit du TEXTE (contexte + question formatés)                  │
│                                                                         │
│ 🧠 LE MODÈLE UTILISE:                                                 │
│    - Le SYSTEM PROMPT pour comprendre son rôle                        │
│    - Le CONTEXTE pour connaître la réponse                            │
│    - L'HISTORIQUE pour la cohérence                                   │
│    - LA QUESTION pour savoir ce qu'on lui demande                     │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼ ÉTAPE 6️⃣ : GÉNÉRATION DE LA RÉPONSE
┌─────────────────────────────────────────────────────────────────────────┐
│ Modèle: Llama3.1:8b (running on Ollama)                                │
│                                                                         │
│ OUTPUT FINAL (Ce que le client voit):                                  │
│                                                                         │
│ "Pour une impression de livre standard, le délai de livraison est     │
│  de 7 à 10 jours ouvrables. Si vous avez besoin plus rapidement,     │
│  nous proposons une livraison express en 2-3 jours avec des frais    │
│  supplémentaires de 10€. Quel format souhaitez-vous ?"               │
│                                                                         │
│ ✅ SOURCES CONSULTÉES:                                                 │
│    - coollibri_delais.txt                                             │
│    - coollibri_delais-rapides.txt                                     │
│    - coollibri_tarifs.txt                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Détail des Commandes Clés

### 1️⃣ VECTORISATION DE LA QUESTION

**Fichier:** `backend/app/services/embeddings.py`

```python
# ✅ COMMANDE EXACTE:
query_vector = embedding_service.embed_text(question)

# IMPLÉMENTATION:
class EmbeddingService:
    def embed_text(self, text: str) -> List[float]:
        """Vectorise un texte"""
        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist()

# EXEMPLE CONCRET:
question = "Quel est le délai de livraison ?"
# ↓ SentenceTransformers passe par plusieurs étapes internes
# 1. Tokenisation (découpe en mots)
# 2. Transformation en embeddings de mots
# 3. Aggrégation en un seul vecteur de 768 dimensions
# ↓
query_vector = [-0.234, 0.567, -0.891, ..., 0.456]  # 768 nombres!

# PROPRIÉTÉS DU VECTEUR:
len(query_vector) == 768  # Dimension fixe
all(isinstance(x, float) for x in query_vector)  # Des nombres décimaux
# Ce vecteur représente le SENS sémantique de la question
```

---

### 2️⃣ SIMILARITY SEARCH (Recherche de similarité)

**Fichier:** `backend/app/services/vectorstore.py`

```python
# ✅ COMMANDE EXACTE:
results = self.collection.query(
    query_embeddings=[query_embedding],
    n_results=6  # Récupère les 6 meilleurs résultats
)

# IMPLÉMENTATION COMPLÈTE:
def similarity_search(self, query: str, k: int = 5) -> List[Tuple[Document, float]]:
    # 1. Vectorise la question
    query_embedding = self.embedding_service.embed_text(query)
    
    # 2. Lance la recherche de similarité
    results = self.collection.query(
        query_embeddings=[query_embedding],
        n_results=k  # k = nombre de résultats demandés
    )
    
    # 3. Convertit les résultats en objets Document
    documents_with_scores = []
    if results['documents'] and results['documents'][0]:
        for i, (doc_text, metadata, distance) in enumerate(zip(
            results['documents'][0],
            results['metadatas'][0],
            results['distances'][0]
        )):
            # Convert distance to similarity score (cosine similarity)
            # distance = 0 → similaire (score = 1)
            # distance = 1 → différent (score = 0)
            score = 1 - distance
            doc = Document(
                page_content=doc_text,
                metadata=metadata
            )
            documents_with_scores.append((doc, score))
    
    return documents_with_scores

# CE QUI SE PASSE DANS ChromaDB:
# ────────────────────────────────
# 1. La BDD contient 8252 documents vectorisés
#    Doc1: [-0.100, 0.200, -0.300, ..., 0.400]
#    Doc2: [0.150, -0.250, 0.350, ..., -0.450]
#    Doc3: [-0.200, 0.300, -0.400, ..., 0.500]
#    ... (8249 autres docs)
#
# 2. Prend le vecteur de la question:
#    Query: [-0.234, 0.567, -0.891, ..., 0.456]
#
# 3. Compare avec TOUS les documents en utilisant la distance cosinus:
#    ┌─────────────────────────────────────────────────┐
#    │ Distance Cosinus (Cosine Distance)              │
#    │ = 1 - (dot_product / (norm1 * norm2))          │
#    │                                                 │
#    │ Exemple:                                        │
#    │ Query ↔ Doc1: distance = 0.11 → score = 0.89  │
#    │ Query ↔ Doc2: distance = 0.13 → score = 0.87  │
#    │ Query ↔ Doc3: distance = 0.18 → score = 0.82  │
#    │ ... (8249 autres comparaisons)                │
#    └─────────────────────────────────────────────────┘
#
# 4. Trie les résultats par score (meilleur d'abord)
#    et retourne les TOP 6

# RÉSULTAT FINAL:
results = [
    (Document("Délai standard 7-10 jours..."), 0.89),
    (Document("Délai express 2-3 jours..."), 0.87),
    (Document("Tarif délai rapide +10€..."), 0.82),
    (Document("Zones de livraison..."), 0.79),
    (Document("Frais de port..."), 0.71),
    (Document("Retard de livraison..."), 0.68)
]
```

---

### 3️⃣ RERANKING (Tri final)

**Fichier:** `backend/app/services/rag_pipeline.py`

```python
# ✅ COMMANDE EXACTE:
reranked_docs = self.rerank_documents(query, retrieved_docs)

# IMPLÉMENTATION:
def rerank_documents(self, query: str, documents: List[Tuple[Document, float]]) -> List[Tuple[Document, float]]:
    # Trie par score (descendant)
    sorted_docs = sorted(documents, key=lambda x: x[1], reverse=True)
    
    # Prend les top N (rerank_top_n = 3 par défaut)
    return sorted_docs[:self.rerank_top_n]

# INPUT (6 documents du similarity_search):
[
    (Doc1, 0.89),  ← Meilleur
    (Doc2, 0.87),
    (Doc3, 0.82),
    (Doc4, 0.79),
    (Doc5, 0.71),
    (Doc6, 0.68)   ← Moins bon
]

# OUTPUT (top 3):
[
    (Doc1, 0.89),  ← Gardé
    (Doc2, 0.87),  ← Gardé
    (Doc3, 0.82)   ← Gardé
    # Doc4, Doc5, Doc6 → SUPPRIMÉS
]
```

---

### 4️⃣ FORMATAGE DU CONTEXTE

**Fichier:** `backend/app/services/rag_pipeline.py`

```python
# ✅ COMMANDE EXACTE:
formatted_context = self.format_context(reranked_docs)

# IMPLÉMENTATION:
def format_context(self, documents: List[Tuple[Document, float]]) -> str:
    context_parts = []
    for i, (doc, score) in enumerate(documents, 1):
        source = doc.metadata.get('source', 'Unknown')
        context_parts.append(
            f"[Document {i} - Source: {source}]\n{doc.page_content}\n"
        )
    return "\n".join(context_parts)

# INPUT (les 3 meilleurs documents):
[
    (Document(
        page_content="Délai standard 7-10 jours...",
        metadata={'source': 'coollibri_delais.txt'}
    ), 0.89),
    (Document(
        page_content="Délai express 2-3 jours...",
        metadata={'source': 'coollibri_delais-rapides.txt'}
    ), 0.87),
    (Document(
        page_content="Les tarifs accélérés...",
        metadata={'source': 'coollibri_tarifs.txt'}
    ), 0.82)
]

# OUTPUT (texte formaté):
"""[Document 1 - Source: coollibri_delais.txt]
Délai standard 7-10 jours...

[Document 2 - Source: coollibri_delais-rapides.txt]
Délai express 2-3 jours...

[Document 3 - Source: coollibri_tarifs.txt]
Les tarifs accélérés..."""
```

---

### 5️⃣ ENVOI AU MODÈLE LLM

**Fichier:** `backend/app/services/llm.py`

```python
# ✅ COMMANDE EXACTE:
response = llama_service.generate_response(
    query=question,
    context=formatted_context,
    system_prompt=custom_prompt,
    history=conversation_history
)

# IMPLÉMENTATION:
def generate_response(self, query: str, context: str, system_prompt=None, history=None) -> str:
    # 1. System prompt par défaut
    if system_prompt is None:
        system_prompt = """Tu es le service client de CoolLibri...
        Tu connais parfaitement tous nos services..."""
    
    # 2. Formater l'historique
    history_text = ""
    if history and len(history) > 0:
        history_text = "\n\nHISTORIQUE DE LA CONVERSATION:\n"
        for msg in history[-6:]:  # Limité à 6 derniers messages
            role_label = "Client" if msg["role"] == "user" else "Assistant"
            history_text += f"{role_label}: {msg['content']}\n"
    
    # 3. Construire le prompt final
    prompt = f"""INFORMATIONS DISPONIBLES:
{context}{history_text}

QUESTION DU CLIENT: {query}

INSTRUCTIONS:
- Tu ES le service client, tu connais ces informations par cœur
- Réponds directement avec confiance (JAMAIS "selon le document")
- 3-4 phrases maximum

RÉPONSE DU SERVICE CLIENT:"""
    
    # 4. Envoyer au modèle avec paramètres
    response = self.client.generate(
        model=self.model,  # "llama3.1:8b"
        prompt=prompt,
        system=system_prompt,
        options={
            "temperature": 0.1,      # Précision vs créativité
            "top_p": 0.3,           # Diversité du vocabulaire
            "top_k": 30,            # Nombre d'options considérées
            "num_predict": 400,     # Max tokens à générer
            "repeat_penalty": 1.3,  # Évite les répétitions
        }
    )
    
    return response['response']

# CE QUE LE MODÈLE REÇOIT (le PROMPT):
# ────────────────────────────────────
"""
INFORMATIONS DISPONIBLES:
[Document 1 - Source: coollibri_delais.txt]
Délai standard 7-10 jours ouvrables...

[Document 2 - Source: coollibri_delais-rapides.txt]
Délai express 2-3 jours...

[Document 3 - Source: coollibri_tarifs.txt]
Les tarifs accélérés s'ajoutent...

HISTORIQUE DE LA CONVERSATION:
Client: Bonjour
Assistant: Bienvenue sur CoolLibri!
Client: Quel est le délai de livraison ?

QUESTION DU CLIENT: Quel est le délai de livraison pour une impression de livre ?

INSTRUCTIONS:
- Tu ES le service client, tu connais ces informations par cœur
- Réponds directement avec confiance (JAMAIS "selon le document")
- 3-4 phrases maximum

RÉPONSE DU SERVICE CLIENT:
"""

# ⚠️ IMPORTANT:
# Le modèle voit UNIQUEMENT du TEXTE (pas de vecteurs)
# Il va:
# 1. Lire les instructions du system prompt
# 2. Lire les informations disponibles (contexte)
# 3. Lire l'historique pour la cohérence
# 4. Lire la question du client
# 5. Générer une réponse cohérente
```

---

## 🎯 Résumé : Qui reçoit quoi ?

| Composant | Reçoit | Retourne |
|-----------|--------|----------|
| **EmbeddingService** | Question en texte | Vecteur (768 nombres) |
| **ChromaDB** | Vecteur query | Top 6 documents + scores |
| **RAG Pipeline (rerank)** | 6 documents | Top 3 documents |
| **RAG Pipeline (format)** | 3 documents | Texte formaté |
| **Ollama/Llama3.1** | Texte (prompt + contexte) | Texte réponse |

---

## 📝 Flux avec Valeurs Réelles

```
ÉTAPE 1 : Vectorisation
├─ Input:   "Quel est le délai de livraison ?"
├─ Model:   SentenceTransformers
└─ Output:  [-0.234, 0.567, -0.891, ..., 0.456]  (768 floats)

ÉTAPE 2 : Similarity Search
├─ Input:   [-0.234, 0.567, -0.891, ..., 0.456]
├─ Compare: Distance cosinus avec 8252 documents
├─ Trie:    Par score décroissant
└─ Output:  
│    1. (Doc: "7-10 jours", score: 0.89)
│    2. (Doc: "2-3 jours", score: 0.87)
│    3. (Doc: "tarif +10€", score: 0.82)
│    4. (Doc: "zones", score: 0.79)
│    5. (Doc: "frais port", score: 0.71)
│    6. (Doc: "retard", score: 0.68)

ÉTAPE 3 : Reranking
├─ Input:   Top 6 documents
├─ Trie:    Déjà triés
├─ Prend:   Top 3 (rerank_top_n=3)
└─ Output:  
│    1. (Doc: "7-10 jours", 0.89)
│    2. (Doc: "2-3 jours", 0.87)
│    3. (Doc: "tarif +10€", 0.82)

ÉTAPE 4 : Formatage
├─ Input:   3 documents structurés
├─ Format:  [Document i - Source: ...]
└─ Output:  
    "[Document 1 - Source: coollibri_delais.txt]
     Délai standard 7-10 jours...
     
     [Document 2 - Source: coollibri_delais-rapides.txt]
     Délai express 2-3 jours...
     
     [Document 3 - Source: coollibri_tarifs.txt]
     Les tarifs accélérés..."

ÉTAPE 5 : Envoi au LLM
├─ Input:   PROMPT COMPLET = system_prompt + context + history + question
├─ Modèle:  Llama3.1:8b (Ollama)
├─ Params:  temperature=0.1, top_p=0.3, etc.
└─ Output:  
    "Pour une impression de livre standard, le délai de livraison est 
     de 7 à 10 jours ouvrables. Si vous avez besoin plus rapidement, 
     nous proposons une livraison express en 2-3 jours avec des frais 
     supplémentaires de 10€."
```

---

## 🔑 Points Clés à Retenir

### ✅ Vectorisation de la question
- **Qui:** `EmbeddingService` (SentenceTransformers)
- **Commande:** `embed_text(question)`
- **Output:** 768 nombres (vecteur)
- **Durée:** ~50-100ms pour une question

### ✅ Similarity Search
- **Qui:** `ChromaDB` (collection.query)
- **Commande:** `collection.query(query_embeddings, n_results=6)`
- **Processus:** Compare le vecteur avec 8252 autres vecteurs
- **Output:** Top 6 documents + scores de similarité (0-1)
- **Durée:** ~10-50ms pour 8252 docs

### ✅ Reranking
- **Qui:** `RAGPipeline`
- **Commande:** `rerank_documents(query, documents)`
- **Processus:** Trie et garde top 3
- **Output:** 3 meilleurs documents
- **Durée:** <1ms

### ✅ Formatage
- **Qui:** `RAGPipeline`
- **Commande:** `format_context(documents)`
- **Output:** Texte lisible avec sources
- **Durée:** <1ms

### ✅ Envoi au LLM
- **Qui:** `OllamaService` (Llama3.1:8b)
- **Commande:** `generate_response(query, context, prompt, history)`
- **Input:** TEXTE COMPLET (pas de vecteurs!)
- **Output:** Réponse en français naturel
- **Durée:** 1-5 secondes selon taille réponse

---

## ⚠️ Erreurs Courantes à Éviter

### ❌ FAUX: "Le modèle reçoit les vecteurs"
→ ✅ VRAI: Le modèle reçoit le TEXTE (contexte + question)

### ❌ FAUX: "La similarité est basée sur des mots clés"
→ ✅ VRAI: La similarité est basée sur la sémantique (sens)

### ❌ FAUX: "Plus de documents = meilleure réponse"
→ ✅ VRAI: 3 documents très pertinents > 10 documents moyens

### ❌ FAUX: "Tous les vecteurs sont identiques"
→ ✅ VRAI: Chaque texte a son vecteur unique

### ❌ FAUX: "La distance cosinus donne un score négatif"
→ ✅ VRAI: Distance 0-1, on la transforme en score 0-1 avec (1 - distance)

---

**Des questions sur une étape spécifique ?**
