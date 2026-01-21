# MONITORA - Plateforme de Gestion de Chatbots
## Cahier des Charges v1.0
voici le contenu pour le .env dans le dossier monitora
Project URL: https://pokobirrjcckebnvrlmn.supabase.co
Publishable API Key: sb_publishable_qIJ2jAdLFNGc1oM-irT87w_oT7okFP_
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva29iaXJyamNja2VibnZybG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MzY5OTQsImV4cCI6MjA4MzIxMjk5NH0._qcpJuYYzyaEhNOFYCtu5gZJOdqX51fbJ1V7HQFlPxY
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva29iaXJyamNja2VibnZybG1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzNjk5NCwiZXhwIjoyMDgzMjEyOTk0fQ.wbRPEryg42to82YRY2X3kAQnLR1zdqkgPSYnc7ThsD8

MISTRAL_API_KEY=jgzR7hCWaI6OyParaZufzt8YrcDZ3ne7
MISTRAL_MODEL=mistral-small-latest


# Supabase Configuration


# Backend API (pour le RAG)
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000/api/v1

---

## 1. Vision du Projet

**MONITORA** est une plateforme SaaS permettant de déployer, gérer et monitorer des chatbots IA sur plusieurs sites web depuis une interface centralisée unique.

### Problème résolu
- Éviter de cloner/dupliquer le code pour chaque site client
- Centraliser la gestion des sources documentaires (FAQ, guides)
- Monitorer les performances de tous les chatbots depuis un seul endroit
- Simplifier l'intégration avec un simple script à copier-coller

---

## 2. Utilisateurs Cibles

| Rôle | Besoins |
|------|---------|
| **Admin MONITORA** | Gérer tous les workspaces, voir les stats globales |
| **Gestionnaire de site** | Configurer son chatbot, uploader ses docs, voir ses stats |

---

## 3. Fonctionnalités MVP (Phase 1)

### 3.1 Authentification
- [ ] Connexion avec email/password (Supabase Auth)
- [ ] Gestion des sessions
- [ ] Page de login épurée

### 3.2 Dashboard Principal
- [ ] Liste des workspaces/sites configurés
- [ ] Statistiques globales (conversations, messages, satisfaction)
- [ ] Accès rapide à chaque workspace

### 3.3 Gestion des Workspaces (1 workspace = 1 site)
- [ ] Créer un nouveau workspace
- [ ] Configurer le nom, domaine autorisé, couleur d'accent
- [ ] Générer le script d'intégration
- [ ] Activer/Désactiver le chatbot

### 3.4 Gestion des Sources Documentaires
- [ ] Upload de fichiers (PDF, TXT, MD)
- [ ] Liste des documents indexés
- [ ] Supprimer/Remplacer un document
- [ ] Re-indexation manuelle
- [ ] Statut d'indexation (en cours, terminé, erreur)

### 3.5 Script d'Intégration
Générer un script unique par workspace, compatible avec :
- [ ] HTML statique (balise `<script>`)
- [ ] React/Next.js (composant ou script)
- [ ] Vue.js
- [ ] WordPress (shortcode ou plugin)

Exemple de script généré :
```html
<script src="https://monitora.example.com/widget.js" 
        data-workspace="ws_abc123"
        data-position="bottom-right">
</script>
```

### 3.6 Widget Chatbot (Injectable)
- [ ] Design personnalisable (couleur, position)
- [ ] Bouton flottant
- [ ] Fenêtre de chat responsive
- [ ] Mode sombre/clair automatique
- [ ] Animation d'ouverture/fermeture

### 3.7 Monitoring & Analytics
- [ ] Nombre de conversations par jour/semaine/mois
- [ ] Questions les plus posées
- [ ] Temps de réponse moyen
- [ ] Taux de satisfaction (si implémenté)
- [ ] Graphiques simples et épurés

### 3.8 Historique des Conversations
- [ ] Liste des conversations par workspace
- [ ] Détail d'une conversation (messages, timestamps)
- [ ] Recherche dans les conversations
- [ ] Export CSV

---

## 4. Fonctionnalités Phase 2 (Futures)

### 4.1 Personnalisation Avancée
- [ ] Personnalité du chatbot (ton, style de réponse)
- [ ] Messages de bienvenue personnalisés
- [ ] Réponses prédéfinies (FAQ rapides)
- [ ] Escalade vers humain (email/ticket)

### 4.2 Multi-LLM
- [ ] Choix du provider (Mistral, OpenAI, Groq, Ollama)
- [ ] Configuration par workspace

### 4.3 Intégrations
- [ ] Webhook sur nouvelle conversation
- [ ] API REST pour intégrations tierces
- [ ] Zapier/Make

### 4.4 White-label
- [ ] Domaine personnalisé pour le widget
- [ ] Logo personnalisé
- [ ] Suppression "Powered by MONITORA"

---

## 5. Architecture Technique

### 5.1 Stack Frontend (Interface Admin)
```
monitora/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Routes authentification
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Routes protégées
│   │   ├── workspaces/
│   │   ├── analytics/
│   │   └── settings/
│   └── layout.tsx
├── components/
│   ├── ui/                # Composants UI (design system)
│   └── features/          # Composants métier
├── lib/
│   ├── supabase.ts        # Client Supabase
│   └── api.ts             # Appels API
└── public/
    └── widget/            # Widget injectable
```

### 5.2 Stack Backend
- **Option A** : Réutiliser le backend FastAPI existant (recommandé)
- **Option B** : Supabase Edge Functions
- **Base de données** : Supabase (PostgreSQL)

### 5.3 Widget Injectable
```
widget/
├── monitora-widget.js     # Script principal (~50KB)
├── monitora-widget.css    # Styles inline
└── iframe.html            # Contenu du chat (isolation)
```

### 5.4 Schéma Base de Données (Supabase)

```sql
-- Organisations/Comptes
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces (1 par site)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    domain TEXT, -- domaine autorisé
    api_key TEXT UNIQUE DEFAULT gen_random_uuid(),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents sources
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'indexing', 'indexed', 'error'
    chunks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    indexed_at TIMESTAMPTZ
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    visitor_id TEXT, -- fingerprint ou session ID
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    messages_count INTEGER DEFAULT 0,
    satisfaction INTEGER -- 1-5
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics agrégées (pour performance)
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    conversations_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    UNIQUE(workspace_id, date)
);
```

---

## 6. Design System

### 6.1 Principes
- **Minimalisme** : Aucun élément superflu
- **Contraste** : Fond blanc, texte noir, accents subtils
- **Géométrie** : Angles droits, pas de border-radius
- **Typographie** : Inter ou SF Pro (system font)
- **Espacement** : Généreux, aéré

### 6.2 Palette de Couleurs
```css
:root {
    --background: #FFFFFF;
    --foreground: #000000;
    --muted: #F5F5F5;
    --border: #E5E5E5;
    --accent: #000000;
    --accent-hover: #333333;
    --success: #000000;
    --error: #DC2626;
}
```

### 6.3 Composants UI
- Boutons : Fond noir, texte blanc, pas de radius
- Inputs : Bordure fine noire, pas de radius
- Cards : Bordure fine, pas d'ombre, pas de radius
- Tables : Lignes séparées par bordures fines
- Icônes : Lucide Icons, stroke noir, pas de fill

### 6.4 Inspiration
- Apple.com
- Revolut Business
- Linear.app
- Vercel Dashboard
- Stripe Dashboard

---

## 7. Workflow Utilisateur

### 7.1 Onboarding
```
1. Inscription → 2. Créer premier workspace → 3. Upload documents 
→ 4. Copier script → 5. Coller sur site → 6. Tester
```

### 7.2 Usage quotidien
```
1. Login → 2. Dashboard (vue globale) → 3. Sélectionner workspace 
→ 4. Voir conversations/stats → 5. Gérer documents si besoin
```

---

## 8. Sécurité

- [ ] Authentification Supabase (JWT)
- [ ] Row Level Security (RLS) sur toutes les tables
- [ ] Validation des domaines autorisés pour le widget
- [ ] Rate limiting sur l'API
- [ ] CORS strict

---

## 9. Livrables Phase 1

| Livrable | Priorité | Statut |
|----------|----------|--------|
| Structure projet Next.js | P0 | 🔲 |
| Design System (composants UI) | P0 | 🔲 |
| Authentification Supabase | P0 | 🔲 |
| CRUD Workspaces | P0 | 🔲 |
| Upload documents | P0 | 🔲 |
| Génération script d'intégration | P0 | 🔲 |
| Widget injectable basique | P0 | 🔲 |
| Connexion au backend RAG existant | P0 | 🔲 |
| Dashboard analytics simple | P1 | 🔲 |
| Historique conversations | P1 | 🔲 |

---

## 10. Estimation Timeline

| Phase | Durée estimée |
|-------|---------------|
| Setup projet + Auth | 2 jours |
| Design System + UI | 3 jours |
| Gestion Workspaces | 2 jours |
| Gestion Documents | 2 jours |
| Widget Injectable | 3 jours |
| Analytics basiques | 2 jours |
| Tests + Polish | 2 jours |
| **Total MVP** | **~16 jours** |

---

## 11. Questions Ouvertes

1. **Pricing** : Freemium ? Nombre de workspaces limité ?
2. **Stockage** : Limite de documents par workspace ?
3. **LLM** : Un seul provider ou choix par workspace ?
4. **Branding** : Nom final validé ? Logo ?

---

*Document créé le 5 janvier 2026*
*Version 1.0*
