'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Trash2,
  Loader2,
  Bot,
  User,
  FileText,
  Clock,
  RefreshCw,
  Settings,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/ui'
import { API_ENDPOINTS } from '@/lib/config'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    content: string
    source: string
    score: number
  }>
  processingTime?: number
  configUsed?: {
    llm_provider: string
    llm_model: string
    temperature: number
    top_k: number
    rerank_top_n: number
  }
}

interface ChatTestPanelProps {
  workspaceId: string
  backendUrl?: string
}

export function ChatTestPanel({ workspaceId, backendUrl }: ChatTestPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Build history for context
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Call backend API
      const response = await fetch(API_ENDPOINTS.testChat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          workspace_id: workspaceId,
          history,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources,
        processingTime: data.processing_time,
        configUsed: data.config_used,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Vérifiez que le backend est en cours d\'exécution.',
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function clearChat() {
    setMessages([])
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Test du chatbot
          </h2>
          <p className="text-sm text-muted-foreground">
            Testez les réponses avec votre configuration actuelle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            leftIcon={<Settings className="h-4 w-4" />}
          >
            {showConfig ? 'Masquer config' : 'Voir config'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Effacer
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium mb-1">Testez votre chatbot</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Posez une question pour voir comment votre chatbot répond 
              avec la configuration actuelle.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {/* Message */}
              <div
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Metadata for assistant messages */}
              {message.role === 'assistant' && (message.sources || message.processingTime) && (
                <div className="ml-11 space-y-2">
                  {/* Processing time */}
                  {message.processingTime && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Temps de réponse: {message.processingTime.toFixed(2)}s</span>
                    </div>
                  )}

                  {/* Config used */}
                  {showConfig && message.configUsed && (
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default">
                        {message.configUsed.llm_provider}
                      </Badge>
                      <Badge variant="default">
                        {message.configUsed.llm_model}
                      </Badge>
                      <Badge variant="default">
                        temp: {message.configUsed.temperature}
                      </Badge>
                      <Badge variant="default">
                        top_k: {message.configUsed.top_k}
                      </Badge>
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {message.sources.length} source(s) utilisée(s)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {message.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-muted/50 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{source.source}</span>
                              <Badge variant="default" className="text-xs">
                                {(source.score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">
                              {source.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Réflexion en cours...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez une question pour tester..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-200 focus:border-black focus:outline-none disabled:opacity-50"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="px-6"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Les messages de test ne sont pas enregistrés dans l'historique des conversations.
        </p>
      </div>
    </div>
  )
}
