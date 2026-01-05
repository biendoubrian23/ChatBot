'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Sparkles,
  Key,
  Code,
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatbotSidebarProps {
  chatbotId: string
  chatbotName: string
  isActive?: boolean
}

export function ChatbotSidebar({ chatbotId, chatbotName, isActive = true }: ChatbotSidebarProps) {
  const pathname = usePathname()
  const basePath = `/dashboard/chatbots/${chatbotId}`

  const navItems = [
    { href: basePath, icon: LayoutDashboard, label: 'Vue d\'ensemble', exact: true },
    { href: `${basePath}/documents`, icon: FileText, label: 'Documents' },
    { href: `${basePath}/conversations`, icon: MessageSquare, label: 'Conversations' },
    { href: `${basePath}/analytics`, icon: BarChart3, label: 'Analytics' },
    { href: `${basePath}/configuration`, icon: Sparkles, label: 'Configuration IA' },
    { href: `${basePath}/integration`, icon: Code, label: 'Intégration' },
    { href: `${basePath}/api-keys`, icon: Key, label: 'Clés API' },
    { href: `${basePath}/settings`, icon: Settings, label: 'Paramètres' },
  ]

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      {/* Header with back button */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200">
        <Link 
          href="/dashboard" 
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </Link>
      </div>

      {/* Chatbot Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-900 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{chatbotName}</p>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-xs text-gray-500">Actif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href
            : pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 text-sm transition-colors',
                isActive 
                  ? 'bg-gray-100 text-gray-900 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600"
        >
          <span className="font-semibold">MONITORA</span>
        </Link>
      </div>
    </aside>
  )
}
