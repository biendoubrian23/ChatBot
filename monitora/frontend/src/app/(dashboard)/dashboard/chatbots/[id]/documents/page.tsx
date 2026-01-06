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
  Play
} from 'lucide-react'

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

export default function DocumentsPage() {
  const params = useParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [indexingDoc, setIndexingDoc] = useState<string | null>(null)
  const [reindexingAll, setReindexingAll] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

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
        <div className="flex items-center gap-3">
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

      {/* Animation Matrix pendant l'indexation */}
      <MatrixIndexingAnimation 
        isActive={!!indexingDoc} 
        documentName={indexingDoc || ''} 
      />

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
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Document
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Statut
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Taille
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Chunks
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.filename}</p>
                        <p className="text-xs text-gray-500">{doc.file_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(doc.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.chunk_count ?? '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Bouton Indexer pour documents en attente */}
                      {doc.status === 'pending' && !indexingDoc && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => indexDocument(doc)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <Play size={14} className="mr-1" />
                          Indexer
                        </Button>
                      )}
                      {/* Bouton Réindexer pour documents déjà indexés */}
                      {doc.status === 'indexed' && !indexingDoc && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => indexDocument(doc)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          title="Réindexer avec les nouveaux paramètres de chunks"
                        >
                          <RefreshCw size={14} className="mr-1" />
                          Réindexer
                        </Button>
                      )}
                      {/* Indicateur d'indexation en cours */}
                      {doc.status === 'processing' && (
                        <span className="text-xs text-yellow-600 flex items-center gap-1">
                          <RefreshCw size={12} className="animate-spin" />
                          En cours...
                        </span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
