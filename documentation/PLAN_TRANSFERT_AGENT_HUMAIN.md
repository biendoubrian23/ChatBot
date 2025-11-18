# Plan de Transfert vers un Agent Humain - LibriAssist

**Date:** 14 novembre 2025  
**Objectif:** Permettre le transfert d'une conversation du ChatBot IA vers un agent humain du service client

---

## 🎯 CONTEXTE

### Situation
Le client discute avec l'IA LibriAssist, mais souhaite parler à un humain :
- Question trop complexe pour l'IA
- Insatisfaction de la réponse
- Demande explicite : "Je veux parler à un agent"
- Réclamation / litige
- Besoin d'aide personnalisée

### Objectif
Transférer la conversation de manière fluide vers le service client sans que le client ait à :
- Répéter toute son histoire
- Changer de canal (téléphone, email)
- Attendre longtemps

---

## 🏗️ ARCHITECTURE GLOBALE

### Option 1 : Interface de Chat en Direct (Recommandé ✅)

```
┌─────────────────────────────────────────────────────────┐
│                  SITE COOLLIBRI                         │
│                                                         │
│  ┌──────────────────────────────────────┐              │
│  │   Widget ChatBot                     │              │
│  │                                      │              │
│  │   [Mode: IA] ←→ [Mode: Agent Humain]│              │
│  └──────────────────────────────────────┘              │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│           BACKEND FASTAPI (LibriAssist)                 │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │  WebSocket Manager                      │           │
│  │  - Gestion connexions clients           │           │
│  │  - Gestion connexions agents            │           │
│  │  - Routage des messages                 │           │
│  │  - Historique conversations             │           │
│  │  - File d'attente                       │           │
│  └─────────────────────────────────────────┘           │
└───────────────┬─────────────────────────────────────────┘
                │
                ├──────────► IA (RAG + BDD)
                │
                └──────────► Agent Humain (Interface Web)
```

### Option 2 : Intégration Service Tiers (Alternative)

```
Widget ChatBot → Backend → Service externe (Zendesk, Intercom, Crisp, etc.)
```

---

## 📊 COMPARAISON DES SOLUTIONS

### Solution A : Développement Interne (Chat en Direct)

#### Avantages ✅
- Contrôle total de l'expérience
- Pas de frais mensuels récurrents
- Intégration parfaite avec l'IA existante
- Historique unifié (IA + Humain)
- Personnalisation complète
- Accès direct à la BDD Chrono24

#### Inconvénients ❌
- Développement plus long (3-4 semaines)
- Nécessite une interface pour les agents
- Maintenance à prévoir
- Gestion des notifications
- Pas de fonctionnalités avancées (statistiques, CRM)

#### Coût estimé
- Développement : Temps de développement (ton travail ou prestataire)
- Hébergement : Inclus dans le backend existant
- **Total : ~0€ en frais récurrents**

---

### Solution B : Service Tiers (Zendesk, Intercom, Crisp, etc.)

#### Avantages ✅
- Mise en place rapide (1-2 jours)
- Interface agents professionnelle
- Fonctionnalités avancées (CRM, analytics, multicanal)
- Support technique inclus
- Mobile apps pour agents
- Statistiques détaillées
- Routage intelligent
- Gestion des équipes

#### Inconvénients ❌
- Coût mensuel élevé (50-300€/mois selon service)
- Moins de contrôle
- Dépendance externe
- Intégration IA moins fluide
- Données hébergées chez un tiers

#### Coût estimé (exemples)

| Service | Prix/mois | Agents | Fonctionnalités |
|---------|-----------|--------|-----------------|
| **Crisp** | 25€ | 2 agents | Chat, Email, Base de connaissances |
| **Tawk.to** | GRATUIT | Illimité | Chat basique, Monitoring |
| **Intercom** | ~99$ | 2 agents | Chat, Automation, CRM |
| **Zendesk** | ~55€ | 1 agent | Ticketing, Chat, Help Center |
| **LiveChat** | ~20€ | 1 agent | Chat en direct simple |

---

## 🛠️ SOLUTION RECOMMANDÉE : DÉVELOPPEMENT INTERNE

### Pourquoi ?
1. Tu as déjà le backend FastAPI
2. Budget limité (pas de frais mensuels)
3. Contrôle total pour futures évolutions
4. Intégration parfaite avec l'IA et la BDD Chrono24
5. Expérience unifiée pour le client

---

## 📋 COMPOSANTS À DÉVELOPPER

### 1. Backend - Nouveau Module "Live Chat"

#### A. `backend/app/services/chat_manager.py`
**Responsabilités :**
- Gestion des connexions WebSocket (clients + agents)
- File d'attente des demandes de transfert
- Routage des messages
- Stockage historique conversations
- Détection d'inactivité
- Notifications

**Fonctionnalités clés :**
```python
class ChatManager:
    - assign_agent_to_client()  # Assigne un agent disponible
    - transfer_to_human()       # Transfert IA → Humain
    - send_message()            # Envoi message client ↔ agent
    - get_conversation_history() # Récupère historique
    - set_agent_status()        # Disponible / Occupé / Absent
    - queue_client()            # File d'attente si pas d'agent dispo
```

#### B. `backend/app/models/schemas.py` (extension)
**Nouveaux schémas :**
```python
- ChatMessage (id, sender, content, timestamp, type)
- Conversation (id, client_id, agent_id, status, messages, created_at)
- Agent (id, name, email, status, current_conversations)
- TransferRequest (conversation_id, reason, timestamp)
```

#### C. `backend/app/api/websocket.py` (nouveau)
**Endpoints WebSocket :**
- `/ws/client/{client_id}` : Connexion client
- `/ws/agent/{agent_id}` : Connexion agent
- Messages en temps réel bidirectionnels

#### D. Base de données (extension)
**Nouvelles tables :**
```sql
-- Table des conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    client_id VARCHAR(255),
    agent_id UUID NULL,
    status VARCHAR(50), -- 'ai', 'waiting', 'active', 'closed'
    created_at TIMESTAMP,
    closed_at TIMESTAMP NULL,
    rating INT NULL -- Satisfaction 1-5
);

-- Table des messages
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    sender_type VARCHAR(20), -- 'client', 'agent', 'ai'
    sender_id VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP
);

-- Table des agents
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    status VARCHAR(50), -- 'available', 'busy', 'offline'
    max_conversations INT DEFAULT 3,
    created_at TIMESTAMP
);
```

---

### 2. Interface Agent - Dashboard Web

#### A. Nouveau projet ou intégration ?

**Option 1 : Sous-dossier dans le frontend existant** (Recommandé)
```
frontend/
├── app/              # Site client existant
├── agent-dashboard/  # NOUVEAU - Interface agents
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── conversations/
│   ├── components/
│   │   ├── ConversationList.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── ClientInfo.tsx
│   │   └── StatusToggle.tsx
│   └── lib/
│       └── websocket.ts
```

**Option 2 : Projet séparé**
```
agent-dashboard/  # Nouveau dossier racine
├── package.json
├── next.config.js
└── ...
```

#### B. Pages nécessaires

**1. Page de connexion** (`/agent/login`)
- Authentification agents
- JWT token pour sécurité

**2. Dashboard principal** (`/agent/dashboard`)
```
┌────────────────────────────────────────────────┐
│  LibriAssist - Agent Dashboard                 │
│  Agent: Marie Dupont [🟢 Disponible ▼]        │
├────────────────────────────────────────────────┤
│                                                │
│  📊 Statistiques du jour                       │
│  ├─ Conversations actives: 2                   │
│  ├─ En attente: 1                              │
│  ├─ Fermées aujourd'hui: 15                    │
│  └─ Temps de réponse moyen: 45s                │
│                                                │
│  🔔 Notifications                              │
│  ├─ [NOUVEAU] Client en attente (2min)         │
│  └─ [Message] Jean Martin (#12345)             │
│                                                │
└────────────────────────────────────────────────┘
```

**3. Interface de conversation** (`/agent/conversations`)
```
┌──────────────────────────────────────────────────────────┐
│  Conversations Actives (2)     En Attente (1)            │
├──────────────────┬───────────────────────────────────────┤
│                  │                                       │
│ 🟢 Jean Martin   │  💬 Conversation avec Jean Martin     │
│ #CL-401372...    │  ┌─────────────────────────────────┐ │
│ 5 min            │  │ Client (10:30)                  │ │
│                  │  │ Bonjour, où en est ma commande? │ │
│ 🟢 Sophie Durand │  │                                 │ │
│ Demande générale │  │ IA (10:30)                      │ │
│ 2 min            │  │ Je vais vous aider. Pouvez-vous │ │
│                  │  │ me donner votre numéro ?        │ │
│ 🟡 Paul Lemaire  │  │                                 │ │
│ En attente       │  │ Client (10:31)                  │ │
│ 2 min            │  │ CL-401372-487531                │ │
│                  │  │                                 │ │
│                  │  │ [TRANSFERT VERS AGENT DEMANDÉ]  │ │
│                  │  │                                 │ │
│                  │  │ Agent Marie (10:32)             │ │
│                  │  │ Bonjour Jean, je prends le      │ │
│                  │  │ relais. Je vois que...          │ │
│                  │  └─────────────────────────────────┘ │
│                  │                                       │
│                  │  📋 Infos Client                      │
│                  │  Nom: Jean Martin                     │
│                  │  Commande: CL-401372-487531           │
│                  │  Statut: En production                │
│                  │  Expédition: 28/10/2025               │
│                  │                                       │
│                  │  ┌─────────────────────────────────┐ │
│                  │  │ Votre message...                │ │
│                  │  └─────────────────────────────────┘ │
│                  │  [Envoyer] [Fermer conversation]      │
└──────────────────┴───────────────────────────────────────┘
```

#### C. Fonctionnalités de l'interface agent

**Essentielles :**
- [ ] Liste des conversations actives
- [ ] Liste des clients en attente
- [ ] Chat en temps réel (WebSocket)
- [ ] Affichage historique conversation (IA + Humain)
- [ ] Infos client (nom, commande, statut BDD)
- [ ] Changement de statut (Disponible/Occupé/Absent)
- [ ] Notification sonore nouvelle demande
- [ ] Fermeture de conversation
- [ ] Transfert vers un autre agent

**Optionnelles (v2) :**
- [ ] Réponses pré-enregistrées (templates)
- [ ] Upload de fichiers
- [ ] Historique des conversations passées
- [ ] Statistiques personnelles
- [ ] Notes privées sur le client
- [ ] Indicateur "Agent en train d'écrire..."

---

### 3. Widget Client - Modifications

#### Détection du besoin de transfert

**Déclencheurs automatiques :**
```javascript
const triggerHumanTransfer = [
  "parler à un agent",
  "parler à une personne",
  "agent humain",
  "service client",
  "je veux parler à quelqu'un",
  "personne réelle",
  "conseiller",
  "réclamation",
  "pas content",
  "remboursement"
];
```

**Bouton manuel :**
```
┌────────────────────────────────┐
│  LibriAssist                   │
│  ─────────────────────────────│
│  💬 Chat avec l'IA             │
│  👤 Parler à un agent          │ ← NOUVEAU
└────────────────────────────────┘
```

#### Flow du transfert

```
Client: "Je veux parler à un agent"
   ↓
IA détecte l'intention
   ↓
IA: "Je vous mets en relation avec un conseiller.
     Temps d'attente estimé: 2 minutes."
   ↓
Backend → ChatManager.transfer_to_human()
   ↓
Si agent disponible:
   → Connexion immédiate
   → "Marie (Service Client) a rejoint la conversation"
   
Si aucun agent disponible:
   → File d'attente
   → "Vous êtes en position 3. Un conseiller va vous répondre sous peu."
   → Notification agents
```

---

## 🔐 SÉCURITÉ & AUTHENTIFICATION

### Agents
- Système d'authentification séparé (JWT)
- Rôles : Admin / Agent / Superviseur
- Accès limité au dashboard agents
- Logs des actions agents

### Clients
- Identification par session ID unique
- Pas de compte requis
- Données anonymisées dans les logs

### Communication
- WebSocket sécurisé (WSS)
- Chiffrement TLS
- Validation des messages
- Rate limiting pour éviter spam

---

## 📈 GESTION DES AGENTS

### Routage Intelligent

**Stratégies de distribution :**

1. **Round Robin** (par défaut)
   - Distribue équitablement entre agents disponibles

2. **Moins chargé**
   - Assigne à l'agent avec le moins de conversations actives

3. **Par compétence** (optionnel v2)
   - Commandes → Agent spécialisé commandes
   - Technique → Agent technique

### File d'attente

```python
class QueueManager:
    - add_to_queue(client_id, priority=1)
    - get_next_in_queue()
    - notify_agents()  # Alerte si file > 5 clients
    - estimated_wait_time()
```

### Notifications Agents

**Canaux de notification :**
- [ ] Notification navigateur (Web Notification API)
- [ ] Son d'alerte dans l'interface
- [ ] Badge sur l'onglet navigateur
- [ ] Email si aucune réponse en 5min (optionnel)
- [ ] SMS pour urgences (optionnel)

---

## 💾 STOCKAGE DES DONNÉES

### Historique Conversations

**Objectifs :**
- Retrouver une conversation passée
- Analyser les questions fréquentes
- Former l'IA (amélioration continue)
- Preuves en cas de litige

**Durée de conservation :**
- Conversations actives : Temps réel
- Conversations fermées : 90 jours
- Archives : 1 an (RGPD)

**Base de données recommandée :**
- **PostgreSQL** : Stockage principal (conversations, messages, agents)
- **Redis** : Cache temps réel (agents en ligne, files d'attente)

---

## 🚀 PHASES DE DÉPLOIEMENT

### Phase 1 : MVP (Minimum Viable Product) - 3 semaines

**Fonctionnalités :**
- ✅ Transfert IA → Humain
- ✅ Chat en temps réel (WebSocket)
- ✅ Interface agent basique
- ✅ File d'attente simple
- ✅ Historique conversation
- ✅ Statut agent (Disponible/Occupé/Absent)

**Développement :**
- Semaine 1 : Backend (WebSocket, ChatManager, BDD)
- Semaine 2 : Interface agent (Dashboard, Chat)
- Semaine 3 : Intégration widget + Tests

---

### Phase 2 : Améliorations - 1-2 semaines

**Fonctionnalités :**
- ✅ Statistiques agents
- ✅ Réponses pré-enregistrées
- ✅ Transfert entre agents
- ✅ Notes privées
- ✅ Notifications avancées

---

### Phase 3 : Optimisations - Continu

**Fonctionnalités :**
- ✅ Analytics avancées
- ✅ CRM basique
- ✅ Intégration email
- ✅ Mobile app agents (optionnel)

---

## 🔧 TECHNOLOGIES NÉCESSAIRES

### Backend (Ajouts)
```python
# requirements.txt (ajouts)
websockets==12.0      # WebSocket
python-socketio==5.11 # Socket.IO (alternative)
redis==5.0.0          # Cache temps réel
psycopg2-binary==2.9  # PostgreSQL
python-jose==3.3      # JWT auth agents
passlib==1.7          # Hash passwords
```

### Frontend Agent Dashboard
```json
// package.json (nouveaux)
"socket.io-client": "^4.7.0",  // WebSocket client
"@tanstack/react-query": "^5.0", // State management
"react-hot-toast": "^2.4",     // Notifications
"date-fns": "^3.0",            // Formatage dates
"zustand": "^4.5"              // State global
```

### Infrastructure
- **WebSocket Server** : Intégré dans FastAPI (Starlette)
- **Redis** : Cache et pub/sub (Docker ou service cloud)
- **PostgreSQL** : BDD principale (déjà existante ou nouvelle)

---

## 📱 EXPÉRIENCE UTILISATEUR

### Scénario Complet

```
1. Client arrive sur CoolLibri
   └─> Widget ChatBot visible (coin bas-droit)

2. Client clique et pose une question
   └─> IA répond (RAG ou BDD)

3. Client : "Je veux parler à quelqu'un"
   └─> IA détecte l'intention de transfert

4. IA : "Je vous mets en relation avec un conseiller..."
   └─> Backend ajoute à la file d'attente

5. Agent Marie reçoit notification
   └─> Dashboard : 🔔 "Nouveau client en attente"

6. Marie accepte la conversation
   └─> Connexion WebSocket établie

7. Widget client : "Marie (Service Client) a rejoint la conversation"
   └─> Client et Marie peuvent échanger en temps réel

8. Marie a accès à :
   - Tout l'historique avec l'IA
   - Infos commande (si client a donné son numéro)
   - Possibilité de noter des infos

9. Fin de conversation
   └─> Marie : "Autre chose pour vous ?"
   └─> Client : "Non merci"
   └─> Marie ferme la conversation
   └─> Widget propose un sondage satisfaction (1-5 étoiles)
```

---

## 💰 BUDGET ESTIMÉ

### Option A : Développement Interne

| Poste | Coût |
|-------|------|
| Développement Backend (3 jours) | Ton temps |
| Développement Frontend Agent (5 jours) | Ton temps |
| Intégration Widget (2 jours) | Ton temps |
| Tests & Déploiement (2 jours) | Ton temps |
| **Hébergement Redis** | 0-10€/mois |
| **PostgreSQL** | Inclus ou 0-15€/mois |
| **Total récurrent** | **10-25€/mois** |

**Avantage :** Investissement temps initial, pas de frais mensuels élevés

---

### Option B : Service Tiers (ex: Crisp)

| Poste | Coût |
|-------|------|
| Intégration Crisp (1 jour) | Ton temps |
| Abonnement Crisp | 25€/mois (2 agents) |
| **Total récurrent** | **25€/mois** |

**Avantage :** Mise en place rapide, interface pro

---

## ✅ CHECKLIST DE MISE EN PRODUCTION

### Avant développement
- [ ] Décider : Développement interne vs Service tiers
- [ ] Choisir la base de données (PostgreSQL recommandé)
- [ ] Prévoir hébergement Redis (Docker local ou service cloud)
- [ ] Définir nombre d'agents simultanés (2-5 ?)
- [ ] Créer comptes agents (nom, email, mot de passe)

### Développement Backend
- [ ] WebSocket endpoints (`/ws/client`, `/ws/agent`)
- [ ] ChatManager (connexions, routage, file d'attente)
- [ ] Base de données (conversations, messages, agents)
- [ ] Authentification agents (JWT)
- [ ] API REST pour stats et historique

### Développement Frontend Agent
- [ ] Page login agents
- [ ] Dashboard avec stats
- [ ] Interface chat temps réel
- [ ] Liste conversations actives / en attente
- [ ] Gestion statut agent
- [ ] Notifications navigateur

### Widget Client
- [ ] Détection intention transfert
- [ ] Bouton "Parler à un agent"
- [ ] Affichage file d'attente
- [ ] Transition IA → Humain fluide
- [ ] Indicateur "Agent en train d'écrire"

### Tests
- [ ] Test transfert IA → Humain
- [ ] Test multiple agents
- [ ] Test file d'attente
- [ ] Test déconnexion agent (reassignement)
- [ ] Test déconnexion client (sauvegarde)
- [ ] Test charge (10+ clients simultanés)

### Formation Service Client
- [ ] Guide d'utilisation interface agent
- [ ] Procédures de réponse (templates)
- [ ] Accès BDD Chrono24 pour agents
- [ ] Procédure escalade (superviseur)

### Mise en production
- [ ] Déploiement backend avec WebSocket
- [ ] Déploiement interface agent (sous-domaine ?)
- [ ] Configuration Redis production
- [ ] Tests en conditions réelles (beta avec 1-2 agents)
- [ ] Monitoring (logs, erreurs, temps de réponse)

---

## 🎓 FORMATION AGENTS

### Documents à créer

**1. Guide Agent** (`GUIDE_AGENT.md`)
- Comment se connecter
- Interface dashboard
- Accepter une conversation
- Utiliser les réponses rapides
- Consulter infos client (BDD Chrono24)
- Fermer une conversation
- Gérer son statut

**2. Scripts de Réponses** (Templates)
```
- Accueil après transfert:
  "Bonjour [Nom], je suis [Agent] du service client CoolLibri.
   J'ai bien pris connaissance de votre demande. Comment puis-je vous aider ?"

- Recherche info commande:
  "Je consulte votre dossier, un instant s'il vous plaît..."

- Fin de conversation:
  "Votre demande est-elle résolue ?
   N'hésitez pas à nous recontacter si besoin. Bonne journée !"
```

**3. Procédures**
- Réclamation → Escalade superviseur
- Demande remboursement → Vérifier conditions CGV
- Problème technique → Transfert équipe technique

---

## 📊 MÉTRIQUES À SUIVRE

### Performance Service Client
- Temps d'attente moyen
- Temps de réponse moyen par agent
- Nombre de conversations par jour
- Taux de résolution au premier contact
- Satisfaction client (notes 1-5)

### Performance IA
- Taux de transfert vers humain (%)
- Raisons de transfert (catégories)
- Questions non résolues par IA
- → Utiliser pour améliorer la base de connaissances

---

## 🔮 ÉVOLUTIONS FUTURES (v2, v3)

### v2.0 (3-6 mois)
- Chatbot multilingue (détection langue)
- Intégration email (conversations par email)
- CRM basique (historique client)
- Statistiques avancées (dashboards)
- Mobile app agents (React Native)

### v3.0 (6-12 mois)
- Appels audio/vidéo intégrés
- Co-browsing (voir l'écran client)
- IA assiste l'agent (suggestions réponses)
- Automatisation post-conversation (email recap)
- Intégration téléphonie (Click-to-call)

---

## ❓ QUESTIONS FRÉQUENTES

### Q: Faut-il un nouveau site pour les agents ?
**R:** Non. Options :
- Sous-domaine : `agents.coollibri.com` (recommandé)
- Sous-répertoire : `coollibri.com/agent-dashboard`
- Domaine séparé : `libriassist-agents.com`

### Q: Combien d'agents peuvent être gérés ?
**R:** Techniquement illimité. Recommandation départ : 2-5 agents.

### Q: Que se passe-t-il si aucun agent n'est disponible ?
**R:** 
- Client mis en file d'attente
- Message : "Tous nos agents sont occupés. Temps d'attente: ~X min"
- Option : Laisser un message (email agent)
- IA continue de répondre en attendant

### Q: Les agents doivent-ils être formés ?
**R:** Oui, formation nécessaire :
- Utilisation de l'interface (2h)
- Accès BDD Chrono24 (1h)
- Procédures internes (2h)
- **Total : 1 journée de formation**

### Q: Peut-on tester sans développer tout de suite ?
**R:** Oui ! Options rapides :
1. **Tawk.to** (gratuit) : Intégrer en 10 min pour tester le concept
2. **Crisp** (essai gratuit 14 jours) : Tester avant développement interne

---

## 🎯 RECOMMANDATION FINALE

### Pour démarrer rapidement (1 semaine)
**→ Utilise Tawk.to (gratuit)** pour valider le besoin avec le service client
- Intégration widget : 30 min
- Formation agents : 1h
- Coût : 0€

### Pour une solution pérenne (1 mois)
**→ Développe la solution interne**
- Contrôle total
- Pas de frais mensuels
- Évolutivité illimitée
- Intégration parfaite avec l'IA et BDD Chrono24

### Roadmap suggérée
```
Semaine 1-2 : Tester avec Tawk.to (validation concept)
   ↓
Semaine 3-6 : Développer solution interne
   ↓
Semaine 7 : Migration Tawk.to → Solution interne
   ↓
Continu : Améliorations et optimisations
```

---

## 📞 PROCHAINES ÉTAPES

### Immédiat (toi)
1. [ ] Décider : Tester avec Tawk.to OU développer directement ?
2. [ ] Identifier les agents du service client (combien ? noms ?)
3. [ ] Définir horaires de disponibilité (8h-18h ?)
4. [ ] Estimer volume conversations/jour attendu

### Court terme (moi + toi)
1. [ ] Si test Tawk.to : Je t'aide à intégrer (30 min)
2. [ ] Si développement interne : Je commence le backend (après intégration BDD)

---

**🎯 OBJECTIF : Offrir une expérience client fluide avec transition IA → Humain sans friction, permettant au service client de prendre le relais quand nécessaire tout en gardant le contexte complet de la conversation.**

---

**Questions sur ce plan ?** 
Je peux détailler n'importe quelle partie ou créer un prototype de code si tu veux avancer sur le développement interne.
