// =============================================================================
// MONITORA - Types TypeScript
// =============================================================================

// Types de base pour les IDs
export type UUID = string

// =============================================================================
// Database Types (générés depuis le schema)
// =============================================================================

export interface Organization {
  id: UUID
  name: string
  slug: string
  logo_url: string | null
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  max_workspaces: number
  max_documents_per_workspace: number
  max_conversations_per_month: number
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface User {
  id: UUID
  organization_id: UUID | null
  email: string
  name?: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// Alias for backwards compatibility
export type UserProfile = User

export interface WorkspaceSettings {
  bot_name: string
  welcome_message: string
  placeholder: string
  primary_color: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  language: string
}

export interface Workspace {
  id: UUID
  organization_id: UUID
  name: string
  description: string | null
  domain: string | null
  allowed_origins: string[]
  api_key: string
  settings: WorkspaceSettings
  backend_url: string | null
  backend_api_key: string | null
  is_active: boolean
  is_public: boolean
  total_conversations: number
  total_messages: number
  created_at: string
  updated_at: string
}

export type DocumentStatus = 'pending' | 'uploading' | 'indexing' | 'indexed' | 'error' | 'deleted'

export interface Document {
  id: UUID
  workspace_id: UUID
  filename: string
  original_name: string
  file_path: string
  file_type: 'pdf' | 'txt' | 'md' | 'docx'
  file_size: number
  mime_type: string | null
  status: DocumentStatus
  error_message: string | null
  chunks_count: number
  indexed_at: string | null
  indexing_started_at: string | null
  uploaded_by: UUID | null
  created_at: string
  updated_at: string
}

export type ConversationStatus = 'active' | 'ended' | 'archived'

export interface Conversation {
  id: UUID
  workspace_id: UUID
  visitor_id: string
  visitor_ip: string | null
  visitor_country: string | null
  visitor_city: string | null
  user_agent: string | null
  page_url: string | null
  referrer: string | null
  started_at: string
  ended_at: string | null
  last_message_at: string
  messages_count: number
  user_messages_count: number
  bot_messages_count: number
  avg_response_time_ms: number | null
  satisfaction: number | null
  feedback_text: string | null
  status: ConversationStatus
  created_at: string
  updated_at: string
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface MessageSource {
  document_id: string
  chunk_id: string
  filename: string
  content: string
  score: number
}

export interface Message {
  id: UUID
  conversation_id: UUID
  role: MessageRole
  content: string
  sources: MessageSource[] | null
  confidence_score: number | null
  response_time_ms: number | null
  tokens_prompt: number | null
  tokens_completion: number | null
  is_helpful: boolean | null
  created_at: string
}

export interface AnalyticsDaily {
  id: UUID
  workspace_id: UUID
  date: string
  conversations_count: number
  unique_visitors: number
  returning_visitors: number
  messages_count: number
  user_messages_count: number
  bot_messages_count: number
  avg_response_time_ms: number | null
  avg_messages_per_conversation: number | null
  avg_conversation_duration_seconds: number | null
  satisfaction_sum: number
  satisfaction_count: number
  total_tokens: number
  created_at: string
  updated_at: string
}

export interface AnalyticsQuestion {
  id: UUID
  workspace_id: UUID
  question_pattern: string
  sample_question: string | null
  occurrences: number
  avg_satisfaction: number | null
  avg_response_time_ms: number | null
  first_asked_at: string
  last_asked_at: string
  created_at: string
  updated_at: string
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface Invitation {
  id: UUID
  organization_id: UUID
  email: string
  role: 'admin' | 'member' | 'viewer'
  token: string
  invited_by: UUID | null
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface AuditLog {
  id: UUID
  organization_id: UUID | null
  user_id: UUID | null
  action: string
  entity_type: string
  entity_id: UUID | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// =============================================================================
// Views Types
// =============================================================================

export interface WorkspaceStats {
  workspace_id: UUID
  workspace_name: string
  organization_id: UUID
  total_conversations: number
  total_messages: number
  is_active: boolean
  documents_indexed: number
  conversations_today: number
  conversations_week: number
}

export interface OrganizationOverview {
  organization_id: UUID
  organization_name: string
  plan: string
  workspaces_count: number
  members_count: number
  total_conversations: number
  total_messages: number
}

// =============================================================================
// API Types
// =============================================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// =============================================================================
// Form Types
// =============================================================================

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  password: string
  full_name: string
  organization_name?: string
}

export interface CreateWorkspaceForm {
  name: string
  description?: string
  domain?: string
  settings?: Partial<WorkspaceSettings>
}

export interface UpdateWorkspaceForm {
  name?: string
  description?: string
  domain?: string
  allowed_origins?: string[]
  settings?: Partial<WorkspaceSettings>
  backend_url?: string
  is_active?: boolean
}

// =============================================================================
// UI State Types
// =============================================================================

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export interface ModalState {
  isOpen: boolean
  type: string | null
  data?: unknown
}

// =============================================================================
// Widget Types
// =============================================================================

export interface WidgetConfig {
  workspace_id: string
  api_key: string
  bot_name: string
  welcome_message: string
  placeholder: string
  primary_color: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  language: string
}

export interface WidgetMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: MessageSource[]
}

// =============================================================================
// RAG Configuration Types
// =============================================================================

export type LLMProvider = 'mistral' | 'groq' | 'openai' | 'ollama'

export interface WorkspaceRAGConfig {
  id: UUID
  workspace_id: UUID
  
  // LLM Configuration
  llm_provider: LLMProvider
  llm_model: string
  temperature: number
  max_tokens: number
  top_p: number
  
  // Chunking Configuration
  chunk_size: number
  chunk_overlap: number
  
  // Retrieval Configuration
  top_k: number
  rerank_top_n: number
  
  // Cache Configuration
  enable_cache: boolean
  cache_ttl: number
  similarity_threshold: number
  
  // Embedding Configuration
  embedding_model: string
  
  // Prompts
  system_prompt: string
  context_template: string
  
  created_at: string
  updated_at: string
}

// Default RAG Config values (same as CoolLibri chatbot)
export const DEFAULT_RAG_CONFIG: Omit<WorkspaceRAGConfig, 'id' | 'workspace_id' | 'created_at' | 'updated_at'> = {
  llm_provider: 'mistral',
  llm_model: 'mistral-small-latest',
  temperature: 0.1,
  max_tokens: 900,
  top_p: 1.0,
  chunk_size: 1500,
  chunk_overlap: 300,
  top_k: 8,
  rerank_top_n: 5,
  enable_cache: true,
  cache_ttl: 7200,
  similarity_threshold: 0.92,
  embedding_model: 'intfloat/multilingual-e5-large',
  system_prompt: 'Tu es un assistant virtuel serviable et précis. Réponds aux questions en utilisant uniquement les informations fournies dans le contexte. Si tu ne connais pas la réponse, dis-le clairement.',
  context_template: 'Voici les informations pertinentes:\n\n{context}\n\nQuestion: {question}',
}

// RAG Config constraints for UI validation
export const RAG_CONFIG_CONSTRAINTS = {
  temperature: { min: 0, max: 1, step: 0.05 },
  max_tokens: { min: 100, max: 4000, step: 100 },
  top_p: { min: 0, max: 1, step: 0.05 },
  chunk_size: { min: 500, max: 3000, step: 100 },
  chunk_overlap: { min: 50, max: 500, step: 50 },
  top_k: { min: 3, max: 15, step: 1 },
  rerank_top_n: { min: 2, max: 10, step: 1 },
  cache_ttl: { min: 300, max: 86400, step: 300 },
  similarity_threshold: { min: 0.8, max: 0.98, step: 0.01 },
}

// Available LLM models per provider
export const LLM_MODELS: Record<LLMProvider, { value: string; label: string }[]> = {
  mistral: [
    { value: 'mistral-small-latest', label: 'Mistral Small (rapide)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium (équilibré)' },
    { value: 'mistral-large-latest', label: 'Mistral Large (précis)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (rapide)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (économique)' },
    { value: 'gpt-4o', label: 'GPT-4o (puissant)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
  ollama: [
    { value: 'mistral:latest', label: 'Mistral (local)' },
    { value: 'llama3:latest', label: 'Llama 3 (local)' },
    { value: 'phi3:latest', label: 'Phi-3 (local)' },
  ],
}

// =============================================================================
// Analytics Types
// =============================================================================

export interface DashboardStats {
  total_conversations: number
  total_messages: number
  active_workspaces: number
  avg_satisfaction: number
  conversations_change: number // % change from previous period
  messages_change: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface TopQuestion {
  question: string
  count: number
  avg_satisfaction: number | null
}
