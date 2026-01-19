'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Workspace } from '@/lib/supabase'
import { api } from '@/lib/api'
import { ChatbotSidebar } from '@/components/chatbot-sidebar'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ChatWidgetPreview } from '@/components/chat-widget-preview'
import { ChatbotProvider, useChatbot } from '@/contexts/chatbot-context'

type Chatbot = Workspace

function ChatbotLayoutContent({ children }: { children: React.ReactNode }) {
  const { chatbot } = useChatbot()

  if (!chatbot) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar contextuelle du chatbot */}
      <ChatbotSidebar 
        chatbotId={chatbot.id} 
        chatbotName={chatbot.name}
        isActive={chatbot.is_active}
      />

      {/* Contenu principal - décalé à droite de la sidebar */}
      <div className="ml-56 flex flex-col min-h-screen">
        {/* Top bar avec breadcrumb */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 sticky top-0 z-10">
          <Breadcrumb
            items={[
              { label: 'Chatbots', href: '/dashboard' },
              { label: chatbot.name }
            ]}
          />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Widget de preview - utilise la config widget_config */}
      <ChatWidgetPreview
        workspaceId={chatbot.id}
        botName={chatbot.widget_config?.chatbot_name || chatbot.name}
        welcomeMessage={chatbot.widget_config?.welcomeMessage || `Bonjour ! Je suis ${chatbot.name}. Comment puis-je vous aider ?`}
        accentColor={chatbot.widget_config?.primaryColor || "#000000"}
        widgetWidth={chatbot.widget_config?.widgetWidth || 360}
        widgetHeight={chatbot.widget_config?.widgetHeight || 500}
        streamingEnabled={chatbot.rag_config?.streaming_enabled ?? true}
        brandingText={chatbot.widget_config?.brandingText ?? 'Propulsé par MONITORA'}
      />
    </div>
  )
}

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const router = useRouter()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [loading, setLoading] = useState(true)

  const loadChatbot = useCallback(async (id: string) => {
    try {
      const data = await api.workspaces.get(id)
      if (!data) {
        router.push('/dashboard')
        return
      }
      setChatbot(data)
    } catch (error) {
      console.error('Erreur chargement chatbot:', error)
      router.push('/dashboard')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (params.id) {
      loadChatbot(params.id as string)
    }
  }, [params.id, loadChatbot])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
      </div>
    )
  }

  if (!chatbot) {
    return null
  }

  return (
    <ChatbotProvider initialChatbot={chatbot}>
      <ChatbotLayoutContent>{children}</ChatbotLayoutContent>
    </ChatbotProvider>
  )
}
