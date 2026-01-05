'use client'

import { useState, useMemo } from 'react'
import {
  MessageSquare,
  Search,
  Download,
  Filter,
  Star,
  Clock,
  ChevronRight,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import type { Workspace, Conversation } from '@/lib/types'

interface ConversationsContentProps {
  workspaces: Pick<Workspace, 'id' | 'name'>[]
  conversations: (Conversation & { workspace: Pick<Workspace, 'id' | 'name'> })[]
}

export function ConversationsContent({ workspaces, conversations }: ConversationsContentProps) {
  const [search, setSearch] = useState('')
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Workspace filter
      if (selectedWorkspace !== 'all' && conv.workspace_id !== selectedWorkspace) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'all' && conv.status !== selectedStatus) {
        return false
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        return (
          conv.visitor_id.toLowerCase().includes(searchLower) ||
          conv.page_url?.toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [conversations, selectedWorkspace, selectedStatus, search])

  // Export to CSV
  function handleExport() {
    const headers = ['ID', 'Workspace', 'Visiteur', 'Messages', 'Satisfaction', 'Date', 'Statut']
    const rows = filteredConversations.map((conv) => [
      conv.id,
      conv.workspace.name,
      conv.visitor_id,
      conv.messages_count,
      conv.satisfaction || '-',
      new Date(conv.started_at).toISOString(),
      conv.status,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Historique des échanges avec vos visiteurs
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={handleExport}
        >
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par visiteur, URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { label: 'Tous les statuts', value: 'all' },
            { label: 'Actives', value: 'active' },
            { label: 'Terminées', value: 'ended' },
            { label: 'Archivées', value: 'archived' },
          ]}
          className="w-40"
        />
      </div>

      {/* Conversations Table */}
      <Card>
        <CardContent className="p-0">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium mb-1">Aucune conversation</p>
              <p className="text-muted-foreground">
                Les conversations apparaîtront ici une fois que les visiteurs utiliseront vos chatbots.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visiteur</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.map((conv) => (
                  <TableRow key={conv.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{conv.visitor_id.substring(0, 12)}...</p>
                        {conv.page_url && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {conv.page_url}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{conv.workspace.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        {conv.messages_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {conv.satisfaction ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          {conv.satisfaction}/5
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {conv.ended_at
                          ? formatDuration(new Date(conv.started_at), new Date(conv.ended_at))
                          : 'En cours'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(conv.started_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          conv.status === 'active'
                            ? 'success'
                            : conv.status === 'ended'
                            ? 'default'
                            : 'default'
                        }
                      >
                        {conv.status === 'active'
                          ? 'Active'
                          : conv.status === 'ended'
                          ? 'Terminée'
                          : 'Archivée'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{filteredConversations.length}</p>
            <p className="text-sm text-muted-foreground">Conversations affichées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">
              {filteredConversations.reduce((sum, c) => sum + c.messages_count, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Messages totaux</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">
              {filteredConversations.filter((c) => c.status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">Conversations actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">
              {calculateAvgSatisfaction(filteredConversations)}
            </p>
            <p className="text-sm text-muted-foreground">Satisfaction moyenne</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatDuration(start: Date, end: Date): string {
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function calculateAvgSatisfaction(conversations: Conversation[]): string {
  const rated = conversations.filter((c) => c.satisfaction !== null)
  if (rated.length === 0) return '-'
  const sum = rated.reduce((acc, c) => acc + (c.satisfaction || 0), 0)
  return (sum / rated.length).toFixed(1) + '/5'
}
