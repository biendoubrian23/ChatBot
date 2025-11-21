'use client'

import { motion } from 'framer-motion'
import type { Message } from '@/types/chat'

interface MessageBubbleProps {
  message: Message
  hideAvatar?: boolean
}

function formatMessageContent(content: string): JSX.Element {
  // Convertir le markdown simple en HTML
  let formatted = content
    // Gras **texte**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Emoji et icônes
    .replace(/📅/g, '<span class="text-lg">📅</span>')
    .replace(/🚚/g, '<span class="text-lg">🚚</span>')
    .replace(/📁/g, '<span class="text-lg">📁</span>')
    .replace(/😊/g, '<span class="text-lg">😊</span>')
    .replace(/⚡/g, '<span class="text-lg">⚡</span>')
    .replace(/⏱️/g, '<span class="text-lg">⏱️</span>')

  // Séparer en lignes et traiter les titres
  const lines = formatted.split('\n').map((line, idx) => {
    // Titres avec emojis
    if (line.match(/^(📅|🚚|📁)\s*\*\*(.*?)\*\*/)) {
      return `<div key="${idx}" class="font-semibold text-base mt-3 mb-2">${line}</div>`
    }
    // Lignes normales
    if (line.trim()) {
      return `<div key="${idx}" class="mb-1">${line}</div>`
    }
    return `<div key="${idx}" class="h-2"></div>`
  }).join('')

  return <div dangerouslySetInnerHTML={{ __html: lines }} />
}

export default function MessageBubble({ message, hideAvatar = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
    >
      {!isUser && !hideAvatar && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-md">
          LA
        </div>
      )}

      <div className={`flex-1 ${isUser ? 'max-w-[75%]' : 'max-w-[85%]'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none ml-auto shadow-md'
              : 'bg-white text-gray-800 rounded-tl-none shadow-md border border-gray-100'
          }`}
        >
          {!isUser && message.content === '...' ? (
            // Animation de chargement
            <div className="flex space-x-2 py-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              {isUser ? (
                <p>{message.content}</p>
              ) : (
                formatMessageContent(message.content)
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`flex items-center space-x-2 mt-1 px-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
