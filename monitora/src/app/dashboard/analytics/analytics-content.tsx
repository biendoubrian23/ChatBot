'use client'

import { useState, useMemo } from 'react'
import {
  BarChart3,
  MessageSquare,
  TrendingUp,
  Users,
  Clock,
  ThumbsUp,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
} from '@/components/ui'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import type { Workspace, AnalyticsDaily } from '@/lib/types'

interface AnalyticsContentProps {
  workspaces: Pick<Workspace, 'id' | 'name' | 'total_conversations' | 'total_messages'>[]
  analytics: AnalyticsDaily[]
}

export function AnalyticsContent({ workspaces, analytics }: AnalyticsContentProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('30d')

  // Filter analytics by selected workspace
  const filteredAnalytics = useMemo(() => {
    if (selectedWorkspace === 'all') return analytics
    return analytics.filter((a) => a.workspace_id === selectedWorkspace)
  }, [analytics, selectedWorkspace])

  // Aggregate data by date
  const chartData = useMemo(() => {
    const grouped = filteredAnalytics.reduce((acc, item) => {
      const date = item.date
      if (!acc[date]) {
        acc[date] = {
          date,
          conversations: 0,
          messages: 0,
          visitors: 0,
        }
      }
      acc[date].conversations += item.conversations_count
      acc[date].messages += item.messages_count
      acc[date].visitors += item.unique_visitors
      return acc
    }, {} as Record<string, { date: string; conversations: number; messages: number; visitors: number }>)

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredAnalytics])

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredAnalytics.reduce(
      (acc, item) => ({
        conversations: acc.conversations + item.conversations_count,
        messages: acc.messages + item.messages_count,
        visitors: acc.visitors + item.unique_visitors,
        avgResponseTime:
          acc.avgResponseTime +
          (item.avg_response_time_ms || 0) * item.conversations_count,
        satisfactionSum: acc.satisfactionSum + item.satisfaction_sum,
        satisfactionCount: acc.satisfactionCount + item.satisfaction_count,
      }),
      {
        conversations: 0,
        messages: 0,
        visitors: 0,
        avgResponseTime: 0,
        satisfactionSum: 0,
        satisfactionCount: 0,
      }
    )

    return {
      ...total,
      avgResponseTime: total.conversations > 0
        ? Math.round(total.avgResponseTime / total.conversations)
        : 0,
      avgSatisfaction: total.satisfactionCount > 0
        ? (total.satisfactionSum / total.satisfactionCount).toFixed(1)
        : '-',
    }
  }, [filteredAnalytics])

  const stats = [
    {
      name: 'Conversations',
      value: totals.conversations.toLocaleString(),
      icon: MessageSquare,
      trend: '+12%',
    },
    {
      name: 'Messages',
      value: totals.messages.toLocaleString(),
      icon: TrendingUp,
      trend: '+8%',
    },
    {
      name: 'Visiteurs uniques',
      value: totals.visitors.toLocaleString(),
      icon: Users,
      trend: '+15%',
    },
    {
      name: 'Temps de réponse moy.',
      value: totals.avgResponseTime > 0 ? `${totals.avgResponseTime}ms` : '-',
      icon: Clock,
      trend: '-5%',
    },
    {
      name: 'Satisfaction moy.',
      value: totals.avgSatisfaction !== '-' ? `${totals.avgSatisfaction}/5` : '-',
      icon: ThumbsUp,
      trend: '+0.2',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Suivez les performances de vos chatbots
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedWorkspace}
            onChange={setSelectedWorkspace}
            options={[
              { label: 'Tous les workspaces', value: 'all' },
              ...workspaces.map((w) => ({ label: w.name, value: w.id })),
            ]}
            className="w-48"
          />
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { label: '7 derniers jours', value: '7d' },
              { label: '30 derniers jours', value: '30d' },
              { label: '90 derniers jours', value: '90d' },
            ]}
            className="w-40"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs text-green-600">{stat.trend}</span>
              </div>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations par jour</CardTitle>
            <CardDescription>Nombre de conversations sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                      }
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="conversations"
                      stroke="#000"
                      fill="#000"
                      fillOpacity={0.1}
                      name="Conversations"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Pas de données disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages par jour</CardTitle>
            <CardDescription>Volume de messages échangés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                      }
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      }
                    />
                    <Bar dataKey="messages" fill="#000" name="Messages" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Pas de données disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspaces Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance par workspace</CardTitle>
          <CardDescription>Comparaison des statistiques entre vos workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun workspace configuré
            </div>
          ) : (
            <div className="space-y-4">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center text-sm font-medium">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{ws.name}</span>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{ws.total_conversations}</p>
                      <p className="text-xs text-muted-foreground">conversations</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{ws.total_messages}</p>
                      <p className="text-xs text-muted-foreground">messages</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
