'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Database,
  Play,
  Scissors,
  Info,
  Save
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'

interface Document {
  id: string
  workspace_id: string
  filename: string
  file_type: string
  file_size: number
  status: 'pending' | 'processing' | 'indexed' | 'error'
  chunk_count: number | null
  created_at: string
}

// Animation Matrix style pour la vectorisation
function MatrixIndexingAnimation({ 
  isActive, 
  documentName 
}: { 
  isActive: boolean
  documentName: string 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    if (!isActive || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Caractères pour l'effet Matrix
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ'
    const fontSize = 12
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)
    
    // Reset progress
    setProgress(0)
    
    // Animation progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100
        return prev + 1
      })
    }, 150)
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#00ff00'
      ctx.font = `${fontSize}px monospace`
      
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize
        
        ctx.fillText(char, x, y)
        
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }
    
    const interval = setInterval(draw, 40)
    
    return () => {
      clearInterval(interval)
      clearInterval(progressInterval)
    }
  }, [isActive])
  
  if (!isActive) return null
  
  return (
    <div className="my-6 bg-black rounded-xl overflow-hidden border border-green-500/30">
      <div className="p-4 border-b border-green-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400 font-mono text-sm">
            INDEXATION: {documentName}
          </span>
        </div>
        <span className="text-green-400 font-mono text-sm">{progress}%</span>
      </div>
      
      <div className="relative h-40">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={160}
          className="w-full h-full"
        />
        
        {/* Base de données au centre */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/90 backdrop-blur-sm rounded-xl p-4 border border-green-500/50 flex flex-col items-center gap-2">
            <Database size={32} className="text-green-400" />
            <div className="text-green-400 font-mono text-xs">VECTORSTORE</div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1.5 h-4 bg-green-500/50 rounded-sm animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-green-900">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

interface RAGConfig {
  chunk_size: number
  chunk_overlap: number
  top_k: number
  enable_cache: boolean
  cache_ttl: number
}

export default function DocumentsPage() {
  const params = useParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [indexingDoc, setIndexingDoc] = useState<string | null>(null)
  const [reindexingAll, setReindexingAll] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  // Configuration RAG
  const [ragConfig, setRagConfig] = useState<RAGConfig>({
    chunk_size: 1500,
    chunk_overlap: 300,
    top_k: 8,
    enable_cache: true,
    cache_ttl: 7200
  })
  const [ragLoading, setRagLoading] = useState(true)
  const [ragSaving, setRagSaving] = useState(false)
  const [ragSaved, setRagSaved] = useState(false)

  // Charger la config RAG depuis workspaces.rag_config
  useEffect(() => {
    const loadRagConfig = async () => {
      if (!params.id) return
      const { data } = await supabase
        .from('workspaces')
        .select('rag_config')
        .eq('id', params.id)
        .single()
      
      if (data?.rag_config) {
        setRagConfig({
          chunk_size: data.rag_config.chunk_size ?? 1500,
          chunk_overlap: data.rag_config.chunk_overlap ?? 300,
          top_k: data.rag_config.top_k ?? 8,
          enable_cache: data.rag_config.enable_cache ?? true,
          cache_ttl: data.rag_config.cache_ttl ?? 7200
        })
      }
      setRagLoading(false)
    }
    loadRagConfig()
  }, [params.id])

  // Sauvegarder la config RAG via l'API backend
  const saveRagConfig = async () => {
    if (!params.id) return
    setRagSaving(true)
    setRagSaved(false)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('Non authentifié')
        setRagSaving(false)
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/workspaces/${params.id}/rag-config`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(ragConfig)
        }
      )

      if (response.ok) {
        setRagSaved(true)
        setTimeout(() => setRagSaved(false), 2000)
      } else {
        console.error('Erreur sauvegarde RAG config')
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
    
    setRagSaving(false)
  }

  const loadDocuments = useCallback(async () => {
    if (!params.id) return

    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false })

    if (data) {
      setDocuments(data)
      
      // Vérifier si un document est en cours de traitement
      const processing = data.find(d => d.status === 'processing')
      if (processing) {
        setIndexingDoc(processing.filename)
      } else {
        // Plus aucun document en traitement
        if (indexingDoc) setIndexingDoc(null)
        if (reindexingAll) setReindexingAll(false)
      }
    }
    setLoading(false)
  }, [params.id, indexingDoc, reindexingAll])

  useEffect(() => {
    loadDocuments()
    
    // Polling pour les documents en cours de traitement
    pollingRef.current = setInterval(() => {
      loadDocuments()
    }, 3000)
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [loadDocuments])

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !params.id) return

    setUploading(true)

    for (const file of Array.from(files)) {
      try {
        // Récupérer le token d'authentification
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.error('Non authentifié')
          continue
        }

        // Créer FormData pour l'upload
        const formData = new FormData()
        formData.append('file', file)

        // Envoyer au backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/documents/workspace/${params.id}/upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            body: formData
          }
        )

        if (response.ok) {
          const doc = await response.json()
          setDocuments(prev => [doc, ...prev])
        } else {
          console.error('Erreur upload:', await response.text())
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    }

    setUploading(false)
  }

  // Fonction pour indexer un document
  const indexDocument = async (doc: Document) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      setIndexingDoc(doc.filename)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/documents/workspace/${params.id}/document/${doc.id}/index`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (response.ok) {
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'processing' as const } : d
        ))
      } else {
        console.error('Erreur indexation:', await response.text())
        setIndexingDoc(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setIndexingDoc(null)
    }
  }

  // Fonction pour réindexer TOUS les documents
  const reindexAll = async () => {
    if (reindexingAll || documents.length === 0) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      setReindexingAll(true)
      setIndexingDoc('Tous les documents')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/documents/workspace/${params.id}/reindex-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (response.ok) {
        // Mettre tous les documents en status processing localement
        setDocuments(prev => prev.map(d => ({ ...d, status: 'processing' as const, chunk_count: 0 })))
      } else {
        console.error('Erreur réindexation:', await response.text())
        setReindexingAll(false)
        setIndexingDoc(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setReindexingAll(false)
      setIndexingDoc(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const deleteDocument = async (id: string) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== id))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: Document['status']) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-700',
      processing: 'bg-yellow-100 text-yellow-700',
      indexed: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700'
    }
    const icons = {
      pending: <Clock size={14} />,
      processing: <RefreshCw size={14} className="animate-spin" />,
      indexed: <CheckCircle size={14} />,
      error: <AlertCircle size={14} />
    }
    const labels = {
      pending: 'En attente',
      processing: 'Indexation...',
      indexed: 'Indexé',
      error: 'Erreur'
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    )
  }

  const pendingDocs = documents.filter(d => d.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">
            Gérez la base de connaissances de votre chatbot
          </p>
        </div>
      </div>

      {/* Animation Matrix pendant l'indexation - pleine largeur */}
      <MatrixIndexingAnimation 
        isActive={!!indexingDoc} 
        documentName={indexingDoc || ''} 
      />

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - 2/3 : Dépôt + Liste documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3">
            {/* Bouton Tout réindexer */}
            {documents.some(d => d.status === 'indexed') && !indexingDoc && !reindexingAll && (
              <Button 
                onClick={reindexAll}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <RefreshCw size={16} className="mr-2" />
                Tout réindexer
              </Button>
            )}
            {pendingDocs.length > 0 && !indexingDoc && (
              <Button 
                onClick={() => pendingDocs[0] && indexDocument(pendingDocs[0])}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Zap size={16} className="mr-2" />
                Indexer ({pendingDocs.length})
              </Button>
            )}
            <label className="cursor-pointer">
              <input 
                type="file" 
                multiple 
                className="hidden" 
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <span className="inline-flex items-center justify-center bg-black hover:bg-gray-800 text-white text-sm font-medium h-10 px-4 rounded-md">
                <Upload size={16} className="mr-2" />
                Importer
              </span>
            </label>
          </div>

          {/* Zone de drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${dragOver 
                ? 'border-black bg-gray-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <Upload size={40} className={`mx-auto mb-3 ${dragOver ? 'text-black' : 'text-gray-300'}`} />
            <p className="text-gray-600 mb-1">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-sm text-gray-400">
              PDF, TXT, MD, DOC, DOCX • Max 10 MB par fichier
            </p>
          </div>

          {/* Barre de recherche */}
          {documents.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter size={16} className="mr-2" />
                Filtrer
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
            </div>
          )}

          {/* Empty state */}
          {!loading && documents.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun document</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                Ajoutez des documents pour enrichir la base de connaissances de votre chatbot
              </p>
            </div>
          )}

          {/* Liste des documents */}
          {!loading && documents.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Document
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Statut
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Taille
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Chunks
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-gray-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                            <p className="text-xs text-gray-500">{doc.file_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {doc.chunk_count ?? '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Bouton Réindexer pour documents déjà indexés */}
                          {doc.status === 'indexed' && !indexingDoc && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => indexDocument(doc)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-2"
                              title="Réindexer"
                            >
                              <RefreshCw size={12} />
                            </Button>
                          )}
                          {/* Indicateur d'indexation en cours */}
                          {doc.status === 'processing' && (
                            <RefreshCw size={14} className="animate-spin text-yellow-600" />
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteDocument(doc.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne droite - 1/3 : Configuration RAG */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Scissors size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Indexation (RAG)</h3>
                <p className="text-sm text-gray-500">Configuration du découpage</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Chunk size */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Taille des chunks</span>
                    <div className="group relative">
                      <Info size={14} className="text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Nombre de caractères par segment. Plus grand = plus de contexte.
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{ragConfig.chunk_size} car.</span>
                </div>
                <Slider
                  value={ragConfig.chunk_size}
                  onChange={(value) => setRagConfig(prev => ({ ...prev, chunk_size: value }))}
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
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Caractères partagés entre chunks.
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{ragConfig.chunk_overlap} car.</span>
                </div>
                <Slider
                  value={ragConfig.chunk_overlap}
                  onChange={(value) => setRagConfig(prev => ({ ...prev, chunk_overlap: value }))}
                  min={0}
                  max={500}
                  step={25}
                />
              </div>

              {/* Top K */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Documents similaires</span>
                    <div className="group relative">
                      <Info size={14} className="text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Nombre de chunks à récupérer (Top K).
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{ragConfig.top_k}</span>
                </div>
                <Slider
                  value={ragConfig.top_k}
                  onChange={(value) => setRagConfig(prev => ({ ...prev, top_k: value }))}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>

              {/* Séparateur Cache */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  ⚡ Cache sémantique
                  <span className="text-xs font-normal text-gray-500">(économise les appels API)</span>
                </h4>
              </div>

              {/* Enable Cache */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Activer le cache</span>
                  <div className="group relative">
                    <Info size={14} className="text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Questions similaires = réponse instantanée depuis le cache.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setRagConfig(prev => ({ ...prev, enable_cache: !prev.enable_cache }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ragConfig.enable_cache ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ragConfig.enable_cache ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Cache TTL */}
              {ragConfig.enable_cache && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Durée du cache</span>
                      <div className="group relative">
                        <Info size={14} className="text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Durée de validité des réponses en cache.
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {ragConfig.cache_ttl >= 86400 
                        ? `${Math.round(ragConfig.cache_ttl / 86400)}j` 
                        : ragConfig.cache_ttl >= 3600 
                          ? `${Math.round(ragConfig.cache_ttl / 3600)}h` 
                          : `${Math.round(ragConfig.cache_ttl / 60)}min`}
                    </span>
                  </div>
                  <Slider
                    value={ragConfig.cache_ttl}
                    onChange={(value) => setRagConfig(prev => ({ ...prev, cache_ttl: value }))}
                    min={1800}
                    max={2592000}
                    step={3600}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>30min</span>
                    <span>1 mois</span>
                  </div>
                </div>
              )}

              {/* Bouton Enregistrer */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Button
                  onClick={saveRagConfig}
                  disabled={ragSaving}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                >
                  {ragSaving ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : ragSaved ? (
                    <CheckCircle size={16} className="mr-2" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {ragSaved ? 'Enregistré !' : 'Enregistrer'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  💡 Réindexez vos documents après modification
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicateur d'upload */}
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-black rounded-full" />
          <span className="text-sm text-gray-600">Upload en cours...</span>
        </div>
      )}
    </div>
  )
}
