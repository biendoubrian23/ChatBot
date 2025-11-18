# 📊 ÉTUDE COMPARATIVE DES MODÈLES LLM - CHATBOT COOLLIBRI

## 📅 Date de l'étude
Novembre 2025

---

## 🎯 OBJECTIF DE L'ÉTUDE

Comparer 4 modèles LLM différents pour déterminer le meilleur choix pour le chatbot CoolLibri en termes de :
- **Précision** : Fidélité aux données sources, absence d'hallucinations
- **Vitesse** : Temps de réponse pour une expérience utilisateur optimale
- **Style** : Qualité de rédaction et ton professionnel
- **Complétude** : Exhaustivité des réponses

---

## 🤖 LES 4 MODÈLES À COMPARER

### **Modèle 1 : llama3.1:8b** (RÉFÉRENCE ACTUELLE)
- **Taille** : 8 milliards de paramètres
- **Développeur** : Meta AI
- **Date** : Juillet 2024
- **Avantages** : 
  - Très bon contexte (128k tokens)
  - Excellent pour réponses détaillées
  - Bon équilibre qualité/performance
- **Inconvénients** :
  - Plus lent que les modèles 3B
  - Peut sur-développer les réponses
- **RAM nécessaire** : ~5-6 GB

### **Modèle 2 : llama3.2:3b** (LÉGER ET RAPIDE)
- **Taille** : 3 milliards de paramètres
- **Développeur** : Meta AI
- **Date** : Septembre 2024
- **Avantages** :
  - Plus rapide que 3.1:8b
  - Meilleur pour suivre instructions strictes
  - Moins tendance à inventer
  - Nécessite moins de RAM
- **Inconvénients** :
  - Contexte plus court (8k tokens vs 128k)
  - Peut être moins détaillé
- **RAM nécessaire** : ~2-3 GB

### **Modèle 3 : mistral:7b** (ÉQUILIBRE FRANÇAIS)
- **Taille** : 7 milliards de paramètres
- **Développeur** : Mistral AI (entreprise française)
- **Date** : Septembre 2023 (régulièrement mis à jour)
- **Avantages** :
  - Excellent en français
  - Très bon équilibre vitesse/qualité
  - Reconnu pour précision factuelle
  - Bon pour service client
- **Inconvénients** :
  - Peut être parfois verbeux
- **RAM nécessaire** : ~4-5 GB

### **Modèle 4 : phi3:medium** (PETIT MAIS PUISSANT)
- **Taille** : 14 milliards de paramètres (architecture optimisée)
- **Développeur** : Microsoft
- **Date** : Avril 2024
- **Avantages** :
  - Très rapide malgré la taille
  - Excellent pour données structurées
  - Bon raisonnement
  - Performant en français
- **Inconvénients** :
  - Peut être trop concis
  - Moins connu que Llama/Mistral
- **RAM nécessaire** : ~8 GB

---

## 📝 INSTALLATION DES MODÈLES

### Commandes Ollama (dans PowerShell)

```powershell
# Télécharger les modèles (à exécuter une seule fois)
ollama pull llama3.1:8b
ollama pull llama3.2:3b
ollama pull mistral:7b
ollama pull phi3:medium

# Vérifier que tous les modèles sont installés
ollama list
```

---

## 🎯 LES 3 CONFIGURATIONS À TESTER PAR MODÈLE

Pour chaque modèle, nous allons tester **3 configurations pertinentes** qui représentent des cas d'usage réalistes :

### **Configuration 1 : PRÉCISION MAXIMALE**
*Objectif : Fidélité absolue aux sources, zéro créativité*
- **Temperature** : 0.0 (aucune variation)
- **Top_P** : 0.3 (très conservateur)
- **Top_K** : 20 (vocabulaire restreint)
- **Num_Predict** : 800 (réponses moyennes)
- **Top_K_Results** : 8 (contexte ciblé)
- **Rerank_Top_N** : 4 (focus sur meilleur contenu)

**Cas d'usage** : Questions avec chiffres précis, données factuelles critiques

---

### **Configuration 2 : ÉQUILIBRÉE (RECOMMANDÉE)**
*Objectif : Bon compromis précision/fluidité*
- **Temperature** : 0.15 (très légère variation)
- **Top_P** : 0.5 (équilibré)
- **Top_K** : 40 (vocabulaire riche mais contrôlé)
- **Num_Predict** : 900 (réponses détaillées)
- **Top_K_Results** : 10 (bon contexte)
- **Rerank_Top_N** : 5 (équilibré)

**Cas d'usage** : Usage quotidien du chatbot, questions variées

---

### **Configuration 3 : RÉPONSES COMPLÈTES**
*Objectif : Réponses détaillées et exhaustives*
- **Temperature** : 0.2 (légère créativité pour formulations)
- **Top_P** : 0.6 (plus de diversité)
- **Top_K** : 50 (vocabulaire très riche)
- **Num_Predict** : 1200 (réponses longues)
- **Top_K_Results** : 12 (maximum contexte)
- **Rerank_Top_N** : 6 (beaucoup de sources)

**Cas d'usage** : Questions complexes nécessitant explications détaillées

---

## ⚙️ PARAMÈTRES À MODIFIER ET LEUR LOCALISATION

### 🔵 PARAMÈTRE 1 : MODÈLE LLM

**📁 Fichier** : `backend/app/core/config.py`  
**📍 Ligne** : ~20

```python
class Settings(BaseSettings):
    # LLM Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"  # ← MODIFIER ICI
```

**🎯 Comment modifier :**
Remplacez `"llama3.1:8b"` par l'un des modèles suivants :
- `"llama3.2:3b"`
- `"mistral:7b"`
- `"phi3:medium"`

**📌 Exemple :**
```python
ollama_model: str = "mistral:7b"  # Test avec Mistral
```

**💡 Rôle** : Définit quel modèle Ollama utilise pour générer les réponses. C'est le paramètre principal à changer pour comparer les modèles.

---

### 🔵 PARAMÈTRE 2 : TEMPERATURE

**📁 Fichier** : `backend/app/services/llm.py`  
**📍 Ligne** : ~78 (fonction `generate_response`)

```python
options={
    "temperature": 0.1,  # ← MODIFIER ICI
    "top_p": 0.5,
    "top_k": 40,
    "num_predict": 900,
    "repeat_penalty": 1.2,
}
```

**🎯 Valeurs à tester :**
- `0.0` - Maximum précision, zéro créativité (répétitif)
- `0.1` - Très précis, fidèle aux sources (ACTUEL)
- `0.3` - Équilibré précision/variété
- `0.5` - Plus de variété dans les formulations
- `0.7` - Créatif mais peut dévier

**💡 Rôle** : Contrôle la "créativité" du modèle. 
- **Basse (0.0-0.2)** : Le modèle choisit toujours les mots les plus probables → réponses très prévisibles et précises
- **Moyenne (0.3-0.5)** : Un peu de variation dans les formulations
- **Haute (0.6-1.0)** : Beaucoup de créativité → risque d'inventer des choses

**🎯 Recommandation pour chatbot service client** : 0.0 à 0.2 (précision maximale)

---

### 🔵 PARAMÈTRE 3 : TOP_P (Nucleus Sampling)

**📁 Fichier** : `backend/app/services/llm.py`  
**📍 Ligne** : ~78

```python
options={
    "temperature": 0.1,
    "top_p": 0.5,  # ← MODIFIER ICI
    "top_k": 40,
    "num_predict": 900,
    "repeat_penalty": 1.2,
}
```

**🎯 Valeurs à tester :**
- `0.1` - Très conservateur
- `0.3` - Conservateur
- `0.5` - Équilibré (ACTUEL)
- `0.7` - Plus de diversité
- `0.9` - Maximum diversité

**💡 Rôle** : Contrôle la diversité en limitant le pool de mots considérés.
- **Principe** : Le modèle ne considère que les mots dont la probabilité cumulée atteint `top_p`
- **0.1** : Seulement les 10% de mots les plus probables → très prévisible
- **0.5** : Les 50% de mots les plus probables → équilibré
- **0.9** : Les 90% de mots les plus probables → très varié

**🎯 Recommandation** : 0.3 à 0.5 pour service client (balance diversité/précision)

---

### 🔵 PARAMÈTRE 4 : TOP_K

**📁 Fichier** : `backend/app/services/llm.py`  
**📍 Ligne** : ~78

```python
options={
    "temperature": 0.1,
    "top_p": 0.5,
    "top_k": 40,  # ← MODIFIER ICI
    "num_predict": 900,
    "repeat_penalty": 1.2,
}
```

**🎯 Valeurs à tester :**
- `10` - Très limité (vocabulaire restreint)
- `20` - Conservateur
- `40` - Équilibré (ACTUEL)
- `80` - Vocabulaire riche
- `100` - Maximum diversité vocabulaire

**💡 Rôle** : Limite le nombre de mots candidats à chaque génération.
- **Principe** : À chaque mot, le modèle ne considère que les K mots les plus probables
- **10** : Seulement les 10 mots les plus probables → style répétitif
- **40** : Les 40 mots les plus probables → bon équilibre
- **100** : Les 100 mots les plus probables → vocabulaire très varié

**🎯 Recommandation** : 30 à 50 pour service client (vocabulaire professionnel mais pas répétitif)

---

### 🔵 PARAMÈTRE 5 : NUM_PREDICT (Longueur de réponse)

**📁 Fichier** : `backend/app/services/llm.py`  
**📍 Ligne** : ~78

```python
options={
    "temperature": 0.1,
    "top_p": 0.5,
    "top_k": 40,
    "num_predict": 900,  # ← MODIFIER ICI
    "repeat_penalty": 1.2,
}
```

**🎯 Valeurs à tester :**
- `400` - Réponses courtes/concises
- `600` - Réponses moyennes
- `900` - Réponses détaillées (ACTUEL)
- `1200` - Réponses très complètes
- `1500` - Réponses exhaustives

**💡 Rôle** : Limite maximale de tokens (mots) dans la réponse.
- **Principe** : Définit le nombre maximum de "tokens" (morceaux de mots) que le modèle peut générer
- **400 tokens** : ~300 mots → réponses concises
- **900 tokens** : ~650 mots → réponses détaillées
- **1500 tokens** : ~1100 mots → réponses très complètes

**⚠️ Impact** : 
- Plus élevé = réponses plus complètes MAIS plus lentes
- Plus bas = réponses rapides MAIS risque de coupure

**🎯 Recommandation** : 600 à 1000 selon type de questions

---

### 🔵 PARAMÈTRE 6 : TOP_K_RESULTS (RAG - Nombre de documents récupérés)

**📁 Fichier** : `backend/app/core/config.py`  
**📍 Ligne** : ~27

```python
class Settings(BaseSettings):
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 300
    top_k_results: int = 10  # ← MODIFIER ICI
    rerank_top_n: int = 5
```

**🎯 Valeurs à tester :**
- `5` - Peu de contexte (rapide mais risque d'incomplet)
- `10` - Bon équilibre (ACTUEL)
- `15` - Beaucoup de contexte (plus lent mais plus complet)
- `20` - Maximum contexte (très lent)

**💡 Rôle** : Nombre de chunks de documents récupérés de la base vectorielle.
- **Principe** : Avant de générer la réponse, le système cherche les K documents les plus pertinents
- **5 documents** : Rapide mais peut manquer d'info
- **10 documents** : Bon équilibre
- **20 documents** : Beaucoup de contexte mais peut noyer l'info importante

**⚠️ Impact** : 
- Plus élevé = plus de contexte pour le LLM MAIS plus lent et risque de confusion
- Plus bas = plus rapide MAIS risque de manquer des infos

**🎯 Recommandation** : 8 à 12 pour équilibre vitesse/qualité

---

### 🔵 PARAMÈTRE 7 : RERANK_TOP_N (RAG - Nombre de documents finaux)

**📁 Fichier** : `backend/app/core/config.py`  
**📍 Ligne** : ~27

```python
class Settings(BaseSettings):
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 300
    top_k_results: int = 10
    rerank_top_n: int = 5  # ← MODIFIER ICI
```

**🎯 Valeurs à tester :**
- `3` - Contexte minimal (très ciblé)
- `5` - Équilibré (ACTUEL)
- `7` - Plus de contexte
- `10` - Maximum contexte (doit être ≤ top_k_results)

**💡 Rôle** : Après récupération de `top_k_results` documents, re-classe et garde seulement les N meilleurs.
- **Principe** : 
  1. Récupère `top_k_results` documents (ex: 10)
  2. Re-classe ces 10 avec un algorithme plus précis
  3. Garde seulement les `rerank_top_n` meilleurs (ex: 5)
- **3 documents** : Contexte très ciblé, réponses précises
- **5 documents** : Bon équilibre
- **10 documents** : Beaucoup de contexte, peut diluer l'info

**⚠️ Règle** : `rerank_top_n` doit TOUJOURS être ≤ `top_k_results`

**🎯 Recommandation** : 4 à 6 pour précision optimale

---

## 🎨 CONFIGURATION RECOMMANDÉE PAR TYPE DE QUESTION

### Pour questions simples/directes
```python
temperature: 0.1
top_p: 0.3
top_k: 30
num_predict: 400
top_k_results: 8
rerank_top_n: 3
```

### Pour questions complexes/détaillées
```python
temperature: 0.2
top_p: 0.5
top_k: 40
num_predict: 1000
top_k_results: 12
rerank_top_n: 6
```

### Pour questions avec chiffres (MAXIMUM PRÉCISION)
```python
temperature: 0.0
top_p: 0.3
top_k: 20
num_predict: 600
top_k_results: 10
rerank_top_n: 5
```

---

## 📋 LES 30 QUESTIONS DE TEST

### 🟢 CATÉGORIE 1 : QUESTIONS FACILES/DIRECTES (6 questions)

**Q1** : Quels sont les types de reliure disponibles chez CoolLibri ?  
**Réponse attendue** : 4 types (Dos Carré Collé, Rembordé, Agrafé, Spirale)

**Q2** : Quel est le nombre minimum de pages pour la reliure agrafée ?  
**Réponse attendue** : 8 pages minimum

**Q3** : Quel est le nombre maximum de pages pour la reliure agrafée ?  
**Réponse attendue** : 60 pages maximum

**Q4** : Quelle contrainte technique existe pour la reliure agrafée ?  
**Réponse attendue** : Le nombre de pages doit être un multiple de 4

**Q5** : Quelle est la couverture utilisée pour le Dos Carré Collé ?  
**Réponse attendue** : Couverture souple, papier couché 300g

**Q6** : Quel type de reliure permet une ouverture à 360 degrés ?  
**Réponse attendue** : Spirale

---

### 🟡 CATÉGORIE 2 : QUESTIONS AVEC CHIFFRES PRÉCIS (8 questions)

**Q7** : Donne-moi le nombre minimum de pages pour la reliure Dos Carré Collé selon le type de papier.  
**Réponse attendue** : 
- Papier 60g : 60 pages minimum
- Papier 80g : 80 pages minimum
- Papier 90g satiné : 90 pages minimum

**Q8** : Donne-moi le nombre maximum de pages pour la reliure Dos Carré Collé selon le type de papier.  
**Réponse attendue** :
- Papier 60g : 700 pages maximum
- Papier 80g : 500 pages maximum
- Papier 90g satiné : 500 pages maximum

**Q9** : Quelles sont les limites de pages pour la reliure Rembordé ?  
**Réponse attendue** : Minimum 24 pages, maximum 100 à 150 pages selon l'épaisseur du papier

**Q10** : Quelles sont les limites de pages pour la reliure Spirale ?  
**Réponse attendue** : Minimum 1 page, maximum 290 à 500 pages selon l'épaisseur du papier

**Q11** : Donne-moi le minimum et le maximum de pages en fonction de chaque reliure.  
**Réponse attendue** : 
- Dos Carré Collé : 60-90 pages min, 500-700 pages max
- Rembordé : 24 pages min, 100-150 pages max
- Agrafé : 8 pages min, 60 pages max
- Spirale : 1 page min, 290-500 pages max

**Q12** : Si j'ai un livre de 85 pages en papier 80g, puis-je utiliser le Dos Carré Collé ?  
**Réponse attendue** : Oui (85 pages ≥ 80 pages minimum pour papier 80g)

**Q13** : Si j'ai un livre de 650 pages en papier 80g, puis-je utiliser le Dos Carré Collé ?  
**Réponse attendue** : Non (650 pages > 500 pages maximum pour papier 80g). Solution : utiliser papier 60g ou séparer en tomes.

**Q14** : Si j'ai 75 pages, puis-je utiliser la reliure agrafée ?  
**Réponse attendue** : Non (75 > 60 pages max ET 75 n'est pas un multiple de 4)

---

### 🔵 CATÉGORIE 3 : QUESTIONS COMPARATIVES (6 questions)

**Q15** : Quelle est la différence entre Dos Carré Collé et Rembordé ?  
**Réponse attendue** : Dos Carré Collé = couverture souple ; Rembordé = couverture rigide

**Q16** : Quelle reliure choisir pour un roman de 250 pages ?  
**Réponse attendue** : Dos Carré Collé ou Spirale (Rembordé limité à 150 pages max)

**Q17** : Quelle est la reliure la plus économique ?  
**Réponse attendue** : Agrafé (mais limité à 60 pages max)

**Q18** : Quelle reliure offre la meilleure protection ?  
**Réponse attendue** : Rembordé (couverture rigide)

**Q19** : Quelle reliure est idéale pour consulter fréquemment un document ?  
**Réponse attendue** : Spirale (ouverture à 360°, pages à plat)

**Q20** : Quelle reliure est utilisée pour les livres vendus en librairie ?  
**Réponse attendue** : Dos Carré Collé (finition identique aux livres de librairie)

---

### 🟠 CATÉGORIE 4 : QUESTIONS COMPLEXES/MULTI-ÉTAPES (6 questions)

**Q21** : Je veux imprimer une bande dessinée de 120 pages. Quelle reliure me recommandes-tu et pourquoi ?  
**Réponse attendue** : 
- Rembordé si possible (mais limite 100-150 pages selon papier, donc vérifier épaisseur)
- Sinon Dos Carré Collé (bonne alternative, 120 pages OK)
- Expliquer avantages/inconvénients

**Q22** : Mon livre fait 600 pages en papier 90g. Quelles sont mes options ?  
**Réponse attendue** :
- Papier 90g max = 500 pages → impossible
- Solutions : 
  1. Passer au papier 60g (max 700 pages)
  2. Séparer en 2 tomes
  3. Utiliser Spirale si acceptable

**Q23** : Je veux imprimer 40 pages. Quelles reliures sont possibles et laquelle recommandes-tu ?  
**Réponse attendue** :
- Agrafé : OUI (40 est multiple de 4 et entre 8-60)
- Spirale : OUI (min 1 page)
- Dos Carré Collé : NON (40 < 60 pages min)
- Rembordé : OUI (40 > 24 min et < 150 max)
- Recommandation : Agrafé (économique) ou Rembordé (qualité)

**Q24** : Quel format et quelle reliure pour un livre de recettes de 180 pages ?  
**Réponse attendue** :
- Reliure : Spirale (ouverture à plat, idéal cuisine)
- Format : A4 Portrait ou A5
- Papier : 90g satiné (résiste aux taches)

**Q25** : Je veux faire un livre photo premium de 80 pages. Configuration complète ?  
**Réponse attendue** :
- Reliure : Rembordé (protection maximale, luxueux)
- Format : A4 Paysage ou A5 Paysage
- Papier : Papier photo couché haute qualité

**Q26** : J'ai un magazine de 32 pages à imprimer en 500 exemplaires. Quelle solution et pourquoi ?  
**Réponse attendue** :
- Reliure : Agrafé (32 est multiple de 4, économique pour gros tirage)
- Format : A4 Portrait ou A5
- Papier : 80g ou couché selon rendu
- Avantages : Rapide, économique pour 500 ex

---

### 🔴 CATÉGORIE 5 : QUESTIONS PIÈGES/CHALLENGEANTES (4 questions)

**Q27** : Puis-je imprimer 1000 pages en Spirale ?  
**Réponse attendue** : Non (max 290-500 pages selon papier)

**Q28** : Puis-je imprimer 50 pages en Dos Carré Collé ?  
**Réponse attendue** : Non (minimum 60-90 pages selon papier)

**Q29** : Est-ce que toutes les reliures acceptent le papier 60g ?  
**Réponse attendue** : Information non précisée dans les sources. Recommander de contacter CoolLibri pour confirmation.

**Q30** : Quelle est la différence de prix entre Agrafé et Rembordé pour 50 pages ?  
**Réponse attendue** : Information tarifaire non disponible dans la base de connaissances. Recommander de demander un devis à CoolLibri.

---

## 📊 CRITÈRES D'ÉVALUATION (Grille de notation /100)

### 1. PRÉCISION DES CHIFFRES (/40 points)

**Chiffres exacts** (/10)
- 10 pts : Tous les chiffres sont EXACTEMENT corrects (copiés des sources)
- 7 pts : 1 chiffre approximé (ex: "environ 60" au lieu de "60")
- 4 pts : 2-3 chiffres approximés
- 0 pt : Chiffres inventés ou multiples erreurs

**Absence d'hallucination** (/10)
- 10 pts : Aucune invention, tout est basé sur les sources
- 7 pts : 1 détail inventé mineur
- 4 pts : Plusieurs détails inventés
- 0 pt : Informations complètement fausses

**Complétude des données** (/10)
- 10 pts : Tous les détails pertinents donnés (min, max, types de papier)
- 7 pts : 1 détail manquant
- 4 pts : Plusieurs détails manquants
- 0 pt : Réponse incomplète

**Cohérence** (/10)
- 10 pts : Réponse logique et cohérente du début à la fin
- 7 pts : 1 petite incohérence
- 4 pts : Plusieurs incohérences
- 0 pt : Réponse contradictoire

---

### 2. VITESSE DE RÉPONSE (/20 points)

- **20 pts** : < 2 secondes (excellent)
- **15 pts** : 2-4 secondes (très bien)
- **10 pts** : 4-6 secondes (bien)
- **5 pts** : 6-8 secondes (acceptable)
- **0 pt** : > 8 secondes (trop lent)

**Note** : Le timer sera affiché automatiquement dans le frontend

---

### 3. QUALITÉ DU STYLE (/20 points)

**Ton professionnel** (/5)
- 5 pts : Ton chaleureux, professionnel et rassurant
- 3 pts : Ton correct mais un peu froid ou trop familier
- 1 pt : Ton inapproprié
- 0 pt : Ton non professionnel

**Structure claire** (/5)
- 5 pts : Paragraphes bien organisés, listes à puces si pertinent
- 3 pts : Structure correcte mais améliorable
- 1 pt : Structure confuse
- 0 pt : Pas de structure

**Authenticité** (/5)
- 5 pts : Parle avec confiance, JAMAIS "selon le document"
- 3 pts : 1 mention de source ("selon nos documents")
- 1 pt : Plusieurs mentions de sources
- 0 pt : Constamment réfère aux documents

**Adaptation au contexte** (/5)
- 5 pts : Réponse parfaitement adaptée au niveau de la question
- 3 pts : Réponse adaptée mais perfectible
- 1 pt : Réponse trop technique ou trop simple
- 0 pt : Réponse inadaptée

---

### 4. COMPLÉTUDE DE LA RÉPONSE (/20 points)

**Répond à toute la question** (/10)
- 10 pts : Répond à TOUS les aspects de la question
- 7 pts : Répond à la majorité mais oublie 1 aspect
- 4 pts : Répond partiellement
- 0 pt : Ne répond pas à la question

**Détails pertinents** (/10)
- 10 pts : Donne tous les détails utiles sans superflu
- 7 pts : Manque 1-2 détails utiles
- 4 pts : Manque plusieurs détails importants
- 0 pt : Réponse trop vague

---

## 📈 TABLEAU DE SYNTHÈSE

Pour chaque test, remplissez :

| Critère | Points | Notes |
|---------|--------|-------|
| **PRÉCISION** | /40 | |
| - Chiffres exacts | /10 | |
| - Absence hallucination | /10 | |
| - Complétude données | /10 | |
| - Cohérence | /10 | |
| **VITESSE** | /20 | |
| - Temps de réponse | /20 | Timer affiché |
| **STYLE** | /20 | |
| - Ton professionnel | /5 | |
| - Structure claire | /5 | |
| - Authenticité | /5 | |
| - Adaptation contexte | /5 | |
| **COMPLÉTUDE** | /20 | |
| - Répond à tout | /10 | |
| - Détails pertinents | /10 | |
| **TOTAL** | **/100** | |

---

## 🔄 PROCÉDURE DE TEST SIMPLIFIÉE

### Étape 1 : Préparer l'environnement
1. Télécharger les 4 modèles avec Ollama :
```powershell
ollama pull llama3.1:8b
ollama pull llama3.2:3b
ollama pull mistral:7b
ollama pull phi3:medium
```

2. Ouvrir le template Google Sheets
3. Dupliquer l'onglet pour chaque combinaison modèle + configuration

### Étape 2 : Pour chaque modèle (4 modèles × 3 configs = 12 tests)

**2.1. Configurer le modèle et les paramètres**

Modifier **`backend/app/core/config.py`** (ligne ~20-27) :
```python
class Settings(BaseSettings):
    # LLM Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"  # ← CHANGER LE MODÈLE ICI
    
    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 300
    top_k_results: int = 10  # ← CHANGER SELON CONFIG
    rerank_top_n: int = 5    # ← CHANGER SELON CONFIG
```

Modifier **`backend/app/services/llm.py`** (ligne ~78) :
```python
options={
    "temperature": 0.15,     # ← CHANGER SELON CONFIG
    "top_p": 0.5,           # ← CHANGER SELON CONFIG
    "top_k": 40,            # ← CHANGER SELON CONFIG
    "num_predict": 900,     # ← CHANGER SELON CONFIG
    "repeat_penalty": 1.2,
}
```

**2.2. Redémarrer le backend**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

**2.3. Tester les 30 questions**
- Poser chaque question
- Le **timer s'affiche automatiquement** sous la réponse
- Noter le **temps** dans Google Sheets
- Évaluer la **qualité** de 0 à 10
- Ajouter observations si nécessaire

**2.4. Passer à la configuration suivante**
- Modifier les paramètres
- Redémarrer le backend
- Recommencer les 30 questions

### Étape 3 : Analyser les résultats
- Comparer scores moyens par modèle
- Comparer scores par configuration
- Identifier le meilleur combo modèle + configuration
- Analyser par catégorie de questions

---

## 📊 CRITÈRES D'ÉVALUATION SIMPLIFIÉS

### 1. VITESSE (temps brut)
- Notez simplement le temps affiché (ex: 2.45s)
- Google Sheets calculera automatiquement la moyenne

### 2. QUALITÉ GLOBALE (/10 points)
Évaluez globalement la réponse en tenant compte de :
- ✅ **Précision** : Chiffres exacts ? Pas d'invention ?
- ✅ **Complétude** : Répond à toute la question ?
- ✅ **Clarté** : Bien structuré ? Facile à comprendre ?
- ✅ **Style** : Ton professionnel ? Pas de mention de sources ?
- ✅ **Pertinence** : Adapté à la question ?

**Barème simplifié :**
- **9-10** : Excellente réponse, aucun défaut
- **7-8** : Très bonne réponse, 1-2 petits défauts
- **5-6** : Bonne réponse, quelques manques
- **3-4** : Réponse moyenne, plusieurs problèmes
- **0-2** : Mauvaise réponse, erreurs majeures

---

## 📈 ANALYSE DES RÉSULTATS

### Tableau de synthèse (à créer dans Google Sheets)

| Modèle | Config | Vitesse Moy. | Qualité Moy. | Score Pondéré* |
|--------|--------|--------------|--------------|----------------|
| llama3.1:8b | Précision Max | | | |
| llama3.1:8b | Équilibrée | | | |
| llama3.1:8b | Complète | | | |
| llama3.2:3b | Précision Max | | | |
| llama3.2:3b | Équilibrée | | | |
| llama3.2:3b | Complète | | | |
| mistral:7b | Précision Max | | | |
| mistral:7b | Équilibrée | | | |
| mistral:7b | Complète | | | |
| phi3:medium | Précision Max | | | |
| phi3:medium | Équilibrée | | | |
| phi3:medium | Complète | | | |

*Score Pondéré = (Qualité × 0.7) + (Bonus Vitesse × 0.3)
- Bonus Vitesse : 10 pts si < 2s, 8 pts si 2-4s, 6 pts si 4-6s, etc.

---

## 📊 PRÉSENTATION AU MANAGER (Structure simplifiée)

### 1. CONTEXTE
- Problème : Inconsistances et lenteur du chatbot
- Objectif : Trouver le meilleur modèle + configuration

### 2. MÉTHODOLOGIE
- **4 modèles** testés (llama3.1:8b, llama3.2:3b, mistral:7b, phi3:medium)
- **3 configurations** par modèle (Précision Max, Équilibrée, Complète)
- **30 questions** par test (150 questions factuelles, comparatives, complexes)
- **2 critères** : Vitesse de réponse + Qualité globale (/10)

### 3. RÉSULTATS
- **Graphique 1** : Qualité moyenne par modèle (barres)
- **Graphique 2** : Vitesse moyenne par modèle (barres)
- **Graphique 3** : Score pondéré par combinaison (tableau de chaleur)
- **Tableau** : Top 3 meilleures configurations

### 4. RECOMMANDATION
- **Modèle recommandé** : [À remplir]
- **Configuration recommandée** : [À remplir]
- **Bénéfices attendus** :
  - Amélioration précision : +X%
  - Amélioration vitesse : -X secondes
  - Consistance des réponses : Excellent

### 5. PLAN DE DÉPLOIEMENT
1. Tests finaux sur échantillon utilisateurs réels
2. Migration progressive (A/B testing)
3. Monitoring post-déploiement (1 semaine)
4. Ajustements fins si nécessaire

---

## 📝 NOTES IMPORTANTES

### ⚠️ À faire avant chaque test
1. Vider le cache du navigateur (Ctrl+Shift+Delete)
2. Redémarrer le backend après chaque changement de config
3. Attendre 10 secondes que le modèle charge

### ⚠️ Bonnes pratiques
- Tester chaque question 2 fois pour vérifier consistance
- Noter toute observation qualitative (style, formulation)
- Comparer réponses similaires entre modèles

### ⚠️ Pièges à éviter
- Ne pas changer plusieurs paramètres à la fois
- Ne pas tester avec cache navigateur plein
- Ne pas comparer résultats avec backend pas redémarré

---

**Bonne étude comparative ! 🚀**
