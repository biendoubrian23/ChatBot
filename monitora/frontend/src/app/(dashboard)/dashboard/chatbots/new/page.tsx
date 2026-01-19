'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { 
  Bot, 
  ArrowLeft, 
  ArrowRight,
  Globe,
  MessageSquare,
  Sparkles,
  Check
} from 'lucide-react'

export default function NewChatbotPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    description: ''
  })

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length >= 2
      case 2:
        return true // Domain est optionnel
      case 3:
        return formData.welcomeMessage.trim().length > 0
      default:
        return false
    }
  }

  const createChatbot = async () => {
    setCreating(true)

    const user = await getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }

    try {
      const data = await api.workspaces.create({
        name: formData.name,
        description: formData.description
      })

      // Rediriger vers le nouveau chatbot
      router.push(`/dashboard/chatbots/${data.id}`)
    } catch (error) {
      console.error('Erreur création:', error)
      setCreating(false)
    }
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      createChatbot()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Breadcrumb
            items={[
              { label: 'Chatbots', href: '/dashboard' },
              { label: 'Nouveau chatbot' }
            ]}
          />
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors
                  ${s < step 
                    ? 'bg-green-500 text-white' 
                    : s === step 
                      ? 'bg-black text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {s < step ? <Check size={20} /> : s}
              </div>
              {s < 3 && (
                <div 
                  className={`w-20 h-1 mx-2 rounded ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Étape 1: Nom */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot size={32} className="text-purple-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Donnez un nom à votre chatbot
              </h1>
              <p className="text-gray-500">
                Ce nom sera visible par vos utilisateurs
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Assistant Support, Bot FAQ..."
                className="w-full px-4 py-3 text-lg border border-gray-200 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-black/10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Étape 2: Domaine */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe size={32} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Sur quel site sera-t-il déployé ?
              </h1>
              <p className="text-gray-500">
                Optionnel - vous pourrez le configurer plus tard
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <div className="flex items-center">
                <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-500">
                  https://
                </span>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="exemple.com"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Étape 3: Message d'accueil */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Message d'accueil
              </h1>
              <p className="text-gray-500">
                Premier message affiché à vos visiteurs
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <textarea
                value={formData.welcomeMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
              />

              {/* Preview */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-3">Aperçu</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-2">
                    <p className="text-sm text-gray-800">{formData.welcomeMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} className="mr-2" />
              Retour
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft size={16} className="mr-2" />
                Annuler
              </Button>
            </Link>
          )}

          <Button 
            className="bg-black hover:bg-gray-800 text-white"
            onClick={handleNext}
            disabled={!canProceed() || creating}
          >
            {creating ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Création...
              </>
            ) : step < 3 ? (
              <>
                Suivant
                <ArrowRight size={16} className="ml-2" />
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Créer le chatbot
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
