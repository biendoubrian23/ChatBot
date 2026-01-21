/**
 * Types pour l'application MONITORA
 * Note: Supabase a été remplacé par SQL Server
 * Ce fichier ne contient que les types pour la compatibilité
 */

// Types pour les tables
export interface Workspace {
  id: string
  user_id: string
  name: string
  domain: string | null
  api_key: string
  settings: WorkspaceSettings
  rag_config: RAGConfig
  widget_config?: WidgetConfig
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkspaceSettings {
  color_accent: string
  position: 'bottom-right' | 'bottom-left'
  welcome_message: string
  chatbot_name: string
}

export interface WidgetConfig {
  color_accent: string
  position: 'bottom-right' | 'bottom-left'
  welcome_message: string
  chatbot_name: string
  width?: number
  height?: number
  placeholder?: string
  branding_text?: string
}

export interface RAGConfig {
  temperature: number
  max_tokens: number
  top_k: number
  chunk_size: number
  chunk_overlap: number
  llm_model: string
  llm_provider?: string
  system_prompt?: string
  streaming_enabled?: boolean
}

export interface Document {
  id: string
  workspace_id: string
  filename: string
  file_path: string
  file_size: number | null
  file_type: string | null
  status: 'pending' | 'processing' | 'indexed' | 'error'
  chunk_count: number
  error_message: string | null
  created_at: string
  indexed_at: string | null
}

export interface Conversation {
  id: string
  workspace_id: string
  visitor_id: string | null
  started_at: string
  ended_at: string | null
  messages_count: number
  satisfaction: number | null
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources: any | null
  response_time_ms: number | null
  rag_score: number | null
  feedback: number | null
  is_resolved: boolean
  created_at: string
}

export interface InsightsCache {
  id: string
  workspace_id: string
  satisfaction_rate: number | null
  avg_rag_score: number | null
  avg_messages_per_conversation: number
  low_confidence_count: number
  total_conversations: number
  total_messages: number
  calculated_at: string
}

export interface MessageTopic {
  id: string
  workspace_id: string
  topic_name: string
  message_count: number
  sample_questions: string[]
  last_updated: string
}
