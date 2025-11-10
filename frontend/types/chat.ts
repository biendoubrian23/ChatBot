export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: SourceDocument[]
}

export interface SourceDocument {
  content: string
  metadata: Record<string, any>
  relevance_score?: number
}

export interface ChatRequest {
  question: string
  conversation_id?: string
}

export interface ChatResponse {
  answer: string
  sources: SourceDocument[]
  conversation_id: string
  timestamp: string
  processing_time?: number
}

export interface HealthResponse {
  status: string
  version: string
  ollama_available: boolean
  vectorstore_loaded: boolean
}
