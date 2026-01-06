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
  MessageSquare,
  Settings2,
  X,
  Send
} from 'lucide-react'

type Chatbot = Workspace

export default function IntegrationPage() {
  const params = useParams()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [widgetConfig, setWidgetConfig] = useState({
    position: 'bottom-right',
    primaryColor: '#000000',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    placeholder: 'Tapez votre message...',
    widgetWidth: 380,
    widgetHeight: 500
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
      // Charger la config existante
      if (data.widget_config) {
        setWidgetConfig(prev => ({ ...prev, ...data.widget_config }))
      }
    }
  }

  // Marquer comme modifié quand la config change
  const updateConfig = (updates: Partial<typeof widgetConfig>) => {
    setWidgetConfig(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
    setSaved(false)
  }

  const saveConfig = async () => {
    if (!chatbot?.id) return
    setSaving(true)
    
    await supabase
      .from('workspaces')
      .update({ widget_config: widgetConfig })
      .eq('id', chatbot.id)
    
    setSaving(false)
    setSaved(true)
    setHasChanges(false)
    
    // Réinitialiser le message "Sauvegardé" après 2 secondes
    setTimeout(() => setSaved(false), 2000)
  }

  const getWidgetCode = () => {
    return `<!-- MONITORA Widget -->
<script>
  window.MONITORA_CONFIG = {
    workspaceId: "${chatbot?.id || 'WORKSPACE_ID'}",
    position: "${widgetConfig.position}",
    primaryColor: "${widgetConfig.primaryColor}",
    welcomeMessage: "${widgetConfig.welcomeMessage}",
    placeholder: "${widgetConfig.placeholder}",
    width: ${widgetConfig.widgetWidth},
    height: ${widgetConfig.widgetHeight}
  };
</script>
<script 
  src="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/widget/embed.js" 
  async
></script>`
  }

  const copyCode = () => {
    navigator.clipboard.writeText(getWidgetCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Intégration</h1>
          <p className="text-gray-500 mt-1">
            Intégrez le chatbot sur votre site web
          </p>
        </div>
        {saving && (
          <span className="text-sm text-gray-500">Enregistrement...</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration du widget */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings2 size={20} className="text-gray-700" />
                <div>
                  <h3 className="font-medium text-gray-900">Personnalisation</h3>
                  <p className="text-sm text-gray-500">Configurez l'apparence du widget</p>
                </div>
              </div>
              <Button
                onClick={saveConfig}
                disabled={saving || !hasChanges}
                className={`${
                  saved 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : hasChanges 
                      ? 'bg-black hover:bg-gray-800' 
                      : 'bg-gray-300'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sauvegarde...
                  </>
                ) : saved ? (
                  <>
                    <Check size={16} className="mr-2" />
                    Sauvegardé
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
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
                      onClick={() => updateConfig({ position: pos.value })}
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
                    onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={widgetConfig.primaryColor}
                    onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Taille du widget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Largeur ({widgetConfig.widgetWidth}px)
                </label>
                <input
                  type="range"
                  min="300"
                  max="500"
                  value={widgetConfig.widgetWidth}
                  onChange={(e) => updateConfig({ widgetWidth: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hauteur ({widgetConfig.widgetHeight}px)
                </label>
                <input
                  type="range"
                  min="400"
                  max="700"
                  value={widgetConfig.widgetHeight}
                  onChange={(e) => updateConfig({ widgetHeight: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              {/* Message d'accueil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message d'accueil
                </label>
                <textarea
                  value={widgetConfig.welcomeMessage}
                  onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
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
                  onChange={(e) => updateConfig({ placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Code à intégrer */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Code2 size={20} className="text-gray-700" />
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
          </div>

          {/* Domaines autorisés */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe size={20} className="text-gray-700" />
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

        {/* Preview du widget en temps réel */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-gray-100 rounded-xl p-6 min-h-[600px] flex items-center justify-center">
            <div className="text-center mb-4 absolute top-6">
              <span className="text-sm text-gray-500">Aperçu en temps réel</span>
            </div>
            
            {/* Widget Preview */}
            <div 
              className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{
                width: `${widgetConfig.widgetWidth}px`,
                height: `${widgetConfig.widgetHeight}px`,
                maxWidth: '100%'
              }}
            >
              {/* Header du widget */}
              <div 
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: widgetConfig.primaryColor }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{chatbot?.name || 'Assistant'}</p>
                    <p className="text-white/70 text-xs">En ligne</p>
                  </div>
                </div>
                <button className="text-white/70 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
                <div className="flex gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: widgetConfig.primaryColor }}
                  >
                    <MessageSquare size={12} className="text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm max-w-[85%]">
                    <p className="text-sm text-gray-800">{widgetConfig.welcomeMessage}</p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={widgetConfig.placeholder}
                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm outline-none"
                    disabled
                  />
                  <button 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: widgetConfig.primaryColor }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
