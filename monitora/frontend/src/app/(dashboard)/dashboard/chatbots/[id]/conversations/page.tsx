'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  MessageSquare, 
  Search, 
  Filter,
  Clock,
  User,
  ChevronRight,
  X
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Conversation {
  id: string
  workspace_id: string
  session_id: string
  user_identifier: string | null
  messages_count: number
  started_at: string
  last_message_at: string
  metadata: Record<string, any> | null
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function ConversationsPage() {
  const params = useParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const loadConversations = useCallback(async () => {
    if (!params.id) return

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', params.id)
      .order('last_message_at', { ascending: false })

    if (data) {
      setConversations(data)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
    setLoadingMessages(false)
  }

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    loadMessages(conversation.id)
  }

  const closeConversation = () => {
    setSelectedConversation(null)
    setMessages([])
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Liste des conversations */}
      <div className={`${selectedConversation ? 'w-1/3' : 'w-full'} flex flex-col`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Conversations</h1>
          <p className="text-gray-500 mt-1">
            Historique des échanges avec votre chatbot
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full" />
          </div>
        )}

        {/* Empty state */}
        {!loading && conversations.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune conversation</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Les conversations avec votre chatbot apparaîtront ici
            </p>
          </div>
        )}

        {/* Liste */}
        {!loading && conversations.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`
                  w-full text-left p-4 rounded-xl border transition-colors
                  ${selectedConversation?.id === conversation.id 
                    ? 'bg-gray-100 border-gray-300' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User size={16} className="text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-900 text-sm">
                      {conversation.user_identifier || 'Anonyme'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {conversation.messages_count} messages
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(conversation.last_message_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Détail de la conversation */}
      {selectedConversation && (
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedConversation.user_identifier || 'Anonyme'}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedConversation.messages_count} messages • 
                  Commencé le {formatDate(selectedConversation.started_at)}
                </p>
              </div>
            </div>
            <button 
              onClick={closeConversation}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-black rounded-full" />
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`
                      max-w-[80%] p-3 rounded-2xl text-sm
                      ${message.role === 'user' 
                        ? 'bg-black text-white rounded-br-md' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }
                    `}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {!loadingMessages && messages.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun message dans cette conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
