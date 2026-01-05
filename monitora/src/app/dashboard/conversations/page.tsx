import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConversationsContent } from './conversations-content'

export default async function ConversationsPage() {
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

  // Fetch workspaces for filter
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('organization_id', profile?.organization_id)

  // Fetch recent conversations with workspace info
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      workspace:workspaces!inner(id, name, organization_id)
    `)
    .eq('workspace.organization_id', profile?.organization_id)
    .order('started_at', { ascending: false })
    .limit(100)

  return (
    <ConversationsContent 
      workspaces={workspaces || []} 
      conversations={conversations || []}
    />
  )
}
