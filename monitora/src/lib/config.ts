/**
 * Frontend Configuration
 * Environment-aware configuration for MONITORA frontend
 */

// Backend API URL (RAG Pipeline)
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

// Supabase Configuration (from environment)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// API Endpoints
export const API_ENDPOINTS = {
  // Widget endpoints
  widgetChat: `${BACKEND_API_URL}/api/widget/chat`,
  widgetConfig: (workspaceId: string) => `${BACKEND_API_URL}/api/widget/config/${workspaceId}`,
  
  // RAG Configuration (dashboard)
  ragConfig: (workspaceId: string) => `${BACKEND_API_URL}/api/workspaces/${workspaceId}/rag-config`,
  
  // Documents (dashboard)
  documents: (workspaceId: string) => `${BACKEND_API_URL}/api/workspaces/${workspaceId}/documents`,
  documentUpload: (workspaceId: string) => `${BACKEND_API_URL}/api/workspaces/${workspaceId}/documents/upload`,
  
  // Reindex
  reindex: (workspaceId: string) => `${BACKEND_API_URL}/api/workspaces/${workspaceId}/reindex`,
  
  // Test chat (for dashboard - without API key requirement)
  testChat: `${BACKEND_API_URL}/api/test/chat`,
};

// Default configuration values
export const DEFAULT_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFileTypes: ['.pdf', '.docx', '.txt', '.md'],
  maxDocumentsPerWorkspace: 50,
};
