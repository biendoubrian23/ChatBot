'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Workspace } from '@/lib/supabase'
import { getCurrentUser, getAccessToken, User } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { Plus, Bot, MessageSquare, Users, TrendingUp, Globe, MoreVertical, Play, Pause, Trash2, Settings, ExternalLink, X, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Type alias pour la clarté
type Chatbot = Workspace

export default function DashboardPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalChatbots: 0,
    activeChatbots: 0,
    totalMessages: 0,
    totalUsers: 0
  })
  
  // États pour la modal de suppression
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; chatbot: Chatbot | null }>({ 
    open: false, 
    chatbot: null 
  })
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    loadChatbots()
  }, [])

  const loadChatbots = async () => {
    const user = await getCurrentUser()
    if (!user) return

    try {
      const data = await api.workspaces.list()
      if (data) {
        setChatbots(data)
        setStats({
          totalChatbots: data.length,
          activeChatbots: data.filter((c: Chatbot) => c.is_active).length,
          totalMessages: 0,
          totalUsers: 0
        })
      }
    } catch (error) {
      console.error('Erreur chargement chatbots:', error)
    }
    setLoading(false)
  }

  const openDeleteModal = (chatbot: Chatbot) => {
    setDeleteModal({ open: true, chatbot })
    setDeleteConfirmName('')
    setDeleteError('')
  }

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, chatbot: null })
    setDeleteConfirmName('')
    setDeleteError('')
  }

  const handleDeleteChatbot = async () => {
    if (!deleteModal.chatbot) return
    
    // Vérifier que le nom correspond
    if (deleteConfirmName !== deleteModal.chatbot.name) {
      setDeleteError('Le nom ne correspond pas')
      return
    }

    setDeleting(true)
    setDeleteError('')

    try {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workspaces/${deleteModal.chatbot.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Erreur lors de la suppression')
      }

      // Succès - retirer de la liste locale
      setChatbots(prev => prev.filter(c => c.id !== deleteModal.chatbot!.id))
      setStats(prev => ({
        ...prev,
        totalChatbots: prev.totalChatbots - 1,
        activeChatbots: deleteModal.chatbot!.is_active ? prev.activeChatbots - 1 : prev.activeChatbots
      }))
      closeDeleteModal()
    } catch (error: any) {
      setDeleteError(error.message || 'Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chatbots"
          value={stats.totalChatbots}
          subtitle="Total créés"
          icon={<Bot size={20} />}
        />
        <StatCard
          title="Actifs"
          value={stats.activeChatbots}
          subtitle="En production"
          icon={<Play size={20} />}
          trend={{ value: 100, isPositive: true }}
        />
        <StatCard
          title="Messages"
          value={stats.totalMessages}
          subtitle="Ce mois"
          icon={<MessageSquare size={20} />}
        />
        <StatCard
          title="Utilisateurs"
          value={stats.totalUsers}
          subtitle="Uniques ce mois"
          icon={<Users size={20} />}
        />
      </div>

      {/* Header with action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mes Chatbots</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérez et configurez vos assistants IA
          </p>
        </div>
        <Link href="/dashboard/chatbots/new">
          <Button className="bg-black hover:bg-gray-800 text-white">
            <Plus size={16} className="mr-2" />
            Nouveau chatbot
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && chatbots.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun chatbot</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Créez votre premier chatbot pour commencer à automatiser vos conversations
          </p>
          <Link href="/dashboard/chatbots/new">
            <Button className="bg-black hover:bg-gray-800 text-white">
              <Plus size={16} className="mr-2" />
              Créer mon premier chatbot
            </Button>
          </Link>
        </div>
      )}

      {/* Chatbots Table */}
      {!loading && chatbots.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 rounded-t-xl">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 rounded-tl-xl">
                  Chatbot
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Statut
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Messages
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Créé le
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3 rounded-tr-xl">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chatbots.map((chatbot) => (
                <ChatbotRow key={chatbot.id} chatbot={chatbot} onDelete={openDeleteModal} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteModal.open && deleteModal.chatbot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Supprimer le chatbot</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible</p>
              </div>
              <button 
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Vous êtes sur le point de supprimer le chatbot <strong className="text-gray-900">{deleteModal.chatbot.name}</strong>.
                Cela supprimera également :
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4 ml-4">
                <li>• Tous les documents indexés</li>
                <li>• L'historique des conversations</li>
                <li>• Les clés API associées</li>
                <li>• La configuration de base de données</li>
              </ul>
              <p className="text-sm text-gray-700 mb-2">
                Pour confirmer, tapez <strong className="font-mono bg-gray-100 px-1 rounded">{deleteModal.chatbot.name}</strong> ci-dessous :
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nom du chatbot"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
              {deleteError && (
                <p className="text-sm text-red-600 mt-2">{deleteError}</p>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteChatbot}
                disabled={deleteConfirmName !== deleteModal.chatbot.name || deleting}
              >
                {deleting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChatbotRow({ chatbot, onDelete }: { chatbot: Chatbot; onDelete: (chatbot: Chatbot) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <Link href={`/dashboard/chatbots/${chatbot.id}`} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 hover:text-black">
              {chatbot.name}
            </div>
            {chatbot.domain && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Globe size={12} />
                {chatbot.domain}
              </div>
            )}
          </div>
        </Link>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          chatbot.is_active 
            ? 'bg-green-50 text-green-700' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {chatbot.is_active ? (
            <>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Actif
            </>
          ) : (
            <>
              <Pause size={12} />
              Inactif
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        0
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDate(chatbot.created_at)}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="relative" ref={menuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500 hover:text-gray-900"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreVertical size={16} />
          </Button>
          
          {/* Menu déroulant */}
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <Link 
                href={`/dashboard/chatbots/${chatbot.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={14} />
                Configurer
              </Link>
              <Link 
                href={`/dashboard/chatbots/${chatbot.id}/integration`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                <ExternalLink size={14} />
                Intégration
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDelete(chatbot)
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
