import axios from 'axios'
import type { ChatRequest, ChatResponse, HealthResponse } from '@/types/chat'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
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
   * Send a streaming chat message
   */
  async sendMessageStream(
    request: ChatRequest,
    onToken: (token: string, replace?: boolean) => void,
    onSources: (sources: any[]) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onAnalysis?: (analysis: any) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'token') {
                onToken(data.content)
              } else if (data.type === 'correction') {
                // Le backend a corrigé le texte (ex: email malformé)
                // On remplace tout le contenu par la version corrigée
                onToken(data.content, true) // true = replace all
              } else if (data.type === 'sources') {
                onSources(data.sources)
              } else if (data.type === 'done') {
                onComplete()
              } else if (data.type === 'error') {
                onError(data.message)
              } else if (data.type === 'analysis' && onAnalysis) {
                onAnalysis(data)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    }
  },

  /**
   * Check API health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health')
    return response.data
  },

  /**
   * Stream order tracking response with thinking effect
   */
  async streamOrderTracking(
    orderNumber: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinking?: (step: string) => void,
    onFinalResponse?: (content: string) => void,
    onAnalysis?: (analysis: any) => void
  ): Promise<void> {
    try {
      console.log('[streamOrderTracking] Starting request for order:', orderNumber)
      console.log('[streamOrderTracking] URL:', `${API_BASE_URL}/order/${orderNumber}/tracking/stream`)

      const response = await fetch(`${API_BASE_URL}/order/${orderNumber}/tracking/stream`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'text/event-stream',
          'ngrok-skip-browser-warning': 'true',
        },
      })

      console.log('[streamOrderTracking] Response status:', response.status)
      console.log('[streamOrderTracking] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const lines = buffer.split('\n')

        // Keep last incomplete line in buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking' && onThinking) {
                onThinking(data.content)
              } else if (data.type === 'final_response' && onFinalResponse) {
                onFinalResponse(data.content)
              } else if (data.type === 'token') {
                onToken(data.content)
              } else if (data.type === 'done') {
                onComplete()
              } else if (data.type === 'error') {
                onError(data.message)
              } else if (data.type === 'analysis' && onAnalysis) {
                onAnalysis(data)
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    }
  },

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    const response = await apiClient.get('/stats')
    return response.data
  },

  /**
   * Request tracking for Parallel Monitor
   */
  async trackRequestStart(question: string, sessionId?: string): Promise<string | null> {
    try {
      const response = await apiClient.post('/tracking/start', {
        question,
        session_id: sessionId,
        source: 'frontend'
      })
      return response.data.request_id
    } catch (error) {
      console.error('Track start error:', error)
      return null
    }
  },

  async trackRequestUpdate(requestId: string, status: string, responsePreview?: string, tokensCount?: number): Promise<void> {
    try {
      await apiClient.post('/tracking/update', {
        request_id: requestId,
        status,
        response_preview: responsePreview,
        tokens_count: tokensCount
      })
    } catch (error) {
      // Silently fail - tracking is not critical
    }
  },

  async trackRequestEnd(requestId: string, response?: string, success: boolean = true, errorMessage?: string): Promise<void> {
    try {
      await apiClient.post('/tracking/end', {
        request_id: requestId,
        response,
        success,
        error_message: errorMessage
      })
    } catch (error) {
      // Silently fail - tracking is not critical
    }
  },
}

export default apiClient
