'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

export default function NewWorkspacePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain: '',
    primaryColor: '#000000',
    botName: 'Assistant',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      
      // Get user profile for organization_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        setError('Organisation non trouvée')
        return
      }

      // Create workspace
      const { data: workspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name,
          description: formData.description || null,
          domain: formData.domain || null,
          settings: {
            bot_name: formData.botName,
            welcome_message: formData.welcomeMessage,
            placeholder: 'Tapez votre message...',
            primary_color: formData.primaryColor,
            position: 'bottom-right',
            language: 'fr',
          },
        })
        .select()
        .single()

      if (createError) {
        setError(createError.message)
        return
      }

      router.push(`/dashboard/workspaces/${workspace.id}`)
      router.refresh()
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/workspaces"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux workspaces
        </Link>
        <h1 className="text-2xl font-semibold">Nouveau workspace</h1>
        <p className="text-muted-foreground mt-1">
          Créez un nouveau workspace pour un site ou une application
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
            <CardDescription>
              Ces informations vous aideront à identifier votre workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nom du workspace *"
              placeholder="Mon site e-commerce"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                className="flex w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-1 min-h-[80px]"
                placeholder="Description optionnelle de ce workspace..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Input
              label="Domaine autorisé"
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              hint="Laissez vide pour autoriser tous les domaines (développement)"
            />
          </CardContent>
        </Card>

        {/* Chatbot Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration du chatbot</CardTitle>
            <CardDescription>
              Personnalisez l'apparence et le comportement de votre assistant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nom du bot"
              placeholder="Assistant"
              value={formData.botName}
              onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Message de bienvenue</label>
              <textarea
                className="flex w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-1 min-h-[80px]"
                placeholder="Bonjour ! Comment puis-je vous aider ?"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Couleur principale</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-10 w-20 border border-border cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-4 border border-red-200">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/dashboard/workspaces">
            <Button variant="outline" type="button">
              Annuler
            </Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            Créer le workspace
          </Button>
        </div>
      </form>
    </div>
  )
}
