'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-black border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-gray-600 text-sm mt-1">
          Gérez votre compte et vos préférences
        </p>
      </div>

      {/* Compte */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">ID Utilisateur</label>
            <p className="mt-1 font-mono text-sm text-gray-600">{user?.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Membre depuis</label>
            <p className="mt-1">
              {new Date(user?.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-border">
            <div>
              <div className="font-semibold">Plan Gratuit</div>
              <div className="text-sm text-gray-600">
                1 workspace, 100 conversations/mois
              </div>
            </div>
            <Button variant="outline" disabled>
              Upgrader (bientôt)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Déconnexion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
