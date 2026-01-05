# (dashboard) - Routes protégées

## Description
Routes protégées nécessitant une authentification.
Le layout vérifie la session et redirige vers `/login` si non connecté.

---

## Structure des pages

```
(dashboard)/
├── layout.tsx              # Layout avec sidebar + vérification auth
├── page.tsx                # Dashboard principal (redirect vers /workspaces)
├── workspaces/
│   ├── page.tsx            # Liste des workspaces
│   ├── new/page.tsx        # Créer un workspace
│   └── [id]/
│       ├── page.tsx        # Détail du workspace
│       ├── documents/page.tsx  # Gestion documents
│       ├── analytics/page.tsx  # Stats du workspace
│       └── settings/page.tsx   # Paramètres du workspace
└── settings/
    └── page.tsx            # Paramètres du compte
```

---

## Pages à créer

### `layout.tsx` - Layout Dashboard
- [ ] Sidebar avec navigation
- [ ] Header avec nom utilisateur + logout
- [ ] Zone de contenu principale
- [ ] Vérification de la session
- [ ] Responsive (sidebar cachée sur mobile)

### `/page.tsx` - Dashboard principal
- [ ] Redirect vers `/workspaces` ou afficher stats globales
- [ ] Cards avec métriques clés
- [ ] Liens rapides vers les workspaces

### `/workspaces/page.tsx` - Liste des workspaces
- [ ] Grid de cards (un card par workspace)
- [ ] Bouton "Créer un workspace"
- [ ] Indicateur actif/inactif
- [ ] Nombre de conversations récentes
- [ ] Clic pour aller au détail

### `/workspaces/new/page.tsx` - Créer workspace
- [ ] Formulaire : nom, domaine autorisé
- [ ] Bouton créer
- [ ] Redirect vers le workspace créé

### `/workspaces/[id]/page.tsx` - Détail workspace
- [ ] Onglets : Aperçu, Documents, Analytics, Paramètres
- [ ] Script d'intégration à copier
- [ ] Panel de test du chatbot
- [ ] Stats rapides

### `/workspaces/[id]/documents/page.tsx`
- [ ] Zone d'upload drag & drop
- [ ] Liste des documents avec statut
- [ ] Actions : supprimer, réindexer

### `/workspaces/[id]/analytics/page.tsx`
- [ ] Graphique conversations par jour
- [ ] Métriques : total conversations, messages, temps moyen
- [ ] Questions les plus posées
- [ ] Historique des conversations

### `/workspaces/[id]/settings/page.tsx`
- [ ] Modifier nom et domaine
- [ ] Configuration RAG (température, etc.)
- [ ] Personnalisation visuelle du widget
- [ ] Activer/Désactiver le workspace
- [ ] Supprimer le workspace

---

## Composants à utiliser
- `Sidebar` (navigation)
- `WorkspaceCard` (card workspace)
- `DocumentList` (liste documents)
- `UploadZone` (drag & drop)
- `ChatTestPanel` (test chatbot)
- `RAGConfigPanel` (config RAG)
- `AnalyticsChart` (graphiques)
- `ConversationList` (historique)

---

## Étapes d'implémentation

1. [ ] Créer `layout.tsx` avec sidebar
2. [ ] Créer la page liste workspaces
3. [ ] Créer le formulaire création workspace
4. [ ] Créer la page détail workspace avec onglets
5. [ ] Créer la section documents
6. [ ] Créer la section analytics
7. [ ] Créer la section paramètres
