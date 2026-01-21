'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Workspace } from '@/lib/supabase'
import { api } from '@/lib/api'
import { ActivityChart } from '@/components/activity-chart'
import { StatCard } from '@/components/ui/stat-card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
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

export default function AnalyticsPage() {
  const params = useParams()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    messagesPerConversation: 0,
    recentDocuments: [] as any[],
    avgTTFB: '0s',
    history: [] as any[]
  })

  useEffect(() => {
    if (params.id) {
      loadData(params.id as string)
    }
  }, [params.id])

  const loadData = async (id: string, periodOverride?: string) => {
    try {
      const currentPeriod = periodOverride || period

      // Charger le chatbot et les analytics via l'API
      const chatbotData = await api.workspaces.get(id)
      if (chatbotData) {
        setChatbot(chatbotData)
      }

      // Charger les analytics globales via l'API
      const analyticsData = await api.analytics.get(id, currentPeriod)
      if (analyticsData) {
        setStats({
          messagesTotal: analyticsData.totalMessages || 0,
          messagesThisWeek: analyticsData.messagesThisWeek || 0,
          usersTotal: analyticsData.uniqueUsers || 0,
          avgResponseTime: analyticsData.avgResponseTime || '0s',
          documentsCount: analyticsData.documentsCount || 0,
          conversationsToday: analyticsData.conversationsToday || 0,
          satisfactionRate: analyticsData.averageSatisfaction || 0,
          messagesPerConversation: analyticsData.messagesPerConversation || 0,
          recentDocuments: analyticsData.recentDocuments || [],
          avgTTFB: analyticsData.avgTTFB || '0s',
          history: analyticsData.history || []
        })
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    setCustomDates(null) // Reset custom date if standard period selected
    if (params.id) {
      loadData(params.id as string, newPeriod)
    }
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec les filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">
            Performances et métriques de votre chatbot
          </p>
        </div>

        {/* Filtres Globaux */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap
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
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap
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

      {/* Grille de stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Messages"
          value={stats.messagesTotal}
          subtitle="Période sélectionnée"
          icon={<MessageSquare size={20} />}
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
          title="Satisfaction"
          value={`${stats.satisfactionRate}%`}
          subtitle="Score moyen"
          icon={<TrendingUp size={20} />}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart
          title="Messages par jour"
          data={stats.history}
          dataKey="messages"
          color="#8B5CF6" // Violet
        />
        <ActivityChart
          title="Utilisateurs par jour"
          data={stats.history}
          dataKey="users"
          color="#ec4899" // Rose/Pink
        />
      </div>

      {/* Métriques détaillées (Vide pour le moment comme demandé) */}
      <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
        <h3 className="text-gray-500 font-medium">Métriques détaillées</h3>
        <p className="text-sm text-gray-400 mt-1">Bientôt disponible</p>
      </div>
    </div>
  )
}
