'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser, logout, User } from '@/lib/auth'
import { MainSidebar } from '@/components/main-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Détecter si on est dans une route de chatbot spécifique
  const isChatbotRoute = /\/dashboard\/chatbots\/[^/]+/.test(pathname)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        
        if (!currentUser) {
          router.push('/login')
          return
        }
        
        setUser(currentUser)
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'utilisateur:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  // Fonction de déconnexion à passer au sidebar
  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

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
      <MainSidebar user={user} onLogout={handleLogout} />
      <main className="ml-56 min-h-screen p-6">
        {children}
      </main>
    </div>
  )
}
