'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { StatCard } from '@/components/ui/stat-card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  Calendar
} from 'lucide-react'

const periodOptions = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '1y', label: '1 an' }
]

// Fonction pour calculer la date de début selon la période
function getStartDate(period: string): Date {
  const now = new Date()
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case '3m':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case '6m':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}

export default function AnalyticsPage() {
  const params = useParams()
  const [period, setPeriod] = useState('7d')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDates, setCustomDates] = useState<{ start: string; end: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    totalMessages: 0,
    uniqueUsers: 0,
    avgResponseTime: '0s',
    avgResponseTimeMs: 0,
    satisfactionRate: 0,
    messagesPerConversation: 0,
    resolvedConversations: 0,
    totalConversations: 0
  })

  const [previousStats, setPreviousStats] = useState({
    totalMessages: 0,
    uniqueUsers: 0
  })

  const loadStats = useCallback(async () => {
    if (!params.id) return
    
    setLoading(true)
    const workspaceId = params.id as string

    // Calculer les dates de la période
    let startDate: Date
    let endDate = new Date()

    if (customDates) {
      startDate = new Date(customDates.start)
      endDate = new Date(customDates.end)
      endDate.setHours(23, 59, 59, 999)
    } else {
      startDate = getStartDate(period)
    }

    try {
      // Utiliser l'API analytics côté serveur
      const analyticsData = await api.analytics.overview(workspaceId, period)
      
      if (analyticsData) {
        setStats({
          totalMessages: analyticsData.totalMessages || 0,
          uniqueUsers: analyticsData.uniqueUsers || 0,
          avgResponseTime: analyticsData.avgResponseTime || '0s',
          avgResponseTimeMs: analyticsData.avgResponseTimeMs || 0,
          satisfactionRate: analyticsData.satisfactionRate || 0,
          messagesPerConversation: analyticsData.messagesPerConversation || 0,
          resolvedConversations: analyticsData.resolvedConversations || 0,
          totalConversations: analyticsData.totalConversations || 0
        })

        setPreviousStats({
          totalMessages: analyticsData.previousTotalMessages || 0,
          uniqueUsers: analyticsData.previousUniqueUsers || 0
        })
      }
    } catch (error) {
      console.error('Erreur chargement analytics:', error)
    }

    setLoading(false)
  }, [params.id, period, customDates])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Calculer les trends
  const messagesTrend = previousStats.totalMessages > 0
    ? Math.round(((stats.totalMessages - previousStats.totalMessages) / previousStats.totalMessages) * 100)
    : stats.totalMessages > 0 ? 100 : 0

  const usersTrend = previousStats.uniqueUsers > 0
    ? Math.round(((stats.uniqueUsers - previousStats.uniqueUsers) / previousStats.uniqueUsers) * 100)
    : stats.uniqueUsers > 0 ? 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">
            Performances et métriques de votre chatbot
          </p>
        </div>
        
        {/* Sélecteur de période */}
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
                    : 'text-gray-600 hover:text-gray-900'
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
        </div>
      )}

      {!loading && (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Messages"
              value={stats.totalMessages}
              subtitle="Période sélectionnée"
              icon={<MessageSquare size={20} />}
              trend={{ value: messagesTrend, isPositive: messagesTrend >= 0 }}
            />
            <StatCard
              title="Utilisateurs"
              value={stats.uniqueUsers}
              subtitle="Uniques"
              icon={<Users size={20} />}
              trend={{ value: usersTrend, isPositive: usersTrend >= 0 }}
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
            {/* Graphique messages */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-6">Messages par jour</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-400">
                  <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Graphique à venir</p>
                </div>
              </div>
            </div>

            {/* Graphique utilisateurs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-6">Utilisateurs par jour</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-400">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Graphique à venir</p>
                </div>
              </div>
            </div>
          </div>

          {/* Métriques détaillées */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-6">Métriques détaillées</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Temps de réponse */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Temps de réponse moyen</span>
                  <Clock size={16} className="text-gray-400" />
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.avgResponseTime}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.avgResponseTimeMs > 0 ? `${Math.round(stats.avgResponseTimeMs)}ms exactement` : '-'}
                </p>
              </div>

              {/* Conversations résolues */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Conversations résolues</span>
                  <TrendingUp size={16} className="text-gray-400" />
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.resolvedConversations}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalConversations > 0 ? `Sur ${stats.totalConversations} conversations` : '-'}
                </p>
              </div>

              {/* Messages par conversation */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Messages / conversation</span>
                  <MessageSquare size={16} className="text-gray-400" />
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.messagesPerConversation}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalMessages > 0 ? `${stats.totalMessages} messages total` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Message si pas de données */}
          {stats.totalMessages === 0 && stats.totalConversations === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <p className="text-blue-800 text-sm">
                Les analytics seront disponibles une fois que votre chatbot aura reçu des messages.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
