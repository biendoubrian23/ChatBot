import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-sm w-full">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-black transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
          
          <h1 className="text-3xl font-semibold tracking-tight">Créer un compte</h1>
          <p className="mt-2 text-gray-600">
            Commencez à déployer vos chatbots en quelques minutes.
          </p>
          
          <form className="mt-10 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Nom complet
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input"
                placeholder="Jean Dupont"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email professionnel
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="vous@entreprise.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="Minimum 8 caractères"
              />
            </div>
            
            <div>
              <label className="flex items-start">
                <input type="checkbox" className="w-4 h-4 border border-border mt-0.5" required />
                <span className="ml-2 text-sm text-gray-600">
                  J'accepte les{' '}
                  <Link href="/terms" className="text-black hover:underline">
                    conditions d'utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link href="/privacy" className="text-black hover:underline">
                    politique de confidentialité
                  </Link>
                </span>
              </label>
            </div>
            
            <button type="submit" className="btn-primary w-full py-3">
              Créer mon compte
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-black font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
      
      {/* Right Panel - Features */}
      <div className="hidden lg:flex flex-1 bg-muted flex-col justify-center px-16 border-l border-border">
        <h2 className="text-2xl font-semibold">Inclus dans MONITORA</h2>
        <ul className="mt-8 space-y-4">
          <Feature text="Workspaces illimités" />
          <Feature text="Upload de documents (PDF, TXT, MD)" />
          <Feature text="Script d'intégration universel" />
          <Feature text="Analytics en temps réel" />
          <Feature text="Historique des conversations" />
          <Feature text="Support prioritaire" />
        </ul>
      </div>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center text-gray-700">
      <div className="w-5 h-5 border border-black flex items-center justify-center mr-3">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {text}
    </li>
  )
}
