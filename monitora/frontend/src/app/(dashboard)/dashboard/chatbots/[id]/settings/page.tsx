'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Workspace } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  Save,
  Trash2,
  AlertTriangle,
  Settings,
  Globe,
  Bell,
  Shield,
  Plus,
  X
} from 'lucide-react'

type Chatbot = Workspace

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const [chatbot, setChatbot] = useState<Chatbot | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    allowed_domains: [''] as string[],
    is_active: true
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
      // Convertir domain (ancien format) ou allowed_domains (nouveau format)
      let domains: string[] = ['']
      if (data.allowed_domains && Array.isArray(data.allowed_domains)) {
        domains = data.allowed_domains.length > 0 ? data.allowed_domains : ['']
      } else if (data.domain) {
        domains = [data.domain]
      }
      setFormData({
        name: data.name,
        allowed_domains: domains,
        is_active: data.is_active
      })
    }
  }

  const saveSettings = async () => {
    if (!chatbot) return

    setSaving(true)

    // Filtrer les domaines vides
    const cleanDomains = formData.allowed_domains.filter(d => d.trim() !== '')

    const { error } = await supabase
      .from('workspaces')
      .update({
        name: formData.name,
        allowed_domains: cleanDomains.length > 0 ? cleanDomains : null,
        // Garder l'ancien champ domain pour compatibilité
        domain: cleanDomains.length > 0 ? cleanDomains[0] : null,
        is_active: formData.is_active
      })
      .eq('id', chatbot.id)

    setSaving(false)

    if (!error) {
      // Notification succès
    }
  }

  // Fonctions pour gérer les domaines
  const addDomain = () => {
    if (formData.allowed_domains.length < 5) {
      setFormData(prev => ({
        ...prev,
        allowed_domains: [...prev.allowed_domains, '']
      }))
    }
  }

  const removeDomain = (index: number) => {
    if (formData.allowed_domains.length > 1) {
      setFormData(prev => ({
        ...prev,
        allowed_domains: prev.allowed_domains.filter((_, i) => i !== index)
      }))
    }
  }

  const updateDomain = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.map((d, i) => i === index ? value : d)
    }))
  }

  const deleteChatbot = async () => {
    if (!chatbot || deleteConfirm !== chatbot.name) return

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', chatbot.id)

    if (!error) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1">
          Configuration générale de votre chatbot
        </p>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings size={20} className="text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">Informations générales</h3>
            <p className="text-sm text-gray-500">Nom et domaine du chatbot</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du chatbot
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Domaines autorisés
              </label>
              <span className="text-xs text-gray-400">
                {formData.allowed_domains.filter(d => d.trim()).length}/5 domaines
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Ajoutez les domaines où le widget est autorisé à fonctionner
            </p>
            <div className="space-y-2">
              {formData.allowed_domains.map((domain, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex items-center flex-1">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                      https://
                    </span>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => updateDomain(index, e.target.value)}
                      placeholder="exemple.com"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  {formData.allowed_domains.length > 1 && (
                    <button
                      onClick={() => removeDomain(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer ce domaine"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {formData.allowed_domains.length < 5 && (
              <button
                onClick={addDomain}
                className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
              >
                <Plus size={16} />
                Ajouter un domaine
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statut */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={20} className="text-green-600" />
          <div>
            <h3 className="font-medium text-gray-900">Statut</h3>
            <p className="text-sm text-gray-500">Activer ou désactiver le chatbot</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Chatbot actif</p>
            <p className="text-sm text-gray-500">
              {formData.is_active 
                ? 'Le chatbot répond aux utilisateurs' 
                : 'Le chatbot est désactivé'
              }
            </p>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}
            `}
          >
            <span 
              className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${formData.is_active ? 'left-7' : 'left-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <Button 
          className="bg-black hover:bg-gray-800 text-white"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          Enregistrer les modifications
        </Button>
      </div>

      {/* Zone de danger */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Zone de danger</h3>
            <p className="text-sm text-red-600">Actions irréversibles</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Supprimer ce chatbot</p>
              <p className="text-sm text-gray-500">
                Cette action est irréversible. Toutes les données seront perdues.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} className="mr-2" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation suppression */}
      {showDeleteModal && chatbot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Supprimer "{chatbot.name}" ?
              </h3>
              <p className="text-sm text-gray-500">
                Cette action supprimera définitivement le chatbot, ses documents, 
                conversations et toutes les données associées.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-2">
                Tapez <strong>{chatbot.name}</strong> pour confirmer
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirm('')
                }}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={deleteChatbot}
                disabled={deleteConfirm !== chatbot.name}
              >
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
