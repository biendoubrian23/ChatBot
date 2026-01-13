'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChatWidgetPreview } from '@/components/chat-widget-preview'
import { 
  MessageSquare, 
  Search, 
  Filter,
  Clock,
  User,
  ChevronRight,
  X,
  ThumbsUp,
  ThumbsDown,
  Zap
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
  feedback?: number | null
  response_time_ms?: number | null
  rag_score?: number | null
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

        {/* Empty state avec mockup téléphone */}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 py-8">
            {/* Mockup du chatbot dans un téléphone */}
            <div className="flex-shrink-0">
              <ChatWidgetPreview 
                botName="Votre Assistant"
                welcomeMessage="Bonjour ! 👋 Je suis votre assistant virtuel. Comment puis-je vous aider ?"
                accentColor="#6366f1"
                showInPhone={true}
              />
            </div>
            
            {/* Texte explicatif */}
            <div className="text-center lg:text-left max-w-md">
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                Aucune conversation pour le moment
              </h3>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Voici à quoi ressemblera votre chatbot pour vos utilisateurs. 
                Les conversations apparaîtront ici dès que quelqu'un commencera à discuter avec votre assistant.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <MessageSquare size={16} className="text-indigo-600" />
                  </div>
                  <span>Intégrez le widget sur votre site</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User size={16} className="text-green-600" />
                  </div>
                  <span>Les visiteurs posent leurs questions</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <span>Suivez les échanges en temps réel</span>
                </div>
              </div>
            </div>
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
                    <User size={16} className="text-gray-500" />
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
              <User size={20} className="text-gray-500" />
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
                  <div className="max-w-[80%]">
                    <div 
                      className={`
                        p-3 rounded-2xl text-sm
                        ${message.role === 'user' 
                          ? 'bg-black text-white rounded-br-md' 
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }
                      `}
                    >
                      {message.content}
                    </div>
                    
                    {/* Métadonnées pour les messages assistant */}
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-3 mt-1.5 ml-1">
                        {/* Feedback */}
                        {message.feedback !== null && message.feedback !== undefined && (
                          <div className={`
                            flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                            ${message.feedback === 1 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                            }
                          `}>
                            {message.feedback === 1 
                              ? <ThumbsUp size={10} /> 
                              : <ThumbsDown size={10} />
                            }
                            <span>{message.feedback === 1 ? 'Utile' : 'Pas utile'}</span>
                          </div>
                        )}
                        
                        {/* Temps de réponse */}
                        {message.response_time_ms && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Zap size={10} />
                            <span>
                              {message.response_time_ms < 1000 
                                ? `${message.response_time_ms}ms`
                                : `${(message.response_time_ms / 1000).toFixed(1)}s`
                              }
                            </span>
                          </div>
                        )}
                        
                        {/* Score RAG si disponible */}
                        {message.rag_score !== null && message.rag_score !== undefined && (
                          <div className="text-xs text-gray-400">
                            Score: {Math.round(message.rag_score * 100)}%
                          </div>
                        )}
                      </div>
                    )}
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
