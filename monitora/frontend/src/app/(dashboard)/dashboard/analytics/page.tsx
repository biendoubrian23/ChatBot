'use client'

import { useEffect, useState } from 'react'
import { Workspace } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MessageSquare, Users, Clock, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const user = await getCurrentUser()
    if (!user) return

    try {
      const data = await api.workspaces.list()
      if (data) {
        setWorkspaces(data)
      }
    } catch (error) {
      console.error('Erreur chargement workspaces:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-600 text-sm mt-1">
          Vue globale de tous vos workspaces
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          icon={<MessageSquare size={24} />}
          label="Workspaces"
          value={workspaces.length.toString()}
        />
        <StatsCard
          icon={<Users size={24} />}
          label="Conversations totales"
          value="0"
        />
        <StatsCard
          icon={<TrendingUp size={24} />}
          label="Messages ce mois"
          value="0"
        />
        <StatsCard
          icon={<Clock size={24} />}
          label="Temps moyen"
          value="-"
        />
      </div>

      {/* Stats par workspace */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par workspace</CardTitle>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Créez un workspace pour voir les statistiques
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Workspace</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Conversations</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Messages</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Temps moyen</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <tr key={ws.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{ws.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs ${ws.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {ws.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">0</td>
                    <td className="p-4 text-gray-600">0</td>
                    <td className="p-4 text-gray-600">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode
  label: string
  value: string 
}) {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          <div className="text-gray-400">{icon}</div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
