import Link from 'next/link'
import { MessageSquare, BarChart3, Upload, Code, ArrowRight, Check } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-xl">MONITORA</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm hover:underline">
              Connexion
            </Link>
            <Link 
              href="/register" 
              className="bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Déployez des chatbots IA sur vos sites en quelques minutes
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            MONITORA vous permet de créer, personnaliser et monitorer vos chatbots 
            depuis une interface centralisée. Un simple script à copier-coller.
          </p>
          <div className="flex gap-4">
            <Link 
              href="/register" 
              className="bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
            >
              Créer un compte <ArrowRight size={16} />
            </Link>
            <Link 
              href="#features" 
              className="border border-black px-6 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-16 text-center">
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<MessageSquare size={24} />}
              title="Chat IA"
              description="Chatbot intelligent basé sur vos documents et FAQ"
            />
            <FeatureCard 
              icon={<Upload size={24} />}
              title="Upload facile"
              description="Importez vos PDF, TXT, ou Markdown en quelques clics"
            />
            <FeatureCard 
              icon={<Code size={24} />}
              title="Intégration simple"
              description="Un script à copier-coller sur votre site"
            />
            <FeatureCard 
              icon={<BarChart3 size={24} />}
              title="Analytics"
              description="Suivez les conversations et performances"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-24 bg-muted">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-16 text-center">
            Comment ça marche
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <Step 
              number="1"
              title="Créez un workspace"
              description="Configurez votre chatbot avec un nom et un domaine autorisé"
            />
            <Step 
              number="2"
              title="Uploadez vos documents"
              description="Importez vos FAQ, guides et documents sources"
            />
            <Step 
              number="3"
              title="Intégrez le widget"
              description="Copiez le script généré sur votre site"
            />
          </div>
        </div>
      </section>

      {/* Pricing simple */}
      <section className="border-t border-border py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Gratuit pour commencer
          </h2>
          <p className="text-gray-600 mb-12">
            Testez MONITORA sans engagement
          </p>
          <div className="max-w-sm mx-auto border border-border p-8">
            <div className="text-4xl font-bold mb-2">0€</div>
            <div className="text-gray-600 mb-6">par mois</div>
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <Check size={16} /> 1 workspace
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} /> 100 conversations/mois
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} /> 5 documents max
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} /> Analytics basiques
              </li>
            </ul>
            <Link 
              href="/register" 
              className="block w-full bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-600">
          © 2026 MONITORA - BiendouCorp. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="border border-border p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}
