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
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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

        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 px-1">
          {message.timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
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
