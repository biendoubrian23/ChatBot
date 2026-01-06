'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, ChevronDown, ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  feedback?: 1 | -1 | null
}

interface ChatWidgetPreviewProps {
  botName?: string
  welcomeMessage?: string
  accentColor?: string
  showInPhone?: boolean
  workspaceId?: string  // Pour appeler le vrai backend
  widgetWidth?: number
  widgetHeight?: number
}

// Fonction helper pour ajuster la couleur (plus sombre)
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function ChatWidgetPreview({
  botName = 'Assistant',
  welcomeMessage = 'Bonjour ! 👋 Comment puis-je vous aider aujourd\'hui ?',
  accentColor = '#6366f1',
  showInPhone = false,
  workspaceId,
  widgetWidth = 360,
  widgetHeight = 500
}: ChatWidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(showInPhone ? true : false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: welcomeMessage, feedback: null }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage, feedback: null }])
    setIsLoading(true)

    // Si pas de workspaceId, mode prévisualisation simple
    if (!workspaceId) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Je suis en mode prévisualisation. Configurez un workspace pour tester les vraies réponses.', 
          feedback: null 
        }])
        setIsLoading(false)
      }, 500)
      return
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/widget/${workspaceId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            session_id: sessionId,
            stream: false
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.session_id)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response, 
          feedback: null 
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Désolé, une erreur est survenue. Veuillez réessayer.', 
          feedback: null 
        }])
      }
    } catch (error) {
      console.error('Erreur chat:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Impossible de contacter le serveur. Vérifiez que le backend est en cours d\'exécution.', 
        feedback: null 
      }])
    }

    setIsLoading(false)
  }

  const handleFeedback = (index: number, value: 1 | -1) => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, feedback: msg.feedback === value ? null : value } : msg
    ))
  }

  // Si mode phone, afficher PhoneMockup
  if (showInPhone) {
    return (
      <div className="relative mx-auto" style={{ width: '300px' }}>
        {/* Phone Frame */}
        <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />
          
          {/* Screen */}
          <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ height: '580px' }}>
            {/* Status Bar */}
            <div className="h-12 bg-gray-100 flex items-center justify-between px-8 pt-2">
              <span className="text-xs font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2.5 flex gap-0.5">
                  <div className="flex-1 bg-gray-900 rounded-sm" />
                  <div className="flex-1 bg-gray-900 rounded-sm" />
                  <div className="flex-1 bg-gray-900 rounded-sm" />
                  <div className="flex-1 bg-gray-300 rounded-sm" />
                </div>
                <div className="w-6 h-3 border border-gray-900 rounded-sm relative">
                  <div className="absolute inset-0.5 bg-gray-900 rounded-sm" style={{ width: '70%' }} />
                </div>
              </div>
            </div>
            
            {/* Chat Content */}
            <div className="flex flex-col h-[calc(100%-3rem)]">
              {/* Header */}
              <div 
                className="px-4 py-3 flex items-center gap-3"
                style={{ 
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -20)} 100%)` 
                }}
              >
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{botName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    <p className="text-xs text-white/80">En ligne</p>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <ChevronDown className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex w-full',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div 
                        className="w-7 h-7 rounded-full flex-shrink-0 mr-2 flex items-center justify-center"
                        style={{ backgroundColor: accentColor }}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      'flex flex-col',
                      msg.role === 'user' ? 'items-end max-w-[85%]' : 'items-start max-w-[85%]'
                    )}>
                      <div
                        className={cn(
                          'px-3 py-2 text-sm break-words',
                          msg.role === 'user' 
                            ? 'bg-gray-900 text-white rounded-2xl rounded-br-md'
                            : 'bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
                        )}
                      >
                        {msg.content}
                      </div>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-1 ml-1">
                          <button
                            onClick={() => handleFeedback(i, 1)}
                            className={cn(
                              'p-1 rounded transition-colors',
                              msg.feedback === 1 
                                ? 'text-green-600 bg-green-50' 
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            )}
                          >
                            <ThumbsUp size={10} />
                          </button>
                          <button
                            onClick={() => handleFeedback(i, -1)}
                            className={cn(
                              'p-1 rounded transition-colors',
                              msg.feedback === -1 
                                ? 'text-red-600 bg-red-50' 
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            )}
                          >
                            <ThumbsDown size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Indicateur de chargement */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div 
                      className="w-7 h-7 rounded-full flex-shrink-0 mr-2 flex items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                    placeholder="Écrivez votre message..."
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                    style={{ backgroundColor: input.trim() && !isLoading ? accentColor : '#e5e7eb' }}
                  >
                    <Send className={cn("w-4 h-4", input.trim() && !isLoading ? 'text-white' : 'text-gray-400')} />
                  </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                  Propulsé par <span className="font-medium text-gray-500">MONITORA</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Reflet */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-gray-900/10 rounded-full blur-xl" />
      </div>
    )
  }

  // Mode Widget flottant (directement dans le return, pas dans une fonction)
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <div 
        className={cn(
          'absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 origin-bottom-right',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        )}
        style={{ width: `${widgetWidth}px` }}
      >
        {/* Header avec dégradé */}
        <div 
          className="px-5 py-4 flex items-center justify-between"
          style={{ 
            background: `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -20)} 100%)` 
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{botName}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-xs text-white/80">En ligne</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div 
          className="overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white"
          style={{ height: `${widgetHeight - 140}px` }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex w-full',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div 
                  className="w-8 h-8 rounded-full flex-shrink-0 mr-2 flex items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn(
                'flex flex-col',
                msg.role === 'user' ? 'items-end max-w-[75%]' : 'items-start max-w-[75%]'
              )}>
                <div
                  className={cn(
                    'px-4 py-2.5 text-sm leading-relaxed break-words',
                    msg.role === 'user' 
                      ? 'bg-gray-900 text-white rounded-2xl rounded-br-md'
                      : 'bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
                  )}
                >
                  {msg.content}
                </div>
                {/* Boutons feedback pour les messages assistant */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1 ml-1">
                    <button
                      onClick={() => handleFeedback(i, 1)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        msg.feedback === 1 
                          ? 'text-green-600 bg-green-50' 
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      )}
                      title="Réponse utile"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => handleFeedback(i, -1)}
                      className={cn(
                        'p-1 rounded transition-colors',
                        msg.feedback === -1 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      )}
                      title="Réponse non utile"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Indicateur de chargement */}
          {isLoading && (
            <div className="flex justify-start">
              <div 
                className="w-8 h-8 rounded-full flex-shrink-0 mr-2 flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder="Écrivez votre message..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: input.trim() && !isLoading ? accentColor : '#e5e7eb'
              }}
            >
              <Send className={cn(
                "w-4 h-4 transition-colors",
                input.trim() && !isLoading ? 'text-white' : 'text-gray-400'
              )} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            Propulsé par <span className="font-medium text-gray-500">MONITORA</span>
          </p>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105',
          isOpen ? 'rotate-0' : 'rotate-0'
        )}
        style={{ 
          background: `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, -20)} 100%)` 
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  )
}
