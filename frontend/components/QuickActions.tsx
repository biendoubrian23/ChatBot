'use client'

import { motion } from 'framer-motion'

interface ActionButton {
  label: string
  value: string
  icon?: React.ReactNode
}

interface QuickActionsProps {
  onActionClick: (action: string) => void
  actions?: ActionButton[]
}

const defaultActions: ActionButton[] = [
  {
    label: 'Suivre ma commande',
    value: 'track_order',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    label: 'Autres...',
    value: 'other',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  }
]

export default function QuickActions({ onActionClick, actions = defaultActions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center px-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onActionClick(action.value)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md transition-all duration-200 font-medium"
        >
          {action.icon}
          <span>{action.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
