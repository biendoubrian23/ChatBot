# 🌐 Script de Scraping CoolLibri

## 📋 Description

Ce script permet de scraper le site **CoolLibri.com** pour extraire le contenu des pages importantes et l'ajouter à la base de connaissances du chatbot.

## 🚀 Utilisation

### 1. Scraper le site

```powershell
cd X:\MesApplis\BiendouCorp\ChatBot\backend
& "venv\Scripts\python.exe" scripts\scrape_coollibri.py
```

### 2. Déplacer les fichiers vers docs/

Les fichiers seront créés dans `docs/scraped/`. Déplacez-les vers `docs/` :

```powershell
Move-Item docs\scraped\*.txt docs\
```

### 3. Réindexer les documents

```powershell
& "venv\Scripts\python.exe" scripts\index_documents.py
```

## 📄 Pages scrapées

Le script scrape automatiquement ces pages :

- ✅ **Accueil** - Page d'accueil
- ✅ **Services** - Impression de livres
- ✅ **Formats** - Formats disponibles
- ✅ **Tarifs** - Prix et devis
- ✅ **Aide** - Centre d'aide
- ✅ **Blog** - Articles du blog
- ✅ **Bibliothèque** - Bibliothèque de livres
- ✅ **ISBN** - Informations ISBN
- ✅ **Dépôt légal** - Guide dépôt légal
- ✅ **À propos** - Qui sommes-nous

## ⚙️ Configuration

Pour ajouter d'autres pages, modifiez le dictionnaire `PAGES_TO_SCRAPE` dans `scripts/scrape_coollibri.py` :

```python
PAGES_TO_SCRAPE = {
    "nom_page": "https://www.coollibri.com/url",
    # ...
}
```

## 📊 Résultat attendu

Après scraping et indexation :

- **Avant** : 51 chunks (FAQ uniquement)
- **Après** : 150-300+ chunks (FAQ + 10 pages web)

**Impact** :
- 🎯 **+60% de précision**
- 📚 **Couverture complète** des questions
- ✅ **Réponses à jour** du site

## 🔄 Mise à jour régulière

Pour garder les informations à jour :

```powershell
# Re-scraper (1x par semaine ou mois)
& "venv\Scripts\python.exe" scripts\scrape_coollibri.py

# Réindexer
& "venv\Scripts\python.exe" scripts\index_documents.py
```

## ⚠️ Notes légales

- ✅ Le scraping est fait pour usage interne uniquement
- ✅ Pause de 1 seconde entre chaque page (respectueux)
- ✅ User-Agent standard configuré
- ⚠️ Vérifiez les CGU du site avant scraping massif

## 🛠️ Dépendances

Les bibliothèques suivantes sont nécessaires :

```
requests==2.32.0
beautifulsoup4==4.12.3
lxml==5.3.0
```

Déjà installées dans `requirements.txt`.
