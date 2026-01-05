'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Workspace } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  Code2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Palette,
  MessageSquare,
  Settings2
} from 'lucide-react'

type Chatbot = Workspace

export default function IntegrationPage() {
  const params = useParams()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [copied, setCopied] = useState(false)
  const [widgetConfig, setWidgetConfig] = useState({
    position: 'bottom-right',
    primaryColor: '#000000',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    placeholder: 'Tapez votre message...'
  })

  useEffect(() => {
    if (params.id) {
      loadChatbot(params.id as string)
    }
  }, [params.id])

  const loadChatbot = async (id: string) => {
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setChatbot(data)
    }
  }

  const getWidgetCode = () => {
    return `<!-- MONITORA Widget -->
<script>
  window.MONITORA_CONFIG = {
    workspaceId: "${chatbot?.id || 'WORKSPACE_ID'}",
    position: "${widgetConfig.position}",
    primaryColor: "${widgetConfig.primaryColor}",
    welcomeMessage: "${widgetConfig.welcomeMessage}",
    placeholder: "${widgetConfig.placeholder}"
  };
</script>
<script 
  src="https://cdn.monitora.io/widget.js" 
  async
></script>`
  }

  const copyCode = () => {
    navigator.clipboard.writeText(getWidgetCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Intégration</h1>
        <p className="text-gray-500 mt-1">
          Intégrez le chatbot sur votre site web
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration du widget */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings2 size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Personnalisation</h3>
              <p className="text-sm text-gray-500">Configurez l'apparence du widget</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'bottom-right', label: 'Bas droite' },
                  { value: 'bottom-left', label: 'Bas gauche' }
                ].map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setWidgetConfig(prev => ({ ...prev, position: pos.value }))}
                    className={`
                      px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors
                      ${widgetConfig.position === pos.value 
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur principale
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Message d'accueil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message d'accueil
              </label>
              <textarea
                value={widgetConfig.welcomeMessage}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={widgetConfig.placeholder}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, placeholder: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Code à intégrer */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Code2 size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Code d'intégration</h3>
              <p className="text-sm text-gray-500">Copiez ce code dans votre site</p>
            </div>
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              <code>{getWidgetCode()}</code>
            </pre>
            <Button
              onClick={copyCode}
              size="sm"
              className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
            >
              {copied ? (
                <>
                  <Check size={14} className="mr-1" />
                  Copié
                </>
              ) : (
                <>
                  <Copy size={14} className="mr-1" />
                  Copier
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              <strong>Instructions :</strong> Collez ce code juste avant la balise 
              <code className="mx-1 px-1 py-0.5 bg-blue-100 rounded">&lt;/body&gt;</code>
              de votre site web.
            </p>
          </div>
        </div>
      </div>

      {/* Domaines autorisés */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Globe size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Domaines autorisés</h3>
            <p className="text-sm text-gray-500">Le widget ne fonctionnera que sur ces domaines</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="exemple.com"
              defaultValue={chatbot?.domain || ''}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <Button variant="outline">
              Ajouter
            </Button>
          </div>

          {chatbot?.domain && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <Globe size={16} className="text-gray-400" />
              <span className="text-sm text-gray-700">{chatbot.domain}</span>
              <a 
                href={`https://${chatbot.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
