/**
 * Client API pour MONITORA
 * Supporte l'authentification via SQL Server et Supabase
 */

import { getAccessToken, authenticatedFetchJSON, authenticatedFetch } from './auth'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'

/**
 * Effectue une requête API avec authentification automatique
 */
async function fetchAPI<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  return authenticatedFetchJSON<T>(`/api${endpoint}`, options)
}

/**
 * Effectue une requête API publique (sans auth)
 */
async function fetchPublicAPI<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur serveur' }))
    throw new Error(error.detail || error.message || 'Erreur lors de la requête')
  }
  
  return res.json()
}

export const api = {
  // Workspaces
  workspaces: {
    list: () => fetchAPI('/workspaces'),
    get: (id: string) => fetchAPI(`/workspaces/${id}`),
    create: (data: { name: string; description?: string }) => 
      fetchAPI('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => 
      fetchAPI(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => 
      fetchAPI(`/workspaces/${id}`, { method: 'DELETE' }),
  },

  // Documents
  documents: {
    list: (workspaceId: string) => fetchAPI(`/documents/${workspaceId}`),
    upload: async (workspaceId: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const token = getAccessToken()
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const res = await fetch(`${API_URL}/api/documents/${workspaceId}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Erreur lors de l\'upload' }))
        throw new Error(error.detail || error.message || 'Erreur lors de l\'upload')
      }
      return res.json()
    },
    delete: (workspaceId: string, docId: string) => 
      fetchAPI(`/documents/${workspaceId}/${docId}`, { method: 'DELETE' }),
    reindex: (workspaceId: string) => 
      fetchAPI(`/documents/${workspaceId}/reindex`, { method: 'POST' }),
  },

  // Chat
  chat: {
    test: (workspaceId: string, message: string, history?: any[]) => 
      fetchAPI('/chat/test', { 
        method: 'POST', 
        body: JSON.stringify({ workspace_id: workspaceId, message, history }) 
      }),
  },

  // Analytics
  analytics: {
    get: (workspaceId: string) => fetchAPI(`/workspaces/${workspaceId}/analytics`),
    conversations: (workspaceId: string) => fetchAPI(`/workspaces/${workspaceId}/conversations`),
    overview: (workspaceId: string, period?: string) => 
      fetchAPI(`/workspaces/${workspaceId}/analytics/overview${period ? `?period=${period}` : ''}`),
  },

  // Conversations et Messages
  conversations: {
    list: (workspaceId: string) => fetchAPI(`/workspaces/${workspaceId}/conversations`),
    messages: (conversationId: string) => fetchAPI(`/conversations/${conversationId}/messages`),
  },

  // RAG Config
  ragConfig: {
    get: (workspaceId: string) => fetchAPI(`/workspaces/${workspaceId}/rag-config`),
    update: (workspaceId: string, config: any) => 
      fetchAPI(`/workspaces/${workspaceId}/rag-config`, { method: 'PATCH', body: JSON.stringify(config) }),
  },
  
  // Insights
  insights: {
    get: (workspaceId: string, days?: number) => 
      fetchAPI(`/insights/${workspaceId}${days ? `?days=${days}` : ''}`),
    recalculate: (workspaceId: string) => 
      fetchAPI(`/insights/${workspaceId}/recalculate`, { method: 'POST' }),
    resolve: (workspaceId: string, messageId: string) =>
      fetchAPI(`/insights/${workspaceId}/resolve/${messageId}`, { method: 'POST' }),
  },
  
  // Database config
  database: {
    get: (workspaceId: string) => fetchAPI(`/workspaces/${workspaceId}/database`),
    save: (workspaceId: string, config: any) =>
      fetchAPI(`/workspaces/${workspaceId}/database`, { method: 'POST', body: JSON.stringify(config) }),
    test: (workspaceId: string, config?: any) =>
      fetchAPI(`/workspaces/${workspaceId}/database/test`, { 
        method: 'POST', 
        body: config ? JSON.stringify(config) : undefined 
      }),
  },

  // Widget config
  widgetConfig: {
    update: (workspaceId: string, config: any) =>
      fetchAPI(`/workspaces/${workspaceId}/widget-config`, { method: 'PATCH', body: JSON.stringify(config) }),
  },
  
  // Widget (API publique)
  widget: {
    getConfig: (apiKey: string) => fetchPublicAPI(`/widget/config/${apiKey}`),
    chat: (apiKey: string, data: { message: string; conversation_id?: string; visitor_id?: string }) =>
      fetchPublicAPI(`/widget/chat/${apiKey}`, { method: 'POST', body: JSON.stringify(data) }),
  },
}
