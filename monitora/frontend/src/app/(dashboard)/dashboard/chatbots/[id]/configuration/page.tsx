'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Workspace } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Save,
  Brain,
  Thermometer,
  FileText,
  Scissors,
  RotateCcw,
  Info,
  MessageSquare,
  ChevronDown,
  Zap
} from 'lucide-react'

type Chatbot = Workspace

interface RAGConfig {
  model: string
  temperature: number
  max_tokens: number
  system_prompt: string
  streaming_enabled: boolean
}

const MODELS = [
  { value: 'mistral-small-latest', label: 'Mistral Small', desc: 'Rapide et économique' },
  { value: 'mistral-medium-latest', label: 'Mistral Medium', desc: 'Équilibré' },
  { value: 'mistral-large-latest', label: 'Mistral Large', desc: 'Plus puissant' }
]

export default function ConfigurationPage() {
  const params = useParams()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [saving, setSaving] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [config, setConfig] = useState<RAGConfig>({
    model: 'mistral-small-latest',
    temperature: 0.7,
    max_tokens: 1024,
    system_prompt: '',
    streaming_enabled: true
  })

  useEffect(() => {
    if (params.id) {
      loadChatbot(params.id as string)
    }
  }, [params.id])

  const loadChatbot = async (id: string) => {
    try {
      const data = await api.workspaces.get(id)

      if (data) {
        setChatbot(data)
        // Charger la config depuis rag_config directement
        if (data.rag_config) {
          setConfig(prev => ({
            ...prev,
            ...data.rag_config,
            model: data.rag_config.llm_model || prev.model,
            // @ts-ignore - streaming_enabled might be in JSON but not in interface
            streaming_enabled: data.rag_config.streaming_enabled ?? prev.streaming_enabled
          }))
        }
      }
    } catch (error) {
      console.error('Erreur chargement chatbot:', error)
    }
  }

  const saveConfig = async () => {
    if (!chatbot) return

    setSaving(true)

    try {
      await api.ragConfig.update(chatbot.id, config)
      // Mise à jour locale
      const updatedRagConfig = {
        ...chatbot.rag_config,
        llm_model: config.model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        system_prompt: config.system_prompt
      }
      setChatbot(prev => prev ? { ...prev, rag_config: updatedRagConfig } : null)
    } catch (error) {
      console.error('Erreur sauvegarde config:', error)
    }

    setSaving(false)
  }

  const resetToDefaults = () => {
    setConfig({
      model: 'mistral-small-latest',
      temperature: 0.7,
      max_tokens: 1024,
      system_prompt: '',
      streaming_enabled: true
    })
  }

  const selectedModel = MODELS.find(m => m.value === config.model) || MODELS[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuration IA</h1>
          <p className="text-gray-500 mt-1">
            Personnalisez le comportement de votre chatbot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw size={16} className="mr-2" />
            Réinitialiser
          </Button>
          <Button
            className="bg-black hover:bg-gray-800 text-white"
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche - Modèle LLM + Streaming */}
        <div className="space-y-6">
          {/* Modèle LLM - Dropdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Brain size={20} className="text-purple-600" />
              <div>
                <h3 className="font-medium text-gray-900">Modèle LLM</h3>
                <p className="text-sm text-gray-500">Choisissez le modèle de langage</p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{selectedModel.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedModel.desc}</p>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                  {MODELS.map((model) => (
                    <button
                      key={model.value}
                      onClick={() => {
                        setConfig(prev => ({ ...prev, model: model.value }))
                        setModelDropdownOpen(false)
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${config.model === model.value ? 'bg-gray-50' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{model.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{model.desc}</p>
                        </div>
                        {config.model === model.value && (
                          <div className="w-2 h-2 bg-black rounded-full" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Toggle Streaming */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-green-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Réponse en streaming</h3>
                  <p className="text-sm text-gray-500">Affiche la réponse mot par mot</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => setConfig(prev => ({ ...prev, streaming_enabled: !prev.streaming_enabled }))}
                className={`relative w-14 h-8 rounded-full transition-colors ${config.streaming_enabled ? 'bg-black' : 'bg-gray-300'
                  }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${config.streaming_enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              {config.streaming_enabled
                ? 'Les réponses s\'afficheront progressivement comme une vraie conversation'
                : 'Les réponses s\'afficheront en une seule fois après génération complète'
              }
            </p>
          </div>
        </div>

        {/* Colonne droite - Génération */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Thermometer size={20} className="text-orange-600" />
            <div>
              <h3 className="font-medium text-gray-900">Génération</h3>
              <p className="text-sm text-gray-500">Contrôlez la créativité des réponses</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Température</span>
                  <div className="group relative">
                    <Info size={14} className="text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Contrôle la créativité. Plus élevé = plus créatif mais moins précis.
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{config.temperature}</span>
              </div>
              <Slider
                value={config.temperature}
                onChange={(value) => setConfig(prev => ({ ...prev, temperature: value }))}
                min={0}
                max={1}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Précis</span>
                <span>Créatif</span>
              </div>
            </div>

            {/* Max tokens */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Tokens max</span>
                  <div className="group relative">
                    <Info size={14} className="text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Longueur maximale des réponses générées.
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{config.max_tokens}</span>
              </div>
              <Slider
                value={config.max_tokens}
                onChange={(value) => setConfig(prev => ({ ...prev, max_tokens: value }))}
                min={256}
                max={4096}
                step={128}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>256</span>
                <span>4096</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Prompt - Pleine largeur */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare size={20} className="text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">Instructions du chatbot</h3>
            <p className="text-sm text-gray-500">Définissez le comportement et la personnalité de votre assistant</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">System Prompt</span>
            <div className="group relative">
              <Info size={14} className="text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Instructions données au modèle pour définir son rôle, son ton et ses règles de réponse.
              </div>
            </div>
          </div>
          <textarea
            value={config.system_prompt}
            onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
            placeholder="Ex: Tu es l'assistant de [Entreprise], spécialiste en [domaine]. Réponds toujours en français, de manière professionnelle et concise..."
            className="w-full h-48 p-4 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10 font-mono"
          />
          <p className="text-xs text-gray-400">
            💡 Conseil : Soyez précis sur le rôle, le ton, les règles et les limites du chatbot.
          </p>
        </div>
      </div>
    </div>
  )
}
