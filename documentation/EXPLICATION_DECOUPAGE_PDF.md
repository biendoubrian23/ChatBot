# 📄 Explication détaillée : Découpage des PDFs (Chunking)

## 🎯 Pourquoi découper les PDFs ?

Imaginons que vous ayez un manuel de 100 pages. Si on donnait **tout le manuel** à l'IA à chaque question, ce serait :
- ❌ **Trop lent** (traiter 100 pages)
- ❌ **Trop coûteux** (modèle IA limité en mémoire)
- ❌ **Moins précis** (l'IA se perdrait dans trop d'infos)

**Solution** : On découpe en petits morceaux intelligents qu'on peut chercher rapidement !

---

## 🔄 Processus complet étape par étape

```
📚 PDF Complet (100 pages)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 1 : EXTRACTION                       │
└─────────────────────────────────────────────────────────────┘
         │
         ├─► 📖 Lire page par page
         │
         ├─► 📝 Extraire tout le texte
         │
         └─► ✅ Résultat : Un long texte brut
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 2 : NETTOYAGE                        │
└─────────────────────────────────────────────────────────────┘
         │
         ├─► 🧹 Supprimer espaces multiples
         │
         ├─► 🔢 Enlever numéros de page
         │
         ├─► 🎨 Nettoyer caractères spéciaux
         │
         └─► ✅ Résultat : Texte propre et lisible
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 3 : DÉCOUPAGE                        │
└─────────────────────────────────────────────────────────────┘
         │
         ├─► ✂️ Découper en morceaux de 800 caractères
         │
         ├─► 🔗 Ajouter un chevauchement de 100 caractères
         │
         └─► ✅ Résultat : ~150 petits "chunks"
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 4 : ENRICHISSEMENT                   │
└─────────────────────────────────────────────────────────────┘
         │
         ├─► 🏷️ Ajouter métadonnées (nom fichier, numéro chunk)
         │
         ├─► 🔢 Transformer en vecteurs mathématiques
         │
         └─► ✅ Résultat : Chunks prêts pour la base de données
                 │
                 ▼
        💾 Stockage dans ChromaDB
```

---

## 🔍 ÉTAPE 1 : Extraction du texte

### 📖 Deux méthodes utilisées

Le système essaie **deux outils** pour extraire le texte :

#### **Méthode 1 : pdfplumber** (Prioritaire)
```python
# Plus précis, meilleure qualité
with pdfplumber.open("FAQ.pdf") as pdf:
    for page in pdf.pages:
        text += page.extract_text()
```

**Avantages** :
- ✅ Respecte la mise en forme
- ✅ Gère mieux les tableaux
- ✅ Extraction de meilleure qualité

#### **Méthode 2 : PyPDF2** (Secours)
```python
# Si pdfplumber échoue
with open("FAQ.pdf", 'rb') as file:
    pdf_reader = PyPDF2.PdfReader(file)
    for page in pdf_reader.pages:
        text += page.extract_text()
```

**Utilisé si** :
- ⚠️ pdfplumber rencontre une erreur
- ⚠️ Le texte extrait est trop court (<100 caractères)

### 📊 Exemple concret

**PDF d'origine** (1 page) :
```
═══════════════════════════════════════
          FAQ CoolLibri
═══════════════════════════════════════

Q: Comment annuler une commande ?
R: Pour annuler votre commande, rendez-vous
   dans "Mes commandes" puis cliquez sur
   "Annuler". Vous serez remboursé sous 5-7
   jours ouvrés.

Q: Quels sont les délais de livraison ?
R: Les délais standard sont de 3-5 jours
   ouvrés. La livraison express est livrée
   sous 24-48h.

                                   Page 1
═══════════════════════════════════════
```

**Texte extrait** :
```
FAQ CoolLibri Q: Comment annuler une commande ? R: Pour annuler votre commande, rendez-vous dans "Mes commandes" puis cliquez sur "Annuler". Vous serez remboursé sous 5-7 jours ouvrés. Q: Quels sont les délais de livraison ? R: Les délais standard sont de 3-5 jours ouvrés. La livraison express est livrée sous 24-48h.
```

---

## 🧹 ÉTAPE 2 : Nettoyage du texte

### 🎯 Opérations de nettoyage

```python
def clean_text(text: str) -> str:
    # 1️⃣ Supprimer les espaces multiples
    text = re.sub(r'\s+', ' ', text)
    
    # 2️⃣ Enlever caractères spéciaux (garder ponctuation)
    text = re.sub(r'[^\w\s\.,;:?!()\-\'/]', '', text)
    
    # 3️⃣ Supprimer les numéros de page
    text = re.sub(r'\n\d+\n', '\n', text)
    
    return text.strip()
```

### 📊 Avant / Après nettoyage

**AVANT** (texte brut) :
```
FAQ    CoolLibri   

Q:  Comment    annuler   une commande  ?  
═══════════════
R: Pour annuler...

                    Page 1
```

**APRÈS** (texte nettoyé) :
```
FAQ CoolLibri Q: Comment annuler une commande ? R: Pour annuler...
```

**Résultat** : Texte compact, lisible, sans pollution visuelle

---

## ✂️ ÉTAPE 3 : Découpage intelligent (Chunking)

### 🎯 Paramètres configurés

```python
chunk_size = 800        # Taille d'un morceau (caractères)
chunk_overlap = 100     # Chevauchement entre morceaux
```

### 💡 Pourquoi 800 caractères ?

```
┌──────────────────────────────────────────────────────┐
│  Trop petit (200)    │  Optimal (800)   │ Trop grand (2000) │
├──────────────────────┼──────────────────┼───────────────────┤
│ ❌ Contexte perdu    │ ✅ Bon équilibre │ ❌ Lent à traiter │
│ ❌ Trop de morceaux  │ ✅ ~2-3 phrases  │ ❌ Moins précis   │
│ ❌ Moins précis      │ ✅ Rapide        │ ❌ Trop d'infos   │
└──────────────────────┴──────────────────┴───────────────────┘
```

**800 caractères** ≈ **2-3 paragraphes** ≈ **150-200 mots**

### 🔗 Chevauchement (Overlap) : Pourquoi 100 caractères ?

L'overlap évite de **couper une information en deux**.

**Exemple SANS overlap** ❌ :
```
Chunk 1: "...livraison sous 24h. Pour les retours, vous"
Chunk 2: "disposez de 30 jours. Contactez le service..."
```
→ L'info "30 jours pour les retours" est **coupée** !

**Exemple AVEC overlap de 100 caractères** ✅ :
```
Chunk 1: "...livraison sous 24h. Pour les retours, vous 
          disposez de 30 jours."
Chunk 2: "Pour les retours, vous disposez de 30 jours. 
          Contactez le service..."
```
→ L'info complète est **présente dans les deux chunks** !

### 📐 Stratégie de découpage intelligente

Le système découpe en cherchant **dans l'ordre** :

```python
separators = [
    "\n\n",    # 1️⃣ Double saut de ligne (nouveau paragraphe)
    "\n",      # 2️⃣ Simple saut de ligne
    ". ",      # 3️⃣ Fin de phrase
    " ",       # 4️⃣ Espace (entre mots)
    ""         # 5️⃣ En dernier recours : caractère par caractère
]
```

**Priorité** : Couper proprement (paragraphe > phrase > mot > caractère)

### 📊 Exemple de découpage réel

**Texte nettoyé** (1500 caractères) :
```
FAQ CoolLibri. Q: Comment annuler une commande ? R: Pour annuler 
votre commande, rendez-vous dans "Mes commandes" puis cliquez sur 
"Annuler". Vous serez remboursé sous 5-7 jours ouvrés. Le 
remboursement sera effectué sur votre moyen de paiement initial. 
Q: Quels sont les délais de livraison ? R: Les délais standard 
sont de 3-5 jours ouvrés. La livraison express est livrée sous 
24-48h. Les livraisons se font du lundi au vendredi. 
Q: Comment retourner un article ? R: Vous disposez de 30 jours 
pour retourner un article. Connectez-vous à votre compte, allez 
dans "Mes commandes" et demandez un retour. Vous recevrez une 
étiquette de retour gratuite par email sous 24h.
```

**Découpage en 2 chunks avec overlap** :

```
┌─────────────────────────────────────────────────────────────┐
│                        CHUNK 1                              │
│ (800 caractères)                                            │
├─────────────────────────────────────────────────────────────┤
│ FAQ CoolLibri. Q: Comment annuler une commande ? R: Pour    │
│ annuler votre commande, rendez-vous dans "Mes commandes"    │
│ puis cliquez sur "Annuler". Vous serez remboursé sous 5-7   │
│ jours ouvrés. Le remboursement sera effectué sur votre      │
│ moyen de paiement initial. Q: Quels sont les délais de      │
│ livraison ? R: Les délais standard sont de 3-5 jours        │
│ ouvrés. La livraison express est livrée sous 24-48h.        │
│ Les livraisons se font du lundi au vendredi.                │ ◄── Overlap commence ici
└─────────────────────────────────────────────────────────────┘
                                ▼ (100 caractères partagés)
┌─────────────────────────────────────────────────────────────┐
│                        CHUNK 2                              │
│ (800 caractères)                                            │
├─────────────────────────────────────────────────────────────┤
│ Les livraisons se font du lundi au vendredi.                │ ◄── Overlap se termine ici
│ Q: Comment retourner un article ? R: Vous disposez de 30    │
│ jours pour retourner un article. Connectez-vous à votre     │
│ compte, allez dans "Mes commandes" et demandez un retour.   │
│ Vous recevrez une étiquette de retour gratuite par email    │
│ sous 24h.                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏷️ ÉTAPE 4 : Ajout de métadonnées

Chaque chunk reçoit des **informations supplémentaires** :

```python
metadata = {
    "source": "FAQ CoolLibri.pdf",      # Fichier d'origine
    "chunk_id": 0,                       # Numéro du chunk (0, 1, 2...)
    "total_chunks": 2                    # Nombre total de chunks
}
```

### 📦 Structure finale d'un chunk

```json
{
  "page_content": "FAQ CoolLibri. Q: Comment annuler une commande ?...",
  "metadata": {
    "source": "FAQ CoolLibri.pdf",
    "chunk_id": 0,
    "total_chunks": 2
  }
}
```

**Utilité** :
- 🔍 Tracer l'origine de l'information
- 📊 Statistiques (combien de chunks par document)
- 🎯 Afficher la source dans la réponse à l'utilisateur

---

## 🔢 ÉTAPE 5 : Vectorisation (transformation en nombres)

Chaque chunk est transformé en **vecteur mathématique** pour la recherche.

### 🧮 Exemple simplifié

**Texte du chunk** :
```
"Comment annuler une commande ?"
```

**Vecteur généré** (384 dimensions avec all-MiniLM-L6-v2) :
```python
[0.234, -0.123, 0.456, 0.789, -0.234, ..., 0.123]
# 384 nombres qui "représentent" le sens du texte
```

### 💡 Pourquoi des vecteurs ?

Les vecteurs permettent de calculer la **similarité sémantique** :

```
Question utilisateur: "annuler commande"
  Vecteur: [0.240, -0.120, 0.450, ...]
                    │
                    │ Calcul de similarité
                    ▼
Chunk 1: "Comment annuler une commande"
  Vecteur: [0.234, -0.123, 0.456, ...]  ← Très similaire ! (95%)
  
Chunk 2: "Délais de livraison"
  Vecteur: [-0.500, 0.300, -0.200, ...]  ← Peu similaire (20%)
```

---

## 📊 Statistiques d'un découpage réel

### Exemple : FAQ de 15 pages

```
┌──────────────────────────────────────────────────────────┐
│                   AVANT DÉCOUPAGE                        │
├──────────────────────────────────────────────────────────┤
│  📄 1 fichier PDF : FAQ CoolLibri.pdf                   │
│  📏 15 pages                                            │
│  📝 ~12,000 caractères                                  │
│  ⚖️ Taille : 2.3 MB                                     │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼ DÉCOUPAGE
┌──────────────────────────────────────────────────────────┐
│                   APRÈS DÉCOUPAGE                        │
├──────────────────────────────────────────────────────────┤
│  📦 ~17 chunks créés                                    │
│  📏 800 caractères par chunk (moyenne)                  │
│  🔗 100 caractères d'overlap entre chunks               │
│  💾 Taille totale vectorisée : ~50 KB                   │
│  ⚡ Temps de traitement : ~2 secondes                   │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Récapitulatif visuel complet

```
📄 FAQ.pdf (15 pages, 12,000 caractères)
    │
    ├─► EXTRACTION ───────────► Texte brut (12,000 car.)
    │
    ├─► NETTOYAGE ────────────► Texte propre (11,500 car.)
    │
    ├─► DÉCOUPAGE ────────────► 17 chunks de ~800 car.
    │                           avec overlap de 100 car.
    │
    ├─► MÉTADONNÉES ──────────► + source, chunk_id, total
    │
    └─► VECTORISATION ────────► 17 vecteurs de 384 dimensions
                                │
                                ▼
                        💾 ChromaDB
                        (Base vectorielle)
                                │
                                ▼
                    ⚡ Prêt pour la recherche !
```

---

## 🔍 Comment les chunks sont utilisés lors d'une question

```
❓ Question utilisateur: "Comment annuler ma commande ?"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ Vectoriser la question                                  │
│     → [0.240, -0.120, 0.450, ...]                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  2️⃣ Chercher les 5 chunks les plus similaires (top_k=5)    │
│                                                             │
│     Chunk 3: "Comment annuler une commande..."  (95% match) │
│     Chunk 7: "Politique de remboursement..."    (78% match) │
│     Chunk 12: "Gérer vos commandes..."          (65% match) │
│     Chunk 1: "FAQ CoolLibri..."                 (45% match) │
│     Chunk 15: "Service client..."               (40% match) │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  3️⃣ Garder les 3 meilleurs (rerank_top_n=3)                │
│                                                             │
│     Chunk 3: "Comment annuler une commande..."              │
│     Chunk 7: "Politique de remboursement..."                │
│     Chunk 12: "Gérer vos commandes..."                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  4️⃣ Envoyer au modèle IA (Mistral)                          │
│                                                             │
│     Contexte: [3 chunks trouvés]                           │
│     Question: "Comment annuler ma commande ?"              │
│     → Génération de la réponse                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    ✅ Réponse finale à l'utilisateur
```

---

## ⚙️ Configuration personnalisable

Dans `config.py`, vous pouvez ajuster :

```python
# Taille des chunks
chunk_size: int = 800           # Plus grand = plus de contexte
                                # Plus petit = plus précis

# Chevauchement
chunk_overlap: int = 100        # Plus grand = moins de perte d'info
                                # Plus petit = moins de redondance

# Nombre de résultats
top_k_results: int = 5          # Combien de chunks chercher

# Reranking
rerank_top_n: int = 3           # Combien garder pour l'IA
```

### 🎛️ Impact des paramètres

| Paramètre | Valeur basse | Valeur haute |
|-----------|--------------|--------------|
| **chunk_size** | Plus précis, moins de contexte | Plus de contexte, moins précis |
| **chunk_overlap** | Rapide, risque de couper info | Sûr, mais redondant |
| **top_k_results** | Rapide, peut manquer info | Complet, plus lent |
| **rerank_top_n** | Rapide, réponse courte | Réponse détaillée |

---

## 💡 Points clés à retenir

✅ **Le découpage permet de chercher efficacement** dans de gros documents  
✅ **L'overlap évite de perdre des informations** entre les chunks  
✅ **La vectorisation permet la recherche sémantique** (par sens, pas par mots-clés)  
✅ **Les métadonnées permettent de tracer** l'origine des informations  
✅ **Le système est configurable** selon vos besoins  

---

## 🎓 Analogie finale

**Le découpage de PDF, c'est comme un livre de cuisine** :

- 📚 **Le PDF entier** = Tout le livre de cuisine
- 📄 **Un chunk** = Une recette individuelle
- 🔍 **La recherche** = Chercher "gâteau au chocolat" dans l'index
- 🤖 **L'IA** = Le chef qui lit la recette et vous l'explique

Au lieu de lire **tout le livre** à chaque fois, on trouve **la recette précise** dont vous avez besoin !

---

**Créé pour : Comprendre le système de découpage PDF**  
**Date : Novembre 2025**
