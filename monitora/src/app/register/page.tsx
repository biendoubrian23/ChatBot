'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, ArrowRight, Eye, EyeOff, Check } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
            <span className="text-xl font-semibold">MONITORA</span>
          </Link>

          <h1 className="text-2xl font-semibold mb-2">Créer un compte</h1>
          <p className="text-muted-foreground mb-8">
            Commencez à déployer vos chatbots en quelques minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom complet"
              type="text"
              placeholder="Jean Dupont"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />

            <Input
              label="Email professionnel"
              type="email"
              placeholder="vous@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 border border-border mt-0.5"
              />
              <span className="text-sm text-muted-foreground">
                J'accepte les{' '}
                <Link href="/terms" className="text-foreground hover:underline">
                  conditions d'utilisation
                </Link>{' '}
                et la{' '}
                <Link href="/privacy" className="text-foreground hover:underline">
                  politique de confidentialité
                </Link>
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-3 border border-red-200">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Créer mon compte
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden lg:flex flex-1 bg-foreground text-background items-center justify-center p-8">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold mb-8">Inclus dans MONITORA</h2>
          <ul className="space-y-4">
            <Feature text="Workspaces illimités" />
            <Feature text="Upload de documents (PDF, TXT, MD)" />
            <Feature text="Script d'intégration universel" />
            <Feature text="Analytics en temps réel" />
            <Feature text="Historique des conversations" />
            <Feature text="Support prioritaire" />
          </ul>
          
          <div className="mt-12 p-6 border border-background/20">
            <p className="text-sm text-background/70">
              "MONITORA nous a permis de déployer notre chatbot sur 8 sites différents
              en moins d'une journée. L'interface est intuitive et le monitoring
              nous donne une visibilité totale."
            </p>
            <p className="mt-4 text-sm font-medium">— Client satisfait</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 border border-background/40 flex items-center justify-center">
        <Check className="h-3 w-3" />
      </div>
      <span className="text-background/90">{text}</span>
    </li>
  )
}
