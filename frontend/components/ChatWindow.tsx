'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function ChatWindow({ isOpen, onClose, children }: ChatWindowProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay pour mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
          />

          {/* Fenêtre de chat */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 w-full md:w-[440px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ maxWidth: 'calc(100vw - 3rem)' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-lg shadow-lg">
                  LA
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">LibriAssist</h3>
                  <p className="text-blue-100 text-xs">Assistant CoolLibri</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenu du chat */}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
