'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Info,
  FileText,
  ChevronRight
} from 'lucide-react'

// Types pour les insights
interface InsightsData {
  satisfactionRate: number | null
  avgRagScore: number | null
  avgMessagesPerConversation: number
  lowConfidenceCount: number
  totalConversations: number
  totalMessages: number
  calculatedAt: string | null
}

interface TopicData {
  topicName: string
  messageCount: number
  sampleQuestions: string[]
}

interface ProblematicQuestion {
  id: string
  content: string
  ragScore: number | null
  feedback: number | null
  createdAt: string
  isResolved: boolean
}

// Composant pour les infobulles
function Tooltip({ content }: { content: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <HelpCircle size={14} className="text-gray-400 hover:text-gray-600 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 max-w-xs whitespace-normal">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  )
}

// Composant carte de statistique - Design sobre avec icônes noires
function InsightCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  tooltip,
  action
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  tooltip: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <Icon size={20} className="text-gray-700" />
        <Tooltip content={tooltip} />
      </div>
      <div className="mb-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {action && (
        <a 
          href={action.href}
          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-gray-600 hover:text-black hover:underline"
        >
          {action.label}
          <ArrowRight size={12} />
        </a>
      )}
    </div>
  )
}

export default function InsightsPage() {
  const params = useParams()
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [topics, setTopics] = useState<TopicData[]>([])
  const [problematicQuestions, setProblematicQuestions] = useState<ProblematicQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadInsights = useCallback(async () => {
    if (!params.id) return

    // Charger depuis le cache insights
    const { data: cacheData } = await supabase
      .from('insights_cache')
      .select('*')
      .eq('workspace_id', params.id)
      .single()

    if (cacheData) {
      setInsights({
        satisfactionRate: cacheData.satisfaction_rate,
        avgRagScore: cacheData.avg_rag_score,
        avgMessagesPerConversation: cacheData.avg_messages_per_conversation || 0,
        lowConfidenceCount: cacheData.low_confidence_count || 0,
        totalConversations: cacheData.total_conversations || 0,
        totalMessages: cacheData.total_messages || 0,
        calculatedAt: cacheData.calculated_at
      })
    } else {
      // Pas de cache, valeurs par défaut
      setInsights({
        satisfactionRate: null,
        avgRagScore: null,
        avgMessagesPerConversation: 0,
        lowConfidenceCount: 0,
        totalConversations: 0,
        totalMessages: 0,
        calculatedAt: null
      })
    }

    // Charger les sujets
    const { data: topicsData } = await supabase
      .from('message_topics')
      .select('*')
      .eq('workspace_id', params.id)
      .order('message_count', { ascending: false })
      .limit(10)

    if (topicsData) {
      setTopics(topicsData.map(t => ({
        topicName: t.topic_name,
        messageCount: t.message_count,
        sampleQuestions: t.sample_questions || []
      })))
    }

    // Charger les questions problématiques (faible score OU feedback négatif)
    const { data: questionsData } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        rag_score,
        feedback,
        created_at,
        is_resolved,
        conversation:conversations!inner(workspace_id)
      `)
      .eq('conversations.workspace_id', params.id)
      .eq('role', 'user')
      .eq('is_resolved', false)
      .or('rag_score.lt.0.5,feedback.eq.-1')
      .order('created_at', { ascending: false })
      .limit(20)

    if (questionsData) {
      setProblematicQuestions(questionsData.map(q => ({
        id: q.id,
        content: q.content,
        ragScore: q.rag_score,
        feedback: q.feedback,
        createdAt: q.created_at,
        isResolved: q.is_resolved || false
      })))
    }

    setLoading(false)
  }, [params.id])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Appeler la fonction SQL pour recalculer
    await supabase.rpc('calculate_workspace_insights', { p_workspace_id: params.id })
    await loadInsights()
    setRefreshing(false)
  }

  const markAsResolved = async (questionId: string) => {
    await supabase
      .from('messages')
      .update({ is_resolved: true })
      .eq('id', questionId)
    
    setProblematicQuestions(prev => prev.filter(q => q.id !== questionId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
      </div>
    )
  }

  const hasData = insights && (insights.totalConversations > 0 || insights.totalMessages > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="text-yellow-500" />
            Insights
          </h1>
          <p className="text-gray-500 mt-1">
            Analysez les performances de votre chatbot et identifiez les améliorations
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Message si pas de données */}
      {!hasData && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Sparkles size={24} className="text-indigo-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Pas encore de données</h3>
              <p className="text-gray-600 text-sm mb-3">
                Les insights apparaîtront automatiquement dès que votre chatbot commencera à recevoir des conversations. 
                Intégrez le widget sur votre site pour commencer à collecter des données.
              </p>
              <a 
                href={`/dashboard/chatbots/${params.id}/integration`}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Voir le code d'intégration
                <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          title="Taux de satisfaction"
          value={insights && insights.satisfactionRate !== null ? `${Math.round(insights.satisfactionRate)}%` : '—'}
          subtitle={insights && insights.satisfactionRate !== null ? 'Basé sur les votes 👍/👎' : 'Aucun vote reçu'}
          icon={ThumbsUp}
          tooltip="Pourcentage de réponses ayant reçu un pouce en haut. Un score élevé indique que les utilisateurs trouvent les réponses utiles."
        />

        <InsightCard
          title="Score de confiance"
          value={insights && insights.avgRagScore !== null ? `${Math.round(insights.avgRagScore * 100)}%` : '—'}
          subtitle="Pertinence des réponses RAG"
          icon={TrendingUp}
          tooltip="Score moyen de similarité entre les questions posées et les documents de votre base de connaissances. Un score > 70% est excellent."
        />

        <InsightCard
          title="Questions à enrichir"
          value={insights?.lowConfidenceCount ?? 0}
          subtitle="Score de confiance < 50%"
          icon={AlertTriangle}
          tooltip="Nombre de questions où le chatbot n'a pas trouvé de correspondance fiable dans vos documents. Ajoutez du contenu pour améliorer ces réponses."
          action={
            (insights?.lowConfidenceCount ?? 0) > 0 
              ? { label: 'Voir les questions', href: '#questions-problematiques' } 
              : undefined
          }
        />

        <InsightCard
          title="Messages/conversation"
          value={insights?.avgMessagesPerConversation?.toFixed(1) ?? '0'}
          subtitle={`${insights?.totalConversations ?? 0} conversations au total`}
          icon={MessageSquare}
          tooltip="Nombre moyen de messages par conversation. Une valeur entre 2-5 est idéale. Plus de 8 messages peut indiquer que les utilisateurs ont du mal à obtenir une réponse."
        />
      </div>

      {/* Section à 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sujets les plus abordés */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Sujets les plus abordés</h3>
              <Tooltip content="Classification automatique des questions par thème. Mis à jour périodiquement pour vous aider à comprendre ce que recherchent vos utilisateurs." />
            </div>
          </div>

          {topics.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Les sujets apparaîtront après quelques conversations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic, index) => {
                const maxCount = topics[0]?.messageCount || 1
                const percentage = (topic.messageCount / maxCount) * 100
                
                return (
                  <div key={topic.topicName} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {index + 1}. {topic.topicName}
                      </span>
                      <span className="text-xs text-gray-500">{topic.messageCount} questions</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Message actionnable */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">💡 Astuce</p>
                <p className="text-xs text-blue-700 mt-1">
                  Utilisez ces sujets pour enrichir votre base de connaissances ou pour identifier 
                  les besoins de vos utilisateurs. Un sujet fréquent peut aussi inspirer un article de blog ou une FAQ.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions problématiques */}
        <div id="questions-problematiques" className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Questions à améliorer</h3>
              <Tooltip content="Questions ayant reçu un pouce bas ou avec un faible score de confiance. Ajoutez du contenu pour améliorer les réponses à ces questions." />
            </div>
            {problematicQuestions.length > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                {problematicQuestions.length} à traiter
              </span>
            )}
          </div>

          {problematicQuestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Tout est en ordre !</p>
              <p className="text-xs text-gray-500 mt-1">Aucune question problématique détectée</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {problematicQuestions.map((question) => (
                <div 
                  key={question.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-700 flex-1">{question.content}</p>
                    <button
                      onClick={() => markAsResolved(question.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                      title="Marquer comme résolu"
                    >
                      <CheckCircle size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {question.ragScore !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        question.ragScore < 0.5 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        Score: {Math.round(question.ragScore * 100)}%
                      </span>
                    )}
                    {question.feedback === -1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                        <ThumbsDown size={10} />
                        Feedback négatif
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message actionnable */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">📚 Enrichissez votre documentation</p>
                <p className="text-xs text-amber-700 mt-1">
                  Pour chaque question ci-dessus, ajoutez un document ou modifiez votre base de connaissances 
                  pour que le chatbot puisse mieux y répondre.
                </p>
                <a 
                  href={`/dashboard/chatbots/${params.id}/documents`}
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  Gérer mes documents
                  <ChevronRight size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer explicatif */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Info size={18} className="text-gray-500" />
          Comment sont calculés ces insights ?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-800 mb-1">👍 Satisfaction</p>
            <p>Basée sur les votes des utilisateurs après chaque réponse du chatbot. Chaque utilisateur peut donner un pouce haut ou bas.</p>
          </div>
          <div>
            <p className="font-medium text-gray-800 mb-1">📊 Score de confiance</p>
            <p>Calculé automatiquement par le système RAG. Il mesure la correspondance entre la question et les documents disponibles.</p>
          </div>
          <div>
            <p className="font-medium text-gray-800 mb-1">🏷️ Sujets</p>
            <p>Classifiés automatiquement par IA toutes les 6 heures en analysant les questions des utilisateurs.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
