'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Workspace } from '@/lib/supabase'
import { ChatbotSidebar } from '@/components/chatbot-sidebar'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ChatWidgetPreview } from '@/components/chat-widget-preview'

type Chatbot = Workspace

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
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      router.push('/dashboard')
      return
    }

    setChatbot(data)
    setLoading(false)
  }, [router])

  useEffect(() => {
    if (params.id) {
      loadChatbot(params.id as string)
    }
  }, [params.id, loadChatbot])

  // S'abonner aux changements en temps réel du workspace
  useEffect(() => {
    if (!params.id) return

    const channel = supabase
      .channel(`workspace-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspaces',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          // Mettre à jour le chatbot quand widget_config change
          setChatbot(prev => prev ? { ...prev, ...payload.new } : null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

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
      />
    </div>
  )
}
