'use client'

import { useEffect, useState, useCallback } from 'react'
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
  MoreVertical,
  RefreshCw
} from 'lucide-react'

interface Document {
  id: string
  workspace_id: string
  filename: string
  file_type: string
  file_size: number
  status: 'pending' | 'processing' | 'indexed' | 'error'
  chunks_count: number | null
  created_at: string
}

export default function DocumentsPage() {
  const params = useParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const loadDocuments = useCallback(async () => {
    if (!params.id) return

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false })

    if (data) {
      setDocuments(data)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !params.id) return

    setUploading(true)

    for (const file of Array.from(files)) {
      // Créer l'entrée dans la base
      const { data, error } = await supabase
        .from('documents')
        .insert({
          workspace_id: params.id,
          filename: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          status: 'pending'
        })
        .select()
        .single()

      if (data) {
        // TODO: Uploader le fichier vers le backend pour indexation
        // Pour l'instant on simule
        setDocuments(prev => [data, ...prev])
      }
    }

    setUploading(false)
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
      pending: 'bg-yellow-50 text-yellow-700',
      processing: 'bg-blue-50 text-blue-700',
      indexed: 'bg-green-50 text-green-700',
      error: 'bg-red-50 text-red-700'
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
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-blue-600" />
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
                    {doc.chunks_count ?? '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
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
