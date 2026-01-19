'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Workspace } from '@/lib/supabase'
import { api } from '@/lib/api'

type Chatbot = Workspace

interface ChatbotContextType {
  chatbot: Chatbot | null
  setChatbot: (chatbot: Chatbot | null) => void
  refreshChatbot: () => Promise<void>
  updateWidgetConfig: (config: Partial<Chatbot['widget_config']>) => void
  updateRagConfig: (config: Partial<Chatbot['rag_config']>) => void
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined)

export function ChatbotProvider({ 
  children, 
  initialChatbot 
}: { 
  children: ReactNode
  initialChatbot: Chatbot | null 
}) {
  const [chatbot, setChatbot] = useState<Chatbot | null>(initialChatbot)

  const refreshChatbot = useCallback(async () => {
    if (!chatbot?.id) return
    
    try {
      const data = await api.workspaces.get(chatbot.id)
      if (data) {
        setChatbot(data)
      }
    } catch (error) {
      console.error('Erreur refresh chatbot:', error)
    }
  }, [chatbot?.id])

  // Mettre à jour widget_config localement (avant même la sauvegarde API)
  const updateWidgetConfig = useCallback((config: Partial<Chatbot['widget_config']>) => {
    setChatbot(prev => prev ? {
      ...prev,
      widget_config: { ...prev.widget_config, ...config }
    } : null)
  }, [])

  // Mettre à jour rag_config localement
  const updateRagConfig = useCallback((config: Partial<Chatbot['rag_config']>) => {
    setChatbot(prev => prev ? {
      ...prev,
      rag_config: { ...prev.rag_config, ...config }
    } : null)
  }, [])

  return (
    <ChatbotContext.Provider value={{ 
      chatbot, 
      setChatbot, 
      refreshChatbot,
      updateWidgetConfig,
      updateRagConfig
    }}>
      {children}
    </ChatbotContext.Provider>
  )
}

export function useChatbot() {
  const context = useContext(ChatbotContext)
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider')
  }
  return context
}
