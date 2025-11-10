'use client'

import { motion } from 'framer-motion'

interface HeaderProps {
  onNewChat: () => void
  hasMessages: boolean
}

export default function Header({ onNewChat, hasMessages }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">LA</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              LibriAssist
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Assistant CoolLibri
            </p>
          </div>
        </div>

        {hasMessages && (
          <button
            onClick={onNewChat}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
          >
            Nouvelle conversation
          </button>
        )}
      </div>
    </motion.header>
  )
}
