'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Workspace } from '@/lib/supabase'
import { StatCard } from '@/components/ui/stat-card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  FileText,
  ArrowUpRight,
  Activity,
  Calendar
} from 'lucide-react'

type Chatbot = Workspace

const periodOptions = [
  { value: '1d', label: '24h' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '1y', label: '1 an' },
]

export default function ChatbotOverviewPage() {
  const params = useParams()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [period, setPeriod] = useState('7d')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDates, setCustomDates] = useState<{ start: string; end: string } | null>(null)
  const [stats, setStats] = useState({
    messagesTotal: 0,
    messagesThisWeek: 0,
    usersTotal: 0,
    avgResponseTime: '0s',
    documentsCount: 0,
    conversationsToday: 0,
    satisfactionRate: 0,
    messagesPerConversation: 0
  })

  useEffect(() => {
    if (params.id) {
      loadData(params.id as string)
    }
  }, [params.id])

  const loadData = async (id: string) => {
    // Charger le chatbot
    const { data: chatbotData } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single()

    if (chatbotData) {
      setChatbot(chatbotData)
    }

    // 1. Nombre de documents
    const { data: docsData } = await supabase
      .from('documents')
      .select('id')
      .eq('workspace_id', id)

    // 2. Toutes les conversations du workspace
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, visitor_id, started_at, messages_count, satisfaction')
      .eq('workspace_id', id)

    // 3. Tous les messages du workspace (via les conversations)
    const conversationIds = convData?.map(c => c.id) || []
    let messagesData: any[] = []
    let totalResponseTime = 0
    let responseTimeCount = 0
    let totalFeedback = 0
    let feedbackCount = 0

    if (conversationIds.length > 0) {
      const { data: msgData } = await supabase
        .from('messages')
        .select('id, role, response_time_ms, feedback, created_at')
        .in('conversation_id', conversationIds)

      messagesData = msgData || []

      // Calculer le temps de réponse moyen (uniquement messages assistant)
      messagesData.forEach(msg => {
        if (msg.role === 'assistant' && msg.response_time_ms) {
          totalResponseTime += msg.response_time_ms
          responseTimeCount++
        }
        if (msg.feedback !== null && msg.feedback !== undefined) {
          totalFeedback += msg.feedback
          feedbackCount++
        }
      })
    }

    // 4. Utilisateurs uniques (visitor_id distincts)
    const uniqueVisitors = new Set(convData?.map(c => c.visitor_id).filter(Boolean))

    // 5. Conversations aujourd'hui
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const conversationsToday = convData?.filter(c => 
      new Date(c.started_at) >= today
    ).length || 0

    // 6. Calculer les moyennes
    const avgResponseMs = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0
    const avgResponseTime = avgResponseMs > 0 
      ? avgResponseMs < 1000 
        ? `${Math.round(avgResponseMs)}ms`
        : `${(avgResponseMs / 1000).toFixed(1)}s`
      : '0s'

    const satisfactionRate = feedbackCount > 0 
      ? Math.round((totalFeedback / feedbackCount) * 100)
      : 0

    const totalMessages = messagesData.length
    const totalConversations = convData?.length || 0
    const messagesPerConversation = totalConversations > 0 
      ? Math.round((totalMessages / totalConversations) * 10) / 10
      : 0

    setStats({
      messagesTotal: totalMessages,
      messagesThisWeek: totalMessages, // TODO: filtrer par semaine
      usersTotal: uniqueVisitors.size,
      avgResponseTime,
      documentsCount: docsData?.length || 0,
      conversationsToday,
      satisfactionRate,
      messagesPerConversation
    })
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Vue d'ensemble</h1>
        <p className="text-gray-500 mt-1">
          Statistiques et performances de votre chatbot
        </p>
      </div>

      {/* Grille de stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Messages"
          value={stats.messagesTotal}
          subtitle="Total"
          icon={<MessageSquare size={20} />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Utilisateurs"
          value={stats.usersTotal}
          subtitle="Uniques"
          icon={<Users size={20} />}
        />
        <StatCard
          title="Temps de réponse"
          value={stats.avgResponseTime}
          subtitle="Moyenne"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="Conversations"
          value={stats.conversationsToday}
          subtitle="Aujourd'hui"
          icon={<Activity size={20} />}
        />
      </div>

      {/* Section graphiques et documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique principal */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-gray-900">Activité</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPeriod(option.value)
                      setCustomDates(null)
                      setShowDatePicker(false)
                    }}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                      ${period === option.value && !customDates
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Bouton calendrier */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                    ${customDates 
                      ? 'bg-black text-white border-black' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Calendar size={14} />
                  {customDates 
                    ? `${customDates.start} - ${customDates.end}`
                    : 'Personnalisé'
                  }
                </button>
                
                {/* Date picker avec calendrier visuel */}
                <DateRangePicker
                  isOpen={showDatePicker}
                  onClose={() => setShowDatePicker(false)}
                  onApply={(start, end) => {
                    setCustomDates({ start, end })
                    setPeriod('custom')
                    setShowDatePicker(false)
                  }}
                  initialStart={customDates?.start}
                  initialEnd={customDates?.end}
                />
              </div>
            </div>
          </div>
          
          {/* Placeholder pour le graphique */}
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-400">
              <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Graphique d'activité</p>
              <p className="text-xs">Bientôt disponible</p>
            </div>
          </div>
        </div>

        {/* Panneau documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-gray-900">Base de connaissances</h3>
            <a 
              href={`/dashboard/chatbots/${params.id}/documents`}
              className="text-sm text-gray-500 hover:text-black flex items-center gap-1"
            >
              Voir tout
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <FileText size={20} className="text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{stats.documentsCount}</p>
                <p className="text-xs text-gray-500">Documents indexés</p>
              </div>
            </div>

            {stats.documentsCount === 0 ? (
              <div className="text-center py-6">
                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Aucun document</p>
                <a 
                  href={`/dashboard/chatbots/${params.id}/documents`}
                  className="text-sm text-black hover:underline mt-1 inline-block"
                >
                  Ajouter des documents
                </a>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-xs text-gray-500">Indexation complète</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversations récentes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium text-gray-900">Conversations récentes</h3>
          <a 
            href={`/dashboard/chatbots/${params.id}/conversations`}
            className="text-sm text-gray-500 hover:text-black flex items-center gap-1"
          >
            Voir toutes
            <ArrowUpRight size={14} />
          </a>
        </div>

        {stats.conversationsToday === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune conversation pour l'instant</p>
            <p className="text-xs">Les conversations apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Placeholder pour les conversations */}
            <p className="text-sm text-gray-500 text-center py-4">
              Liste des conversations à venir
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
