'use client'

import { useState } from 'react'
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDates, setCustomDates] = useState<{ start: string; end: string } | null>(null)

  const stats = {
    totalMessages: 0,
    uniqueUsers: 0,
    avgResponseTime: '0s',
    satisfactionRate: 0
  }

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

      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Messages"
          value={stats.totalMessages}
          subtitle="Période sélectionnée"
          icon={<MessageSquare size={20} />}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Utilisateurs"
          value={stats.uniqueUsers}
          subtitle="Uniques"
          icon={<Users size={20} />}
          trend={{ value: 0, isPositive: true }}
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
            <p className="text-2xl font-semibold text-gray-900">0s</p>
            <p className="text-xs text-gray-500 mt-1">-</p>
          </div>

          {/* Conversations résolues */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Conversations résolues</span>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">0%</p>
            <p className="text-xs text-gray-500 mt-1">-</p>
          </div>

          {/* Messages par conversation */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Messages / conversation</span>
              <MessageSquare size={16} className="text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">-</p>
          </div>
        </div>
      </div>

      {/* Message si pas de données */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <p className="text-blue-800 text-sm">
          Les analytics seront disponibles une fois que votre chatbot aura reçu des messages.
        </p>
      </div>
    </div>
  )
}
