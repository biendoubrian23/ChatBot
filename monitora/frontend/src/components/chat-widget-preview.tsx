'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatWidgetPreviewProps {
  botName?: string
  welcomeMessage?: string
  accentColor?: string
}

export function ChatWidgetPreview({
  botName = 'Assistant',
  welcomeMessage = 'Bonjour ! Comment puis-je vous aider ?',
  accentColor = '#000000'
}: ChatWidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: welcomeMessage }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    
    setMessages([
      ...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: 'Ceci est une prévisualisation. Le chatbot répondra ici.' }
    ])
    setInput('')
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <div className={cn(
        'absolute bottom-16 right-0 w-80 bg-white border border-gray-200 shadow-xl transition-all duration-200 origin-bottom-right',
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
      )}>
        {/* Header */}
        <div 
          className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{botName}</p>
              <p className="text-xs text-white/70">En ligne</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[80%] px-3 py-2 text-sm',
                msg.role === 'user' 
                  ? 'ml-auto bg-gray-100 text-gray-900'
                  : 'bg-gray-900 text-white'
              )}
            >
              {msg.content}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Tapez votre message..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-900"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-gray-900 text-white hover:bg-gray-800"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Badge */}
        <div className="absolute -top-8 left-0 right-0 flex justify-center">
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 border border-yellow-200">
            Prévisualisation
          </span>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: accentColor }}
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
