'use client'

import { motion } from 'framer-motion'
import type { Message } from '@/types/chat'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          LA
        </div>
      )}

      <div className="flex-1 max-w-[80%]">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none ml-auto shadow-soft'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none shadow-soft'
          }`}
        >
          {!isUser && message.content === '...' ? (
            // Animation des 3 points pendant le chargement
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : !isUser && message.isThinking ? (
            // Style spécial pour les étapes de thinking
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 italic">{message.content}</p>
            </div>
          ) : (
            // Réponse finale avec effet de shader
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                background: [
                  'linear-gradient(90deg, rgba(59,130,246,0.1) 0%, rgba(147,51,234,0.1) 100%)',
                  'rgba(255,255,255,0)',
                ]
              }}
              transition={{ 
                duration: 0.8,
                background: { duration: 1.5, ease: "easeOut" }
              }}
              className="rounded-lg p-1"
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </motion.div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.2 }}
            className="mt-2 space-y-2"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Sources consultées :
            </p>
            {message.sources.slice(0, 3).map((source, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2 text-xs border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {source.metadata.source || 'Document'}
                  </span>
                  {source.relevance_score && (
                    <span className="text-blue-600 dark:text-blue-400 font-mono">
                      {(source.relevance_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                  {source.content.substring(0, 150)}...
                </p>
              </div>
            ))}
          </motion.div>
        )}

        <div className="flex items-center space-x-2 mt-1 px-1">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            {message.timestamp.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {!isUser && message.ttfb && (
            <span className="text-xs font-mono text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              🚀 {(message.ttfb / 1000).toFixed(2)}s
            </span>
          )}
          {!isUser && message.responseTime && (
            <span className="text-xs font-mono text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
              ⏱️ {(message.responseTime / 1000).toFixed(2)}s
            </span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
}
