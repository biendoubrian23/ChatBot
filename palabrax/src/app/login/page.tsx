import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
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
          
          <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
          <p className="mt-2 text-gray-600">
            Accédez à votre tableau de bord PALABRAX.
          </p>
          
          <form className="mt-10 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="vous@exemple.com"
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
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 border border-border" />
                <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-gray-600 hover:text-black">
                Mot de passe oublié ?
              </Link>
            </div>
            
            <button type="submit" className="btn-primary w-full py-3">
              Se connecter
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-black font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
      
      {/* Right Panel - Branding */}
      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center border-l border-border">
        <div className="text-center">
          <div className="w-20 h-20 bg-black mx-auto" />
          <h2 className="mt-8 text-2xl font-semibold">PALABRAX</h2>
          <p className="mt-2 text-gray-600">Chatbot Management Platform</p>
        </div>
      </div>
    </div>
  )
}
