import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsContent } from './analytics-content'

export default async function AnalyticsPage() {
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
    .select('id, name, total_conversations, total_messages')
    .eq('organization_id', profile?.organization_id)

  // Fetch analytics for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: analytics } = await supabase
    .from('analytics_daily')
    .select('*')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  return (
    <AnalyticsContent 
      workspaces={workspaces || []} 
      analytics={analytics || []}
    />
  )
}
