import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { WorkspaceDetail } from './workspace-detail'
import { DEFAULT_RAG_CONFIG } from '@/lib/types'

interface WorkspacePageProps {
  params: Promise<{ id: string }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch workspace
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !workspace) {
    notFound()
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })

  // Fetch recent conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('workspace_id', id)
    .order('started_at', { ascending: false })
    .limit(10)

  // Fetch RAG configuration
  const { data: ragConfig } = await supabase
    .from('workspace_rag_config')
    .select('*')
    .eq('workspace_id', id)
    .single()

  return (
    <WorkspaceDetail 
      workspace={workspace} 
      documents={documents || []} 
      conversations={conversations || []}
      ragConfig={ragConfig || DEFAULT_RAG_CONFIG}
    />
  )
}
