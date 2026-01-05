'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MainSidebar } from '@/components/main-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Détecter si on est dans une route de chatbot spécifique
  const isChatbotRoute = /\/dashboard\/chatbots\/[^/]+/.test(pathname)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (session) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-900 animate-pulse"></div>
          <span className="text-gray-500">Chargement...</span>
        </div>
      </div>
    )
  }

  // Si on est dans un chatbot spécifique, le layout chatbot gère tout
  if (isChatbotRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainSidebar user={user} />
      <main className="ml-56 min-h-screen p-6">
        {children}
      </main>
    </div>
  )
}
