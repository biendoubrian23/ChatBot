# MONITORA - Frontend (Next.js 15)

## Description
Interface d'administration pour la plateforme MONITORA. Permet de gérer les workspaces, documents, et visualiser les analytics.

## Port par défaut
- **Développement** : 3001

---

## Stack technique
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- Lucide Icons

---

## Structure des dossiers

```
frontend/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── (auth)/             # Routes publiques (login, register)
│   │   ├── (dashboard)/        # Routes protégées (après login)
│   │   └── api/                # API Routes Next.js (optionnel)
│   ├── components/
│   │   ├── ui/                 # Composants UI réutilisables
│   │   └── features/           # Composants métier
│   └── lib/
│       ├── supabase.ts         # Client Supabase
│       ├── api.ts              # Appels vers le backend Python
│       └── utils.ts            # Fonctions utilitaires
├── public/
│   └── widget/                 # Widget injectable
├── .env.local                  # Variables d'environnement
└── tailwind.config.ts          # Config Tailwind
```

---

## Étapes d'implémentation

### Phase 1 - Setup projet
- [ ] Créer projet Next.js 15 avec TypeScript
- [ ] Configurer Tailwind CSS
- [ ] Créer le layout principal
- [ ] Configurer les fonts (Inter)
- [ ] Créer le fichier `.env.local`

### Phase 2 - Design System
- [ ] Créer les composants UI de base (Button, Input, Card)
- [ ] Appliquer le style minimaliste (noir/blanc, angles droits)
- [ ] Créer les variantes de composants
- [ ] Tester les composants isolément

### Phase 3 - Authentification
- [ ] Configurer Supabase Client
- [ ] Créer page `/login`
- [ ] Créer page `/register`
- [ ] Créer middleware de protection des routes
- [ ] Gérer la session utilisateur
- [ ] Créer page `/logout`

### Phase 4 - Dashboard principal
- [ ] Créer layout du dashboard avec sidebar
- [ ] Page d'accueil avec liste des workspaces
- [ ] Stats globales (nombre total de conversations, etc.)
- [ ] Navigation entre les sections

### Phase 5 - Gestion des Workspaces
- [ ] Liste des workspaces en cards
- [ ] Formulaire de création de workspace
- [ ] Page détail d'un workspace
- [ ] Édition du workspace
- [ ] Suppression du workspace
- [ ] Affichage du script d'intégration

### Phase 6 - Gestion des Documents
- [ ] Upload de fichiers (drag & drop)
- [ ] Liste des documents avec statut
- [ ] Bouton de suppression
- [ ] Bouton de réindexation
- [ ] Indicateur de progression

### Phase 7 - Panel de Test
- [ ] Interface de chat intégrée au dashboard
- [ ] Affichage des sources utilisées
- [ ] Configuration RAG éditable

### Phase 8 - Analytics
- [ ] Graphiques simples (conversations par jour)
- [ ] Métriques clés
- [ ] Liste des conversations récentes
- [ ] Détail d'une conversation

### Phase 9 - Personnalisation Widget
- [ ] Éditeur de couleurs
- [ ] Prévisualisation en temps réel
- [ ] Position du widget (bottom-right, bottom-left)
- [ ] Message de bienvenue personnalisé

---

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

---

## Commandes

```bash
cd monitora/frontend
npm install
npm run dev
```

---

## Design System - Résumé

### Couleurs
- Background: `#FFFFFF`
- Text: `#000000`
- Muted: `#F5F5F5`
- Border: `#E5E5E5`
- Accent: `#000000`

### Composants
- Boutons: Fond noir, texte blanc, pas de border-radius
- Inputs: Bordure fine noire, pas de border-radius
- Cards: Bordure fine, pas d'ombre
- Tables: Lignes séparées par bordures
