import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderKanban, MessageSquare, ExternalLink, Search } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from '@/components/ui'
import type { Workspace } from '@/lib/types'

export default async function WorkspacesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Fetch workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos chatbots et leurs configurations
          </p>
        </div>
        <Link href="/dashboard/workspaces/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nouveau workspace
          </Button>
        </Link>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un workspace..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      {!workspaces || workspaces.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" strokeWidth={1} />
            <h3 className="text-lg font-medium mb-2">Aucun workspace</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Les workspaces vous permettent de gérer vos chatbots pour différents sites web.
              Chaque workspace a sa propre base documentaire et ses propres configurations.
            </p>
            <Link href="/dashboard/workspaces/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                Créer votre premier workspace
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace: Workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <Link href={`/dashboard/workspaces/${workspace.id}`}>
      <Card className="hover:border-foreground transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: workspace.settings?.primary_color || '#000' }}
              >
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-base">{workspace.name}</CardTitle>
                {workspace.domain && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <ExternalLink className="h-3 w-3" />
                    {workspace.domain}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={workspace.is_active ? 'success' : 'default'}>
              {workspace.is_active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
            {workspace.description || 'Aucune description'}
          </p>
          <div className="flex items-center justify-between text-sm border-t border-border pt-4">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {workspace.total_conversations} conversations
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(workspace.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
