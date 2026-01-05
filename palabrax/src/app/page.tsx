import Link from 'next/link'
import { ArrowRight, MessageSquare, BarChart3, Upload, Code } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black" />
            <span className="text-xl font-semibold tracking-tight">PALABRAX</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-gray-600 hover:text-black transition-colors">
              Connexion
            </Link>
            <Link href="/register" className="btn-primary">
              Commencer
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-tight leading-tight">
            Déployez des chatbots IA
            <br />
            sur tous vos sites
          </h1>
          <p className="mt-6 text-xl text-gray-600 leading-relaxed">
            Une plateforme unique pour gérer, personnaliser et monitorer 
            vos assistants virtuels. Un script, plusieurs sites.
          </p>
          <div className="mt-10 flex gap-4">
            <Link href="/register" className="btn-primary text-base px-6 py-3">
              Créer un compte gratuit
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link href="/demo" className="btn-secondary text-base px-6 py-3">
              Voir la démo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight">
            Tout ce dont vous avez besoin
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Multi-sites"
              description="Déployez sur autant de sites que vous voulez depuis un seul dashboard."
            />
            <FeatureCard
              icon={<Upload className="w-6 h-6" />}
              title="Sources personnalisées"
              description="Uploadez vos FAQ, guides et documents. Le chatbot apprend automatiquement."
            />
            <FeatureCard
              icon={<Code className="w-6 h-6" />}
              title="Intégration simple"
              description="Un script à copier-coller. Compatible HTML, React, Next.js, Vue, WordPress."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Analytics détaillées"
              description="Suivez les conversations, questions fréquentes et satisfaction en temps réel."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Prêt à déployer votre premier chatbot ?
          </h2>
          <p className="mt-4 text-gray-600">
            Configuration en 5 minutes. Aucune carte bancaire requise.
          </p>
          <Link href="/register" className="mt-8 inline-flex btn-primary text-base px-8 py-3">
            Commencer gratuitement
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black" />
            <span className="text-sm font-medium">PALABRAX</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2026 PALABRAX. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card">
      <div className="w-12 h-12 border border-border flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
