# Lib - Utilitaires et Clients

## Description
Fonctions utilitaires, clients API, et configuration.

---

## Fichiers à créer

### `supabase.ts`
Client Supabase pour l'authentification et les requêtes.

- [ ] Créer le client avec les env variables
- [ ] Export du client
- [ ] Helpers pour auth (getUser, signIn, signOut)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### `api.ts`
Appels vers le backend Python.

- [ ] URL de base configurable
- [ ] Fonctions pour chaque endpoint
- [ ] Gestion des erreurs
- [ ] Ajout automatique du token auth

```typescript
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'

export const api = {
  workspaces: {
    list: () => fetch(`${API_URL}/api/workspaces`),
    create: (data) => fetch(`${API_URL}/api/workspaces`, { method: 'POST', body: JSON.stringify(data) }),
    // ...
  },
  documents: {
    upload: (workspaceId, file) => { /* multipart */ },
    // ...
  },
  chat: {
    test: (workspaceId, message) => { /* ... */ },
  },
}
```

---

### `utils.ts`
Fonctions utilitaires.

- [ ] `cn()` - Merge des classes Tailwind
- [ ] `formatDate()` - Formater les dates
- [ ] `copyToClipboard()` - Copier dans le presse-papier
- [ ] `generateId()` - Générer un ID unique

---

### `types.ts`
Types TypeScript partagés.

```typescript
interface Workspace {
  id: string
  name: string
  domain: string
  api_key: string
  is_active: boolean
  settings: WorkspaceSettings
  created_at: string
}

interface Document {
  id: string
  filename: string
  status: 'pending' | 'indexing' | 'indexed' | 'error'
  chunks_count: number
  created_at: string
}

interface Conversation {
  id: string
  visitor_id: string
  messages_count: number
  started_at: string
  satisfaction?: number
}

interface RAGConfig {
  temperature: number
  max_tokens: number
  top_k: number
  chunk_size: number
  chunk_overlap: number
  llm_model: string
}

interface WorkspaceSettings {
  color_accent: string
  position: 'bottom-right' | 'bottom-left'
  welcome_message: string
  chatbot_name: string
}
```

---

### `hooks/use-auth.ts`
Hook pour gérer l'authentification.

- [ ] État de l'utilisateur
- [ ] Méthodes login/logout
- [ ] Vérification de session

---

### `hooks/use-workspaces.ts`
Hook pour gérer les workspaces.

- [ ] Fetch des workspaces
- [ ] État de chargement
- [ ] Refresh

---

## Étapes d'implémentation

1. [ ] Créer `supabase.ts`
2. [ ] Créer `utils.ts` avec `cn()`
3. [ ] Créer `types.ts`
4. [ ] Créer `api.ts`
5. [ ] Créer les hooks
