import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour les tables
export interface Workspace {
  id: string
  user_id: string
  name: string
  domain: string | null
  api_key: string
  settings: WorkspaceSettings
  rag_config: RAGConfig
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

export interface RAGConfig {
  temperature: number
  max_tokens: number
  top_k: number
  chunk_size: number
  chunk_overlap: number
  llm_model: string
}

export interface Document {
  id: string
  workspace_id: string
  filename: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  status: 'pending' | 'indexing' | 'indexed' | 'error'
  chunks_count: number
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
