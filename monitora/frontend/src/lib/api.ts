const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur serveur' }))
    throw new Error(error.message || 'Erreur lors de la requête')
  }
  
  return res.json()
}

export const api = {
  // Workspaces
  workspaces: {
    list: () => fetchAPI('/api/workspaces'),
    get: (id: string) => fetchAPI(`/api/workspaces/${id}`),
    create: (data: { name: string; domain?: string }) => 
      fetchAPI('/api/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => 
      fetchAPI(`/api/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => 
      fetchAPI(`/api/workspaces/${id}`, { method: 'DELETE' }),
  },

  // Documents
  documents: {
    list: (workspaceId: string) => fetchAPI(`/api/workspaces/${workspaceId}/documents`),
    upload: async (workspaceId: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/documents/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) throw new Error('Erreur lors de l\'upload')
      return res.json()
    },
    delete: (workspaceId: string, docId: string) => 
      fetchAPI(`/api/workspaces/${workspaceId}/documents/${docId}`, { method: 'DELETE' }),
    reindex: (workspaceId: string) => 
      fetchAPI(`/api/workspaces/${workspaceId}/reindex`, { method: 'POST' }),
  },

  // Chat
  chat: {
    test: (workspaceId: string, message: string, history?: any[]) => 
      fetchAPI('/api/test/chat', { 
        method: 'POST', 
        body: JSON.stringify({ workspace_id: workspaceId, message, history }) 
      }),
  },

  // Analytics
  analytics: {
    get: (workspaceId: string) => fetchAPI(`/api/workspaces/${workspaceId}/analytics`),
    conversations: (workspaceId: string) => fetchAPI(`/api/workspaces/${workspaceId}/conversations`),
  },

  // RAG Config
  ragConfig: {
    get: (workspaceId: string) => fetchAPI(`/api/workspaces/${workspaceId}/rag-config`),
    update: (workspaceId: string, config: any) => 
      fetchAPI(`/api/workspaces/${workspaceId}/rag-config`, { method: 'PUT', body: JSON.stringify(config) }),
  },
}
