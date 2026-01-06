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
  Clock,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2
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

interface DatabaseConfig {
  configured: boolean
  id?: string
  db_type: string
  db_host: string
  db_name: string
  db_user: string
  db_port: number
  schema_type: string
  is_enabled: boolean
  last_test_status?: string
  last_test_at?: string
}

export default function ApiKeysPage() {
  const params = useParams()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // États pour la base de données
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    configured: false,
    db_type: 'sqlserver',
    db_host: '',
    db_name: '',
    db_user: '',
    db_port: 1433,
    schema_type: 'coollibri',
    is_enabled: false
  })
  const [dbPassword, setDbPassword] = useState('')
  const [showDbPassword, setShowDbPassword] = useState(false)
  const [dbLoading, setDbLoading] = useState(false)
  const [dbTestLoading, setDbTestLoading] = useState(false)
  const [dbTestResult, setDbTestResult] = useState<{success: boolean; message: string; database?: string} | null>(null)
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false)

  useEffect(() => {
    loadDatabaseConfig()
    // Simuler le chargement des clés API
    setLoading(false)
    // Dans une vraie implémentation, on chargerait depuis une table api_keys
  }, [params.id])

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const loadDatabaseConfig = async () => {
    try {
      const token = await getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workspaces/${params.id}/database`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        // Fusionner avec les valeurs par défaut pour éviter les undefined
        setDbConfig(prev => ({
          configured: data.configured || false,
          db_type: data.db_type || prev.db_type || 'sqlserver',
          db_host: data.db_host || prev.db_host || '',
          db_name: data.db_name || prev.db_name || '',
          db_user: data.db_user || prev.db_user || '',
          db_port: data.db_port || prev.db_port || 1433,
          schema_type: data.schema_type || prev.schema_type || 'coollibri',
          is_enabled: data.is_enabled ?? prev.is_enabled ?? false,
          last_test_status: data.last_test_status,
          last_test_at: data.last_test_at
        }))
      }
    } catch (error) {
      console.error('Erreur chargement config DB:', error)
    }
  }

  const saveDatabaseConfig = async () => {
    setDbLoading(true)
    setDbSaveSuccess(false)
    setDbTestResult(null)  // Effacer l'ancien résultat de test
    
    try {
      const token = await getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workspaces/${params.id}/database`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            db_type: dbConfig.db_type,
            db_host: dbConfig.db_host,
            db_name: dbConfig.db_name,
            db_user: dbConfig.db_user,
            db_password: dbPassword,
            db_port: dbConfig.db_port,
            schema_type: dbConfig.schema_type,
            is_enabled: dbConfig.is_enabled
          })
        }
      )
      
      if (response.ok) {
        setDbSaveSuccess(true)
        setDbConfig(prev => ({ ...prev, configured: true, last_test_status: undefined, last_test_at: undefined }))
        // Recharger la config après sauvegarde
        await loadDatabaseConfig()
        setTimeout(() => setDbSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Erreur sauvegarde config DB:', error)
    } finally {
      setDbLoading(false)
    }
  }

  const testDatabaseConnection = async () => {
    setDbTestLoading(true)
    setDbTestResult(null)
    
    try {
      const token = await getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workspaces/${params.id}/database/test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            db_type: dbConfig.db_type,
            db_host: dbConfig.db_host,
            db_name: dbConfig.db_name,
            db_user: dbConfig.db_user,
            db_password: dbPassword,
            db_port: dbConfig.db_port,
            schema_type: dbConfig.schema_type
          })
        }
      )
      
      const result = await response.json()
      setDbTestResult(result)
    } catch (error) {
      setDbTestResult({ success: false, message: 'Erreur de connexion au serveur' })
    } finally {
      setDbTestLoading(false)
    }
  }

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

      {/* ============================================= */}
      {/* SECTION BASE DE DONNÉES */}
      {/* ============================================= */}
      <div className="border-t border-gray-200 pt-8 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Base de données externe</h2>
            <p className="text-sm text-gray-500">
              Connectez votre base de données pour le suivi des commandes
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          {/* Toggle activation */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Activer le suivi des commandes</div>
              <div className="text-sm text-gray-500">
                Le chatbot pourra consulter les commandes dans votre base de données
              </div>
            </div>
            <button
              onClick={() => setDbConfig(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                dbConfig.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  dbConfig.is_enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Type de schéma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site / Tenant
            </label>
            <select
              value={dbConfig.schema_type}
              onChange={(e) => setDbConfig(prev => ({ ...prev, schema_type: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <optgroup label="Impression de livres">
                <option value="coollibri">CoolLibri</option>
                <option value="jimprimeenfrance">J'imprime en France</option>
                <option value="monpackaging">Mon Packaging</option>
              </optgroup>
              <optgroup label="Événementiel">
                <option value="jedecore">Je Décore</option>
                <option value="unjourunique">Un Jour Unique</option>
              </optgroup>
              <optgroup label="Montres">
                <option value="chrono24">Chrono24</option>
              </optgroup>
              <optgroup label="Autre">
                <option value="generic">Générique (personnalisé)</option>
              </optgroup>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Le site définit le schéma de base de données à utiliser
            </p>
          </div>

          {/* Type de BDD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de base de données
            </label>
            <select
              value={dbConfig.db_type}
              onChange={(e) => setDbConfig(prev => ({ 
                ...prev, 
                db_type: e.target.value,
                db_port: e.target.value === 'sqlserver' ? 1433 : e.target.value === 'mysql' ? 3306 : 5432
              }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="sqlserver">SQL Server</option>
              <option value="mysql">MySQL</option>
              <option value="postgres">PostgreSQL</option>
            </select>
          </div>

          {/* Formulaire de connexion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hôte (host)
              </label>
              <input
                type="text"
                value={dbConfig.db_host}
                onChange={(e) => setDbConfig(prev => ({ ...prev, db_host: e.target.value }))}
                placeholder="ex: alpha.messages.fr ou 192.168.1.100"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={dbConfig.db_port}
                onChange={(e) => setDbConfig(prev => ({ ...prev, db_port: parseInt(e.target.value) || 1433 }))}
                placeholder="1433"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la base
              </label>
              <input
                type="text"
                value={dbConfig.db_name}
                onChange={(e) => setDbConfig(prev => ({ ...prev, db_name: e.target.value }))}
                placeholder="ex: IMP_COOLLIBRI"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utilisateur
              </label>
              <input
                type="text"
                value={dbConfig.db_user}
                onChange={(e) => setDbConfig(prev => ({ ...prev, db_user: e.target.value }))}
                placeholder="ex: sa ou db_user"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showDbPassword ? 'text' : 'password'}
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowDbPassword(!showDbPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showDbPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Résultat du test */}
          {dbTestResult && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              dbTestResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {dbTestResult.success ? (
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className={dbTestResult.success ? 'text-green-800' : 'text-red-800'}>
                <div className="font-medium">{dbTestResult.message}</div>
                {dbTestResult.success && dbTestResult.database && (
                  <div className="text-sm mt-1 opacity-80">
                    Base de données : {dbTestResult.database}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statut du dernier test */}
          {dbConfig.last_test_status && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Clock size={14} />
              Dernier test: {dbConfig.last_test_status === 'success' ? '✅ Réussi' : '❌ Échoué'}
              {dbConfig.last_test_at && ` - ${new Date(dbConfig.last_test_at).toLocaleString('fr-FR')}`}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={testDatabaseConnection}
              disabled={dbTestLoading || !dbConfig.db_host || !dbConfig.db_name}
            >
              {dbTestLoading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <RefreshCw size={16} className="mr-2" />
              )}
              Tester la connexion
            </Button>
            
            <Button
              className="bg-black hover:bg-gray-800 text-white"
              onClick={saveDatabaseConfig}
              disabled={dbLoading || !dbConfig.db_host || !dbConfig.db_name}
            >
              {dbLoading ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : dbSaveSuccess ? (
                <Check size={16} className="mr-2" />
              ) : null}
              {dbSaveSuccess ? 'Enregistré !' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>

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
