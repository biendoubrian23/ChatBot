'use client'

import { motion } from 'framer-motion'

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void
}

const suggestions = [
  "Puis-je imprimer un seul exemplaire ?",
  "Puis-je recevoir un échantillon avant impression ?",
  "Combien de temps faut-il pour recevoir mon livre imprimé ?",
  "Quels formats de fichiers sont acceptés (PDF, Word, etc.) ?",
  "Quand et comment suis-je payé pour mes ventes ?",
  "Quels types de livres puis-je faire imprimer sur CoolLibri ?",
  "Comment faire une couverture personnalisée ?",
  "Puis-je modifier mon livre après publication ?",
  "Quels sont les moyens de paiement acceptés ?",
  "Est-ce que je garde mes droits d'auteur ?",
  "Mon livre est-il protégé une fois publié sur CoolLibri ?",
  "CoolLibri peut-il vendre mon livre sans mon accord ?",
  "Puis-je supprimer mon livre du site quand je veux ?"
]

export default function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
  // Split suggestions into two rows for carousel effect
  const firstRow = suggestions.slice(0, 7)
  const secondRow = suggestions.slice(7)

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

      {/* Carousel container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full overflow-hidden space-y-4"
      >
        {/* First row - scrolling left to right */}
        <div className="relative overflow-hidden">
          <motion.div
            animate={{
              x: ['-100%', '0%']
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear"
              }
            }}
            className="flex gap-3 whitespace-nowrap"
          >
            {/* Duplicate for seamless loop */}
            {[...firstRow, ...firstRow].map((suggestion, index) => (
              <button
                key={`first-${index}`}
                onClick={() => onSendMessage(suggestion)}
                className="inline-block px-6 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-sm text-gray-700 dark:text-gray-300 shadow-soft hover:shadow-soft-lg transition-all hover:scale-105"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Second row - scrolling right to left */}
        <div className="relative overflow-hidden">
          <motion.div
            animate={{
              x: ['0%', '-100%']
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 25,
                ease: "linear"
              }
            }}
            className="flex gap-3 whitespace-nowrap"
          >
            {/* Duplicate for seamless loop */}
            {[...secondRow, ...secondRow].map((suggestion, index) => (
              <button
                key={`second-${index}`}
                onClick={() => onSendMessage(suggestion)}
                className="inline-block px-6 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-sm text-gray-700 dark:text-gray-300 shadow-soft hover:shadow-soft-lg transition-all hover:scale-105"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
