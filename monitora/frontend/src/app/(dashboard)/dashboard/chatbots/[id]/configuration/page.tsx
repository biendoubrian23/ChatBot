'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Workspace } from '@/lib/supabase'
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
  MessageSquare
} from 'lucide-react'

type Chatbot = Workspace

interface RAGConfig {
  model: string
  temperature: number
  max_tokens: number
  system_prompt: string
}

export default function ConfigurationPage() {
  const params = useParams()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<RAGConfig>({
    model: 'mistral-small-latest',
    temperature: 0.7,
    max_tokens: 1024,
    system_prompt: ''
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
      // Charger la config depuis rag_config directement
      if (data.rag_config) {
        setConfig(prev => ({ ...prev, ...data.rag_config }))
      }
    }
  }

  const saveConfig = async () => {
    if (!chatbot) return

    setSaving(true)

    // Sauvegarder rag_config directement (pas dans settings)
    const { error } = await supabase
      .from('workspaces')
      .update({ rag_config: config })
      .eq('id', chatbot.id)

    setSaving(false)

    if (!error) {
      // Mise à jour locale
      setChatbot(prev => prev ? { ...prev, rag_config: config } : null)
    }
  }

  const resetToDefaults = () => {
    setConfig({
      model: 'mistral-small-latest',
      temperature: 0.7,
      max_tokens: 1024,
      system_prompt: ''
    })
  }

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
        {/* Colonne gauche - Modèle LLM */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Modèle LLM</h3>
              <p className="text-sm text-gray-500">Choisissez le modèle de langage</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { value: 'mistral-small-latest', label: 'Mistral Small', desc: 'Rapide et économique' },
              { value: 'mistral-medium-latest', label: 'Mistral Medium', desc: 'Équilibré' },
              { value: 'mistral-large-latest', label: 'Mistral Large', desc: 'Plus puissant' }
            ].map((model) => (
              <button
                key={model.value}
                onClick={() => setConfig(prev => ({ ...prev, model: model.value }))}
                className={`
                  p-4 rounded-lg border-2 text-left transition-colors
                  ${config.model === model.value 
                    ? 'border-black bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <p className="font-medium text-gray-900">{model.label}</p>
                <p className="text-xs text-gray-500 mt-1">{model.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Colonne droite - Génération */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Thermometer size={20} className="text-orange-600" />
            </div>
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
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare size={20} className="text-blue-600" />
          </div>
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
