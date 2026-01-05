'use client'

import Link from 'next/link'
import { 
  Plus, 
  MessageSquare, 
  Users, 
  FolderKanban, 
  TrendingUp,
  ArrowRight,
  ExternalLink 
} from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import type { User, Organization, Workspace, OrganizationOverview } from '@/lib/types'

interface DashboardContentProps {
  profile: (User & { organization: Organization }) | null
  workspaces: Workspace[]
  overview: OrganizationOverview | null
}

export function DashboardContent({ profile, workspaces, overview }: DashboardContentProps) {
  const stats = [
    {
      name: 'Workspaces actifs',
      value: overview?.workspaces_count || 0,
      icon: FolderKanban,
      change: '+2 ce mois',
    },
    {
      name: 'Conversations totales',
      value: overview?.total_conversations || 0,
      icon: MessageSquare,
      change: '+12% vs mois dernier',
    },
    {
      name: 'Messages échangés',
      value: overview?.total_messages || 0,
      icon: TrendingUp,
      change: '+8% vs mois dernier',
    },
    {
      name: 'Membres équipe',
      value: overview?.members_count || 1,
      icon: Users,
      change: '',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Bonjour, {profile?.full_name || 'Utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de vos chatbots aujourd'hui
          </p>
        </div>
        <Link href="/dashboard/workspaces/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nouveau workspace
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <stat.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                {stat.change && (
                  <span className="text-xs text-muted-foreground">{stat.change}</span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-3xl font-semibold">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workspaces Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Vos Workspaces</h2>
          <Link 
            href="/dashboard/workspaces" 
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" strokeWidth={1} />
              <h3 className="text-lg font-medium mb-2">Aucun workspace</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre premier workspace pour commencer à déployer vos chatbots.
              </p>
              <Link href="/dashboard/workspaces/new">
                <Button leftIcon={<Plus className="h-4 w-4" />}>
                  Créer un workspace
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.slice(0, 6).map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Ajouter des documents"
            description="Uploadez de nouveaux fichiers pour enrichir votre base de connaissances"
            href="/dashboard/workspaces"
            icon={<Plus className="h-5 w-5" />}
          />
          <QuickActionCard
            title="Voir les analytics"
            description="Consultez les performances de vos chatbots en détail"
            href="/dashboard/analytics"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <QuickActionCard
            title="Historique conversations"
            description="Parcourez les échanges récents avec vos visiteurs"
            href="/dashboard/conversations"
            icon={<MessageSquare className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  )
}

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <Link href={`/dashboard/workspaces/${workspace.id}`}>
      <Card className="hover:border-foreground transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{workspace.name}</CardTitle>
            <Badge variant={workspace.is_active ? 'success' : 'default'}>
              {workspace.is_active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {workspace.description || 'Aucune description'}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {workspace.total_conversations}
            </span>
            {workspace.domain && (
              <span className="flex items-center gap-1 truncate">
                <ExternalLink className="h-4 w-4" />
                {workspace.domain}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function QuickActionCard({ 
  title, 
  description, 
  href, 
  icon 
}: { 
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-foreground transition-colors cursor-pointer h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted">
              {icon}
            </div>
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
