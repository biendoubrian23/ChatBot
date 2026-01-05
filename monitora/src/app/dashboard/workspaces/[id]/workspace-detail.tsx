'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Settings,
  FileText,
  MessageSquare,
  Code,
  Copy,
  Check,
  Upload,
  Trash2,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  Beaker,
  Sliders,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dropdown,
  ConfirmDialog,
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, Document, Conversation, WorkspaceRAGConfig } from '@/lib/types'
import { RAGConfigPanel } from '@/components/rag-config-panel'
import { ChatTestPanel } from '@/components/chat-test-panel'

interface WorkspaceDetailProps {
  workspace: Workspace
  documents: Document[]
  conversations: Conversation[]
  ragConfig?: WorkspaceRAGConfig
}

export function WorkspaceDetail({ workspace, documents, conversations, ragConfig }: WorkspaceDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const widgetScript = `<script 
  src="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitora.app'}/widget.js" 
  data-workspace="${workspace.id}"
  data-api-key="${workspace.api_key}"
  async>
</script>`

  async function copyScript() {
    await navigator.clipboard.writeText(widgetScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDeleteWorkspace() {
    setIsDeleting(true)
    try {
      const supabase = createClient()
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      router.push('/dashboard/workspaces')
      router.refresh()
    } catch (err) {
      console.error('Error deleting workspace:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/workspaces"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux workspaces
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 flex items-center justify-center text-white text-lg font-semibold"
              style={{ backgroundColor: workspace.settings?.primary_color || '#000' }}
            >
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{workspace.name}</h1>
                <Badge variant={workspace.is_active ? 'success' : 'default'}>
                  {workspace.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              {workspace.domain && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-4 w-4" />
                  {workspace.domain}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/workspaces/${workspace.id}/settings`}>
            <Button variant="outline" leftIcon={<Settings className="h-4 w-4" />}>
              Paramètres
            </Button>
          </Link>
          <Dropdown
            trigger={
              <Button variant="outline" className="px-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
            items={[
              {
                label: 'Supprimer',
                value: 'delete',
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
                onClick: () => setShowDeleteDialog(true),
              },
            ]}
            align="right"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{workspace.total_conversations}</p>
            <p className="text-sm text-muted-foreground">Conversations totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{workspace.total_messages}</p>
            <p className="text-sm text-muted-foreground">Messages échangés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{documents.filter(d => d.status === 'indexed').length}</p>
            <p className="text-sm text-muted-foreground">Documents indexés</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="test">
            <Beaker className="h-4 w-4 mr-1" />
            Tester
          </TabsTrigger>
          <TabsTrigger value="config">
            <Sliders className="h-4 w-4 mr-1" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="integration">Intégration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab workspace={workspace} documents={documents} conversations={conversations} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab workspaceId={workspace.id} documents={documents} />
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardContent className="p-6">
              <ChatTestPanel workspaceId={workspace.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <RAGConfigPanel workspaceId={workspace.id} initialConfig={ragConfig} />
        </TabsContent>

        <TabsContent value="conversations">
          <ConversationsTab conversations={conversations} />
        </TabsContent>

        <TabsContent value="integration">
          <IntegrationTab 
            workspace={workspace} 
            widgetScript={widgetScript} 
            copied={copied} 
            onCopy={copyScript} 
          />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteWorkspace}
        title="Supprimer ce workspace ?"
        description="Cette action est irréversible. Toutes les données associées (documents, conversations) seront supprimées."
        confirmText="Supprimer"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

// Overview Tab
function OverviewTab({ 
  workspace, 
  documents, 
  conversations 
}: { 
  workspace: Workspace
  documents: Document[]
  conversations: Conversation[]
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents récents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document uploadé</p>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{doc.original_name}</span>
                  </div>
                  <Badge variant={getStatusVariant(doc.status)}>
                    {getStatusLabel(doc.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversations récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune conversation</p>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conv) => (
                <div key={conv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{conv.messages_count} messages</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.started_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Documents Tab
function DocumentsTab({ workspaceId, documents }: { workspaceId: string; documents: Document[] }) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const supabase = createClient()

    try {
      for (const file of Array.from(files)) {
        const filename = `${Date.now()}-${file.name}`
        const filePath = `${workspaceId}/${filename}`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        // Create document record
        const { data: { user } } = await supabase.auth.getUser()
        
        await supabase.from('documents').insert({
          workspace_id: workspaceId,
          filename,
          original_name: file.name,
          file_path: filePath,
          file_type: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          mime_type: file.type,
          status: 'pending',
          uploaded_by: user?.id,
        })
      }

      router.refresh()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Documents sources</CardTitle>
          <CardDescription>
            Fichiers utilisés pour enrichir les réponses du chatbot
          </CardDescription>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.docx"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} disabled={isUploading}>
            {isUploading ? 'Upload...' : 'Upload'}
          </Button>
        </label>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucun document uploadé</p>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.md,.docx"
                className="hidden"
                onChange={handleUpload}
              />
              <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>
                Uploader des documents
              </Button>
            </label>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{doc.original_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="uppercase text-xs">{doc.file_type}</TableCell>
                  <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(doc.status)}>
                      {getStatusLabel(doc.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Dropdown
                      trigger={
                        <button className="p-1 hover:bg-muted">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                      items={[
                        {
                          label: 'Re-indexer',
                          value: 'reindex',
                          icon: <RefreshCw className="h-4 w-4" />,
                          onClick: () => {},
                        },
                        {
                          label: 'Supprimer',
                          value: 'delete',
                          icon: <Trash2 className="h-4 w-4" />,
                          danger: true,
                          onClick: () => {},
                        },
                      ]}
                      align="right"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Conversations Tab
function ConversationsTab({ conversations }: { conversations: Conversation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique des conversations</CardTitle>
        <CardDescription>
          Dernières conversations avec les visiteurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune conversation pour l'instant</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visiteur</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Satisfaction</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conv) => (
                <TableRow key={conv.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    {conv.visitor_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{conv.messages_count}</TableCell>
                  <TableCell>
                    {conv.ended_at
                      ? formatDuration(new Date(conv.started_at), new Date(conv.ended_at))
                      : 'En cours'}
                  </TableCell>
                  <TableCell>
                    {conv.satisfaction ? `${conv.satisfaction}/5` : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(conv.started_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// Integration Tab
function IntegrationTab({
  workspace,
  widgetScript,
  copied,
  onCopy,
}: {
  workspace: Workspace
  widgetScript: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Script d'intégration</CardTitle>
          <CardDescription>
            Copiez ce script et collez-le avant la balise &lt;/body&gt; de votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 bg-muted text-sm overflow-x-auto border border-border">
              <code>{widgetScript}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={onCopy}
              leftIcon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            >
              {copied ? 'Copié !' : 'Copier'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clé API</CardTitle>
          <CardDescription>
            Utilisez cette clé pour les intégrations avancées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted text-sm border border-border truncate">
              {workspace.api_key}
            </code>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(workspace.api_key)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemples d'intégration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">React / Next.js</h4>
            <pre className="p-4 bg-muted text-sm overflow-x-auto border border-border">
              <code>{`import Script from 'next/script'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script
        src="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitora.app'}/widget.js"
        data-workspace="${workspace.id}"
        strategy="lazyOnload"
      />
    </>
  )
}`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helpers
function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'indexed':
      return 'success'
    case 'indexing':
    case 'uploading':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'default'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'indexed':
      return 'Indexé'
    case 'indexing':
      return 'Indexation...'
    case 'uploading':
      return 'Upload...'
    case 'pending':
      return 'En attente'
    case 'error':
      return 'Erreur'
    default:
      return status
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDuration(start: Date, end: Date): string {
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}
