'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FloatingChatButtonProps {
  onClick: () => void
  isOpen: boolean
  unreadCount?: number
}

export default function FloatingChatButton({ onClick, isOpen, unreadCount = 0 }: FloatingChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-2xl flex items-center justify-center cursor-pointer z-50 hover:shadow-blue-500/50 transition-shadow duration-300"
          >
            {/* Avatar LA */}
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                LA
              </div>
              
              {/* Badge de notification */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {unreadCount}
                </motion.div>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="fixed bottom-8 right-24 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-40 whitespace-nowrap"
          >
            Besoin d&apos;aide ? 💬
            <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-900"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
