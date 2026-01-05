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
  Info
} from 'lucide-react'

type Chatbot = Workspace

interface RAGConfig {
  model: string
  temperature: number
  max_tokens: number
  chunk_size: number
  chunk_overlap: number
  top_k: number
}

export default function ConfigurationPage() {
  const params = useParams()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<RAGConfig>({
    model: 'mistral-small-latest',
    temperature: 0.7,
    max_tokens: 1024,
    chunk_size: 500,
    chunk_overlap: 50,
    top_k: 5
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
      // Charger la config depuis settings si disponible
      if (data.settings?.rag_config) {
        setConfig(prev => ({ ...prev, ...data.settings.rag_config }))
      }
    }
  }

  const saveConfig = async () => {
    if (!chatbot) return

    setSaving(true)

    const { error } = await supabase
      .from('workspaces')
      .update({
        settings: {
          ...chatbot.settings,
          rag_config: config
        }
      })
      .eq('id', chatbot.id)

    setSaving(false)

    if (!error) {
      // Notification succès
    }
  }

  const resetToDefaults = () => {
    setConfig({
      model: 'mistral-small-latest',
      temperature: 0.7,
      max_tokens: 1024,
      chunk_size: 500,
      chunk_overlap: 50,
      top_k: 5
    })
  }

  return (
    <div className="max-w-3xl space-y-8">
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

      {/* Modèle LLM */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

      {/* Paramètres de génération */}
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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

      {/* Paramètres RAG */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Scissors size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Indexation (RAG)</h3>
            <p className="text-sm text-gray-500">Configuration du découpage des documents</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Chunk size */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Taille des chunks</span>
                <div className="group relative">
                  <Info size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Nombre de caractères par segment. Plus grand = plus de contexte.
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500">{config.chunk_size} caractères</span>
            </div>
            <Slider
              value={config.chunk_size}
              onChange={(value) => setConfig(prev => ({ ...prev, chunk_size: value }))}
              min={200}
              max={2000}
              step={100}
            />
          </div>

          {/* Chunk overlap */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Chevauchement</span>
                <div className="group relative">
                  <Info size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Nombre de caractères partagés entre chunks consécutifs.
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500">{config.chunk_overlap} caractères</span>
            </div>
            <Slider
              value={config.chunk_overlap}
              onChange={(value) => setConfig(prev => ({ ...prev, chunk_overlap: value }))}
              min={0}
              max={500}
              step={25}
            />
          </div>

          {/* Top K */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Documents similaires (Top K)</span>
                <div className="group relative">
                  <Info size={14} className="text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Nombre de chunks similaires à récupérer pour chaque question.
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500">{config.top_k}</span>
            </div>
            <Slider
              value={config.top_k}
              onChange={(value) => setConfig(prev => ({ ...prev, top_k: value }))}
              min={1}
              max={20}
              step={1}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
