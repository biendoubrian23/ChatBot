import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from './settings-content'

export default async function SettingsPage() {
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

  // Fetch organization members
  const { data: members } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('organization_id', profile?.organization_id)
    .order('created_at')

  // Fetch pending invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', profile?.organization_id)
    .eq('status', 'pending')

  return (
    <SettingsContent 
      user={user}
      profile={profile}
      members={members || []}
      invitations={invitations || []}
    />
  )
}
