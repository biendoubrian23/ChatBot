'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Brain,
  FileText,
  Search,
  Database,
  Save,
  RotateCcw,
  Loader2,
  Check,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Slider,
  Select,
} from '@/components/ui'
import {
  type WorkspaceRAGConfig,
  type LLMProvider,
  DEFAULT_RAG_CONFIG,
  RAG_CONFIG_CONSTRAINTS,
  LLM_MODELS,
} from '@/lib/types'
import { API_ENDPOINTS } from '@/lib/config'

interface RAGConfigPanelProps {
  workspaceId: string
  initialConfig?: Partial<WorkspaceRAGConfig>
  onSave?: (config: Partial<WorkspaceRAGConfig>) => Promise<void>
}

export function RAGConfigPanel({ workspaceId, initialConfig, onSave }: RAGConfigPanelProps) {
  const [config, setConfig] = useState<Partial<WorkspaceRAGConfig>>({
    ...DEFAULT_RAG_CONFIG,
    ...initialConfig,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Track changes
  useEffect(() => {
    const initialJson = JSON.stringify(initialConfig || DEFAULT_RAG_CONFIG)
    const currentJson = JSON.stringify(config)
    setHasChanges(initialJson !== currentJson)
  }, [config, initialConfig])

  // Update a config value
  function updateConfig<K extends keyof WorkspaceRAGConfig>(
    key: K,
    value: WorkspaceRAGConfig[K]
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  // Reset to defaults
  function resetToDefaults() {
    setConfig(DEFAULT_RAG_CONFIG)
  }

  // Save configuration
  async function handleSave() {
    setSaving(true)
    setSaved(false)
    
    try {
      if (onSave) {
        await onSave(config)
      } else {
        // Call backend API directly
        const response = await fetch(API_ENDPOINTS.ragConfig(workspaceId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        
        if (!response.ok) {
          throw new Error('Failed to save configuration')
        }
      }
      
      setSaved(true)
      setHasChanges(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  // Get available models for selected provider
  const availableModels = LLM_MODELS[config.llm_provider as LLMProvider] || LLM_MODELS.mistral

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration RAG
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez les paramètres de votre chatbot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Réinitialiser
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            isLoading={saving}
            leftIcon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {saved ? 'Enregistré' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* LLM Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Modèle LLM
          </CardTitle>
          <CardDescription>
            Configurez le modèle de langage utilisé pour les réponses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <Select
                value={config.llm_provider || 'mistral'}
                onChange={(value) => {
                  updateConfig('llm_provider', value as LLMProvider)
                  // Reset model when provider changes
                  const models = LLM_MODELS[value as LLMProvider]
                  if (models && models[0]) {
                    updateConfig('llm_model', models[0].value)
                  }
                }}
                options={[
                  { label: 'Mistral AI', value: 'mistral' },
                  { label: 'Groq', value: 'groq' },
                  { label: 'OpenAI', value: 'openai' },
                  { label: 'Ollama (local)', value: 'ollama' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Modèle</label>
              <Select
                value={config.llm_model || 'mistral-small-latest'}
                onChange={(value) => updateConfig('llm_model', value)}
                options={availableModels}
              />
            </div>
          </div>

          <Slider
            label="Température"
            hint="Plus bas = réponses précises et cohérentes. Plus haut = réponses créatives et variées."
            value={config.temperature}
            onChange={(value) => updateConfig('temperature', value)}
            min={RAG_CONFIG_CONSTRAINTS.temperature.min}
            max={RAG_CONFIG_CONSTRAINTS.temperature.max}
            step={RAG_CONFIG_CONSTRAINTS.temperature.step}
            valueFormatter={(v) => v.toFixed(2)}
          />

          <Slider
            label="Tokens maximum"
            hint="Nombre maximum de tokens dans la réponse générée"
            value={config.max_tokens}
            onChange={(value) => updateConfig('max_tokens', value)}
            min={RAG_CONFIG_CONSTRAINTS.max_tokens.min}
            max={RAG_CONFIG_CONSTRAINTS.max_tokens.max}
            step={RAG_CONFIG_CONSTRAINTS.max_tokens.step}
          />

          <Slider
            label="Top P"
            hint="Contrôle la diversité des réponses (nucleus sampling)"
            value={config.top_p}
            onChange={(value) => updateConfig('top_p', value)}
            min={RAG_CONFIG_CONSTRAINTS.top_p.min}
            max={RAG_CONFIG_CONSTRAINTS.top_p.max}
            step={RAG_CONFIG_CONSTRAINTS.top_p.step}
            valueFormatter={(v) => v.toFixed(2)}
          />
        </CardContent>
      </Card>

      {/* Document Chunking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Découpage des documents
          </CardTitle>
          <CardDescription>
            Configurez comment les documents sont découpés pour l'indexation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Slider
            label="Taille des chunks"
            hint="Nombre de caractères par morceau de document. Plus grand = plus de contexte par chunk."
            value={config.chunk_size}
            onChange={(value) => updateConfig('chunk_size', value)}
            min={RAG_CONFIG_CONSTRAINTS.chunk_size.min}
            max={RAG_CONFIG_CONSTRAINTS.chunk_size.max}
            step={RAG_CONFIG_CONSTRAINTS.chunk_size.step}
            valueFormatter={(v) => `${v} caractères`}
          />

          <Slider
            label="Chevauchement"
            hint="Nombre de caractères qui se chevauchent entre les chunks pour préserver le contexte."
            value={config.chunk_overlap}
            onChange={(value) => updateConfig('chunk_overlap', value)}
            min={RAG_CONFIG_CONSTRAINTS.chunk_overlap.min}
            max={RAG_CONFIG_CONSTRAINTS.chunk_overlap.max}
            step={RAG_CONFIG_CONSTRAINTS.chunk_overlap.step}
            valueFormatter={(v) => `${v} caractères`}
          />

          <div className="p-4 bg-muted/30 text-sm">
            <p className="font-medium mb-1">💡 Conseil</p>
            <p className="text-muted-foreground">
              Après avoir modifié ces paramètres, vous devrez réindexer vos documents 
              pour que les changements prennent effet.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Retrieval Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche sémantique
          </CardTitle>
          <CardDescription>
            Configurez la recherche de documents pertinents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Slider
            label="Top K (documents récupérés)"
            hint="Nombre de documents récupérés lors de la recherche initiale"
            value={config.top_k}
            onChange={(value) => updateConfig('top_k', value)}
            min={RAG_CONFIG_CONSTRAINTS.top_k.min}
            max={RAG_CONFIG_CONSTRAINTS.top_k.max}
            step={RAG_CONFIG_CONSTRAINTS.top_k.step}
            valueFormatter={(v) => `${v} documents`}
          />

          <Slider
            label="Rerank Top N (documents utilisés)"
            hint="Nombre de documents gardés après le reranking pour générer la réponse"
            value={config.rerank_top_n}
            onChange={(value) => updateConfig('rerank_top_n', value)}
            min={RAG_CONFIG_CONSTRAINTS.rerank_top_n.min}
            max={RAG_CONFIG_CONSTRAINTS.rerank_top_n.max}
            step={RAG_CONFIG_CONSTRAINTS.rerank_top_n.step}
            valueFormatter={(v) => `${v} documents`}
          />
        </CardContent>
      </Card>

      {/* Cache Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache sémantique
          </CardTitle>
          <CardDescription>
            Optimisez les performances en cachant les réponses similaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable_cache"
              checked={config.enable_cache}
              onChange={(e) => updateConfig('enable_cache', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="enable_cache" className="text-sm font-medium">
              Activer le cache sémantique
            </label>
          </div>

          {config.enable_cache && (
            <>
              <Slider
                label="Durée du cache (TTL)"
                hint="Durée pendant laquelle les réponses cachées sont valides"
                value={config.cache_ttl}
                onChange={(value) => updateConfig('cache_ttl', value)}
                min={RAG_CONFIG_CONSTRAINTS.cache_ttl.min}
                max={RAG_CONFIG_CONSTRAINTS.cache_ttl.max}
                step={RAG_CONFIG_CONSTRAINTS.cache_ttl.step}
                valueFormatter={(v) => {
                  if (v >= 3600) return `${Math.round(v / 3600)}h`
                  return `${Math.round(v / 60)}min`
                }}
              />

              <Slider
                label="Seuil de similarité"
                hint="Similarité minimum pour considérer qu'une question est en cache (0.8 = lâche, 0.98 = strict)"
                value={config.similarity_threshold}
                onChange={(value) => updateConfig('similarity_threshold', value)}
                min={RAG_CONFIG_CONSTRAINTS.similarity_threshold.min}
                max={RAG_CONFIG_CONSTRAINTS.similarity_threshold.max}
                step={RAG_CONFIG_CONSTRAINTS.similarity_threshold.step}
                valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt système</CardTitle>
          <CardDescription>
            Instructions données au modèle pour guider ses réponses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={config.system_prompt}
            onChange={(e) => updateConfig('system_prompt', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 focus:border-black focus:outline-none resize-none"
            placeholder="Tu es un assistant virtuel..."
          />
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={saving}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Enregistrer les modifications
          </Button>
        </div>
      )}
    </div>
  )
}
