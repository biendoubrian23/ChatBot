'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ApiKey {
  id: string
  workspace_id: string
  name: string
  key_prefix: string
  key_hash: string
  last_used_at: string | null
  created_at: string
  expires_at: string | null
}

export default function ApiKeysPage() {
  const params = useParams()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Simuler le chargement des clés API
    setLoading(false)
    // Dans une vraie implémentation, on chargerait depuis une table api_keys
  }, [params.id])

  const createApiKey = () => {
    // Simuler la création d'une clé
    const key = `mk_${generateRandomKey(32)}`
    setNewKey(key)
    
    const newApiKey: ApiKey = {
      id: crypto.randomUUID(),
      workspace_id: params.id as string,
      name: newKeyName || 'Clé API',
      key_prefix: key.substring(0, 10),
      key_hash: '',
      last_used_at: null,
      created_at: new Date().toISOString(),
      expires_at: null
    }
    
    setApiKeys(prev => [newApiKey, ...prev])
    setNewKeyName('')
  }

  const deleteApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id))
  }

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeNewKeyModal = () => {
    setNewKey(null)
    setShowCreateModal(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clés API</h1>
          <p className="text-gray-500 mt-1">
            Gérez les clés d'accès à l'API de votre chatbot
          </p>
        </div>
        <Button 
          className="bg-black hover:bg-gray-800 text-white"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} className="mr-2" />
          Nouvelle clé
        </Button>
      </div>

      {/* Avertissement */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Important :</strong> Les clés API donnent accès à votre chatbot. 
          Ne les partagez jamais publiquement et ne les incluez pas dans votre code côté client.
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && apiKeys.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune clé API</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Créez une clé API pour intégrer votre chatbot via l'API REST
          </p>
          <Button 
            className="bg-black hover:bg-gray-800 text-white"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} className="mr-2" />
            Créer ma première clé
          </Button>
        </div>
      )}

      {/* Liste des clés */}
      {!loading && apiKeys.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Nom
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Clé
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Dernière utilisation
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Créée le
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Key size={16} className="text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{apiKey.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {apiKey.key_prefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Jamais'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(apiKey.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteApiKey(apiKey.id)}
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

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4">
            {!newKey ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Créer une clé API
                </h3>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la clé
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Ex: Production, Test..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Annuler
                  </Button>
                  <Button 
                    className="bg-black hover:bg-gray-800 text-white"
                    onClick={createApiKey}
                  >
                    Créer
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Clé API créée
                  </h3>
                  <p className="text-sm text-gray-500">
                    Copiez cette clé maintenant. Elle ne sera plus affichée.
                  </p>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm text-gray-800 break-all">{newKey}</code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={copyKey}
                      className="flex-shrink-0"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  onClick={closeNewKeyModal}
                >
                  Terminé
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function generateRandomKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
