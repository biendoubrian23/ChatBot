import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from './dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile with organization
  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  // Fetch workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .order('created_at', { ascending: false })

  // Fetch organization overview
  const { data: overview } = await supabase
    .from('organization_overview')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .single()

  return (
    <DashboardContent 
      profile={profile} 
      workspaces={workspaces || []} 
      overview={overview}
    />
  )
}
