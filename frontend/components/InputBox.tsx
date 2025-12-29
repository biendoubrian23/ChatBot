'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface InputBoxProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export default function InputBox({ onSendMessage, isLoading }: InputBoxProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wasLoadingRef = useRef(false)

  // Auto-focus quand le chargement se termine
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      // Le chargement vient de se terminer, on focus le textarea
      textareaRef.current?.focus()
    }
    wasLoadingRef.current = isLoading
  }, [isLoading])

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        {/* Barre de saisie style moderne */}
        <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none outline-none text-sm py-1"
            style={{
              minHeight: '24px',
              maxHeight: '80px',
            }}
          />
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="ml-2 w-9 h-9 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-500"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </motion.button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          LibriAssist utilise l&apos;IA pour répondre à vos questions sur CoolLibri
        </p>
      </div>
    </div>
  )
}
