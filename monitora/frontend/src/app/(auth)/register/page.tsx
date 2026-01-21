'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      const result = await register(email, password, fullName || undefined)

      if (result.user) {
        // Rediriger directement vers le dashboard
        router.push('/dashboard')
      }
    } catch (err: any) {
      if (err.message?.includes('already') || err.message?.includes('déjà')) {
        setError('Cet email est déjà utilisé')
      } else {
        setError(err.message || 'Une erreur est survenue')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Compte créé !</h1>
        <p className="text-gray-600 text-sm mb-6">
          Votre compte a été créé avec succès.
        </p>
        <Link href="/login">
          <Button variant="outline">Se connecter</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Créer un compte</h1>
      <p className="text-gray-600 text-sm mb-8">
        Commencez gratuitement avec MONITORA
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          label="Nom complet (optionnel)"
          placeholder="Jean Dupont"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          type="email"
          label="Email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type="password"
          label="Mot de passe"
          placeholder="Au moins 6 caractères"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          type="password"
          label="Confirmer le mot de passe"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-black font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
