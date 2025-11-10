'use client'

import { motion } from 'framer-motion'

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void
}

const suggestions = [
  "Comment fonctionne CoolLibri ?",
  "Quels sont les tarifs ?",
  "Comment puis-je créer un compte ?",
  "Quelles sont les fonctionnalités disponibles ?"
]

export default function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
    >
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl"
        >
          <span className="text-white font-bold text-3xl">LA</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        >
          Bienvenue sur LibriAssist
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 dark:text-gray-400 max-w-md mx-auto"
        >
          Votre assistant intelligent pour toutes vos questions sur CoolLibri.
          Posez-moi n&apos;importe quelle question !
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4"
      >
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSendMessage(suggestion)}
            className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-left text-sm text-gray-700 dark:text-gray-300 shadow-soft hover:shadow-soft-lg transition-all"
          >
            {suggestion}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  )
}
