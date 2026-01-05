'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, Workspace } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { Plus, Bot, MessageSquare, Users, TrendingUp, Globe, MoreVertical, Play, Pause } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Type alias pour la clarté
type Chatbot = Workspace

export default function DashboardPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalChatbots: 0,
    activeChatbots: 0,
    totalMessages: 0,
    totalUsers: 0
  })

  useEffect(() => {
    loadChatbots()
  }, [])

  const loadChatbots = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setChatbots(data)
      setStats({
        totalChatbots: data.length,
        activeChatbots: data.filter(c => c.is_active).length,
        totalMessages: 0,
        totalUsers: 0
      })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chatbots"
          value={stats.totalChatbots}
          subtitle="Total créés"
          icon={<Bot size={20} />}
        />
        <StatCard
          title="Actifs"
          value={stats.activeChatbots}
          subtitle="En production"
          icon={<Play size={20} />}
          trend={{ value: 100, isPositive: true }}
        />
        <StatCard
          title="Messages"
          value={stats.totalMessages}
          subtitle="Ce mois"
          icon={<MessageSquare size={20} />}
        />
        <StatCard
          title="Utilisateurs"
          value={stats.totalUsers}
          subtitle="Uniques ce mois"
          icon={<Users size={20} />}
        />
      </div>

      {/* Header with action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mes Chatbots</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérez et configurez vos assistants IA
          </p>
        </div>
        <Link href="/dashboard/chatbots/new">
          <Button className="bg-black hover:bg-gray-800 text-white">
            <Plus size={16} className="mr-2" />
            Nouveau chatbot
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && chatbots.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun chatbot</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Créez votre premier chatbot pour commencer à automatiser vos conversations
          </p>
          <Link href="/dashboard/chatbots/new">
            <Button className="bg-black hover:bg-gray-800 text-white">
              <Plus size={16} className="mr-2" />
              Créer mon premier chatbot
            </Button>
          </Link>
        </div>
      )}

      {/* Chatbots Table */}
      {!loading && chatbots.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Chatbot
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Statut
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Messages
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Créé le
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chatbots.map((chatbot) => (
                <ChatbotRow key={chatbot.id} chatbot={chatbot} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ChatbotRow({ chatbot }: { chatbot: Chatbot }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <Link href={`/dashboard/chatbots/${chatbot.id}`} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 hover:text-black">
              {chatbot.name}
            </div>
            {chatbot.domain && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Globe size={12} />
                {chatbot.domain}
              </div>
            )}
          </div>
        </Link>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          chatbot.is_active 
            ? 'bg-green-50 text-green-700' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {chatbot.is_active ? (
            <>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Actif
            </>
          ) : (
            <>
              <Pause size={12} />
              Inactif
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        0
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDate(chatbot.created_at)}
      </td>
      <td className="px-6 py-4 text-right">
        <Link href={`/dashboard/chatbots/${chatbot.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
            <MoreVertical size={16} />
          </Button>
        </Link>
      </td>
    </tr>
  )
}
