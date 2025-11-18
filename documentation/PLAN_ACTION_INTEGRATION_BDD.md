# Plan d'Action - Intégration Base de Données Chrono24 avec ChatBot CoolLibri

**Date:** 14 novembre 2025  
**Projet:** LibriAssist - Intégration suivi de commandes

---

## 📋 CONTEXTE

### Situation actuelle
- ✅ ChatBot fonctionnel avec RAG (ChromaDB) pour questions générales sur CoolLibri
- ✅ Backend FastAPI en local (port 8080)
- ✅ Base de données Chrono24 existante (C#/.NET) avec ~8252 commandes
- ❌ Pas de connexion entre le ChatBot et la base de données Chrono24
- ❌ Pas d'intégration sur le site CoolLibri

### Objectif final
Le client pose une question sur sa commande → ChatBot demande son numéro de commande → ChatBot consulte la BDD Chrono24 → ChatBot répond avec les infos réelles

---

## 🔍 PHASE 1 : COLLECTE D'INFORMATIONS (TON RÔLE)

### 1.1 Architecture de Chrono24

**Questions critiques à poser au développeur Chrono24 :**

#### A. Type de base de données
- [ ] Quelle base de données est utilisée ? (SQL Server, PostgreSQL, MySQL, etc.)
- [ ] Quelle version ?
- [ ] Nom de la base de données : `__________`
- [ ] Nom du serveur/host : `__________`
- [ ] Port : `__________`

#### B. Accès à la base de données
- [ ] Possibilité de créer un utilisateur en **lecture seule** pour le ChatBot ?
  - Username : `__________`
  - Password : `__________`
- [ ] Quelles sont les restrictions réseau ? (IP whitelisting nécessaire ?)
- [ ] La BDD est-elle accessible depuis Internet ou uniquement en réseau local ?

#### C. Structure de la table des commandes
- [ ] Nom exact de la table des commandes : `__________`
- [ ] Colonnes disponibles (à demander un schéma) :
  ```
  Exemple attendu :
  - NumeroCommande (ex: "CL-401372-487531")
  - NomClient
  - Site
  - Etat
  - DateCommandeDu
  - DateExpeditionPrevue
  - Designation
  - NbExemplaires
  - ... (autres colonnes pertinentes)
  ```
- [ ] Clé primaire : `__________`
- [ ] Y a-t-il d'autres tables liées ? (détails produits, historique statuts, etc.)

#### D. Architecture technique de Chrono24
- [ ] C# joue quel rôle ?
  - [ ] Frontend (interface web visible)
  - [ ] Backend (API REST/SOAP ?)
  - [ ] Accès direct BDD (ORM Entity Framework ?)
- [ ] Existe-t-il déjà une API REST/SOAP pour consulter les commandes ?
  - Si OUI : URL de l'API : `__________`
  - Si OUI : Documentation disponible ?
  - Si NON : Faut-il créer une API intermédiaire ?

#### E. Sécurité et permissions
- [ ] Quelles données peuvent être exposées au ChatBot ?
- [ ] Y a-t-il des données sensibles à masquer ? (prix, adresses, téléphones ?)
- [ ] Besoin d'authentification client ? (nom + numéro commande ?)

---

### 1.2 Architecture du site CoolLibri

**Questions à poser au développeur CoolLibri :**

#### A. Stack technique
- [x] Frontend : HTML, jQuery, .NET MVC
- [ ] Version de .NET : `__________`
- [ ] Serveur web : IIS / Kestrel / autre ?

#### B. Intégration du ChatBot
- [ ] Où placer le widget ChatBot sur le site ? (toutes les pages / page spécifique ?)
- [ ] Le site a-t-il déjà jQuery chargé ? (version : `__________`)
- [ ] Y a-t-il une CSP (Content Security Policy) qui pourrait bloquer le ChatBot ?
- [ ] Possibilité d'ajouter un fichier JS externe dans le layout principal ?

#### C. Déploiement
- [ ] Environnement de staging/test disponible avant production ?
- [ ] Processus de déploiement : FTP / Git / Pipeline CI/CD ?
- [ ] Qui a les droits pour déployer sur le site ?

---

## 🛠️ PHASE 2 : ARCHITECTURE TECHNIQUE (MON RÔLE)

### 2.1 Options d'intégration BDD

**Option A : Connexion directe à la BDD** (⚠️ Moins recommandé)
```
ChatBot (FastAPI) → SQL Connector → BDD Chrono24
```
- ✅ Simple et rapide
- ❌ Risque de sécurité (exposition BDD)
- ❌ Couplage fort

**Option B : API intermédiaire** (✅ Recommandé)
```
ChatBot (FastAPI) → API REST Chrono24 → BDD Chrono24
```
- ✅ Sécurité renforcée
- ✅ Contrôle des accès
- ✅ Découplage
- ❌ Nécessite développement côté Chrono24 (ou toi)

**Option C : API Python intermédiaire** (✅ Alternative si pas d'API existante)
```
ChatBot (FastAPI) → Service Python interne → BDD Chrono24
```
- ✅ Contrôlé par toi
- ✅ Peut être intégré dans le même backend
- ⚠️ Besoin accès BDD

### 2.2 Architecture complète proposée

```
┌─────────────────────────────────────────────────────────────┐
│                    SITE COOLLIBRI                           │
│  (HTML + jQuery + .NET MVC)                                 │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │   Widget ChatBot (JavaScript)        │                   │
│  │   - Interface de chat                │                   │
│  │   - Détection intention (commande)   │                   │
│  └───────────────┬─────────────────────┘                   │
└────────────────│─────────────────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           BACKEND FASTAPI (LibriAssist)                     │
│           (Hébergé : Azure/AWS/serveur local ?)             │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Routes API                                       │      │
│  │  - /chat (questions générales → RAG ChromaDB)    │      │
│  │  - /order/track (suivi commande → BDD)           │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Services                                         │      │
│  │  - RAG Pipeline (ChromaDB + Ollama)              │      │
│  │  - Order Service (NEW)                           │      │
│  │    → Connexion BDD Chrono24                      │      │
│  │    → Formatage des réponses                      │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──────────► ChromaDB (docs CoolLibri)
                 │
                 └──────────► BDD Chrono24
                              (via connecteur SQL ou API)
```

---

## 📝 PHASE 3 : DÉVELOPPEMENT (MON RÔLE)

### 3.1 Backend - Nouveaux composants

**À créer :**

1. **`backend/app/services/database.py`**
   - Connexion à la BDD Chrono24 (SQLAlchemy ou connecteur natif)
   - Pool de connexions
   - Gestion erreurs

2. **`backend/app/services/order_service.py`**
   - Recherche commande par numéro
   - Recherche commande par nom client + numéro
   - Formatage des données pour le ChatBot

3. **`backend/app/models/schemas.py`** (extension)
   - `OrderRequest` : numéro commande + nom client
   - `OrderResponse` : détails commande formatés

4. **`backend/app/api/routes.py`** (extension)
   - `POST /order/track` : endpoint pour suivi commande
   - Validation des inputs

5. **`backend/app/services/intent_classifier.py`** (NEW)
   - Détection si la question concerne une commande
   - Extraction automatique du numéro de commande si mentionné

6. **`backend/app/services/rag_pipeline.py`** (modification)
   - Intégration du classificateur d'intention
   - Routage : question générale → RAG / question commande → Order Service

### 3.2 Frontend - Widget ChatBot

**À créer :**

1. **`widget/chatbot-widget.js`**
   - Interface de chat responsive
   - Gestion des conversations
   - Détection contexte "suivi commande"
   - Formulaire guidé (nom + numéro)

2. **`widget/chatbot-widget.css`**
   - Design intégré à CoolLibri
   - Responsive mobile/desktop

3. **`widget/install.html`** (exemple d'intégration)
   ```html
   <!-- À placer dans le layout CoolLibri -->
   <script src="https://votre-backend.com/widget/chatbot-widget.js"></script>
   <script>
     LibriAssist.init({
       apiUrl: 'https://votre-backend.com/api',
       primaryColor: '#6366f1',
       position: 'bottom-right'
     });
   </script>
   ```

---

## 🚀 PHASE 4 : DÉPLOIEMENT (TON RÔLE + MON RÔLE)

### 4.1 Hébergement du Backend (TON RÔLE)

**Options d'hébergement :**

- **Option 1 : Serveur local BiendouCorp**
  - [ ] Serveur disponible avec IP publique fixe ?
  - [ ] Windows Server / Linux ?
  - [ ] Possibilité d'installer Python + dépendances ?

- **Option 2 : Cloud (Azure/AWS/Google Cloud)**
  - [ ] Budget disponible ?
  - [ ] Préférence Azure (puisque .NET) ?
  - Suggestion : Azure App Service ou Azure Container Instances

- **Option 3 : VPS (OVH, Hetzner, etc.)**
  - [ ] Budget : ~10-30€/mois

**Décision :** `__________`

### 4.2 Mise en production

**Mon rôle :**
- [ ] Créer le script d'installation du widget
- [ ] Tester en local avec BDD test
- [ ] Documenter l'API
- [ ] Créer un guide d'installation pour le dev CoolLibri

**Ton rôle :**
- [ ] Obtenir les accès BDD Chrono24
- [ ] Héberger le backend
- [ ] Configurer HTTPS (Let's Encrypt ou certificat payant)
- [ ] Fournir l'URL du backend au dev CoolLibri
- [ ] Donner le script d'installation au dev CoolLibri

---

## 🔐 PHASE 5 : SÉCURITÉ

### 5.1 Backend

- [ ] Variables d'environnement pour credentials BDD (jamais en dur)
- [ ] CORS configuré uniquement pour coollibri.fr
- [ ] Rate limiting sur les endpoints
- [ ] Logs des accès à la BDD
- [ ] Chiffrement HTTPS obligatoire

### 5.2 Base de données

- [ ] Utilisateur READ-ONLY pour le ChatBot
- [ ] Pas d'accès aux données sensibles (prix détaillés, marges, etc.)
- [ ] Limitation des requêtes par IP si possible

### 5.3 Widget

- [ ] Validation côté client ET serveur
- [ ] Sanitization des inputs (prévention injection SQL)
- [ ] Masquage partiel des données sensibles (ex: nom complet → "M. RAMI")

---

## 📊 PHASE 6 : FLUX CONVERSATIONNEL

### Scénario 1 : Client demande suivi sans numéro

```
Client: "Où en est ma commande ?"
Bot: "Je vais vous aider à suivre votre commande. Pour cela, j'ai besoin de deux informations :
      1️⃣ Votre nom de famille
      2️⃣ Le numéro de votre commande (format : CL-XXXXXX-XXXXXX)
      
      Pouvez-vous me communiquer ces informations ?"

Client: "RAMI CL-401372-487531"
Bot: [Appel API /order/track]
     "✅ Commande trouvée !
     
     📦 Commande CL-401372-487531
     👤 Client : Mina RAMI
     📋 Produit : DCC avec couverture, finition pelliculage, impression numérique
     📊 Quantité : 5 exemplaires
     📅 Date de commande : 20/10/2025
     🚚 Expédition prévue : 28/10/2025
     ⏱️ Statut : En production
     
     Votre commande est actuellement en cours d'impression. Elle sera expédiée d'ici le 28/10/2025."
```

### Scénario 2 : Client demande info générale

```
Client: "Quels formats proposez-vous ?"
Bot: [RAG ChromaDB]
     "CoolLibri propose plusieurs formats d'impression..."
```

### Scénario 3 : Client mélange les deux

```
Client: "Quels sont vos délais et où en est ma commande CL-401372 ?"
Bot: [Détection double intention]
     "Je vais répondre à vos deux questions :
     
     1️⃣ Concernant nos délais généraux...
     
     2️⃣ Pour votre commande CL-401372, j'ai besoin de votre nom de famille pour la retrouver..."
```

---

## ✅ CHECKLIST AVANT DE CODER

### Informations à collecter (TON RÔLE)

**Base de données Chrono24 :**
- [ ] Type de BDD : `__________`
- [ ] Host : `__________`
- [ ] Port : `__________`
- [ ] Nom BDD : `__________`
- [ ] Username (READ-ONLY) : `__________`
- [ ] Password : `__________`
- [ ] Nom de la table commandes : `__________`
- [ ] Schéma de la table (colonnes) : `__________`

**Hébergement Backend :**
- [ ] Type d'hébergement choisi : `__________`
- [ ] URL du backend : `__________`
- [ ] Certificat SSL configuré : OUI / NON

**Site CoolLibri :**
- [ ] Contact dev CoolLibri : `__________`
- [ ] Environnement de test disponible : OUI / NON
- [ ] URL de test : `__________`

### Développement (MON RÔLE)

- [ ] Service de connexion BDD créé
- [ ] Order Service créé
- [ ] Intent Classifier créé
- [ ] Routes API créées
- [ ] Widget JavaScript créé
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Documentation API (Swagger)
- [ ] Guide d'installation widget
- [ ] Script de déploiement

---

## 📅 TIMELINE ESTIMÉE

| Phase | Durée | Responsable | Dépendances |
|-------|-------|-------------|-------------|
| Collecte infos BDD | 1-2 jours | TOI | Dev Chrono24 |
| Collecte infos CoolLibri | 1 jour | TOI | Dev CoolLibri |
| Choix hébergement | 1 jour | TOI | Budget, infra |
| Développement backend | 3-5 jours | MOI | Infos BDD |
| Développement widget | 2-3 jours | MOI | - |
| Tests locaux | 2 jours | MOI + TOI | Backend prêt |
| Déploiement backend | 1 jour | TOI | Hébergement choisi |
| Intégration CoolLibri | 1 jour | Dev CoolLibri | Widget prêt |
| Tests production | 1-2 jours | TOI + Dev CoolLibri | Tout déployé |

**TOTAL : 12-17 jours**

---

## 🚨 RISQUES ET POINTS DE VIGILANCE

### Risques techniques
1. **BDD inaccessible depuis Internet**
   - Solution : VPN ou API intermédiaire sur serveur Chrono24
   
2. **Pas d'API existante Chrono24**
   - Solution : Créer un micro-service Python avec accès direct BDD
   
3. **Performance BDD (8252 commandes)**
   - Solution : Index sur NumeroCommande, cache Redis si nécessaire

4. **CORS bloqué sur CoolLibri**
   - Solution : Configuration serveur web CoolLibri

### Risques organisationnels
1. **Délai d'obtention des accès BDD**
   - Mitigation : Commencer avec BDD SQLite de test
   
2. **Dev CoolLibri indisponible**
   - Mitigation : Documentation ultra-claire pour installation autonome

---

## 📞 PROCHAINES ACTIONS IMMÉDIATES

### TOI (dans les 48h)
1. [ ] Contacter le dev Chrono24 avec la section "1.1 Architecture de Chrono24"
2. [ ] Contacter le dev CoolLibri avec la section "1.2 Architecture du site CoolLibri"
3. [ ] Décider de l'hébergement backend (local/cloud/VPS)
4. [ ] Me transmettre les réponses

### MOI (dès réception des infos)
1. [ ] Créer une BDD de test SQLite avec données exemple
2. [ ] Développer le service Order
3. [ ] Développer l'intent classifier
4. [ ] Créer le widget JavaScript
5. [ ] Tester en local
6. [ ] Te fournir le package de déploiement

---

## 💡 QUESTIONS OUVERTES

1. **Authentification client :** Doit-on demander UNIQUEMENT le numéro de commande ou aussi le nom pour sécuriser ?
   - Recommandation : Nom + Numéro (évite qu'un client voit la commande d'un autre)

2. **Données à afficher :** Afficher le prix de la commande ?
   - Recommandation : Oui si client authentifié (nom + numéro)

3. **Historique des statuts :** Afficher l'historique complet ou juste le statut actuel ?
   - Dépend de la structure BDD

4. **Notifications :** Le ChatBot doit-il pouvoir envoyer des alertes email ?
   - Pour v2 si besoin

---

## 📚 RESSOURCES À FOURNIR AU DEV COOLLIBRI

### Package final (MOI)
```
📦 libriassist-widget-v1.0/
├── 📄 README.md (guide d'installation)
├── 📄 chatbot-widget.js (minifié)
├── 📄 chatbot-widget.css
├── 📄 exemple-integration.html
└── 📄 API_DOCUMENTATION.md
```

### Instructions d'installation (1 ligne)
```html
<!-- À ajouter avant </body> dans le layout principal -->
<script src="https://votre-backend.com/widget/chatbot-widget.js"></script>
<script>LibriAssist.init({ apiUrl: 'https://votre-backend.com/api' });</script>
```

---

## ✍️ VALIDATION

**Ce plan est-il clair ?**
- [ ] Oui, je comprends toutes les étapes
- [ ] Non, j'ai des questions sur : `__________`

**Informations manquantes identifiées ?**
- [ ] Oui, je vais collecter les infos
- [ ] Non, j'ai besoin de clarifications

**Prêt à passer au développement ?**
- [ ] OUI → Fournis-moi les infos BDD et je commence
- [ ] NON → Discutons des points bloquants

---

**🎯 OBJECTIF : Avoir un ChatBot opérationnel sur CoolLibri capable de répondre aux questions générales (RAG) ET au suivi de commandes (BDD Chrono24) dans les 2-3 semaines.**
