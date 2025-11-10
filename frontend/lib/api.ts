import axios from 'axios'
import type { ChatRequest, ChatResponse, HealthResponse } from '@/types/chat'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for LLM responses
})

export const chatAPI = {
  /**
   * Send a chat message
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/chat', request)
    return response.data
  },

  /**
   * Check API health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health')
    return response.data
  },

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    const response = await apiClient.get('/stats')
    return response.data
  },
}

export default apiClient
