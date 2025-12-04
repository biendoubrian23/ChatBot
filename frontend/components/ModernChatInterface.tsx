'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chatAPI } from '@/lib/api'
import type { Message } from '@/types/chat'
import ModernMessageBubble from './ModernMessageBubble'
import InputBox from './InputBox'
import FloatingChatButton from './FloatingChatButton'
import ChatWindow from './ChatWindow'
import QuickActions from './QuickActions'
import OrderNumberInput from './OrderNumberInput'
import { getOrderTracking, detectOrderInquiry } from '@/lib/orderUtils'
import { detectGreeting } from '@/lib/greetingUtils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

type ConversationMode = 'welcome' | 'normal' | 'order_tracking'

export interface ResponseMetric {
  id: string
  question: string
  responseTime: number
  ttfb: number
  timestamp: Date
  sources?: Array<{
    source: string
    relevance?: number
  }>
}

interface ChatInterfaceProps {
  onMetricsUpdate?: (metrics: ResponseMetric[]) => void
}

export default function ChatInterface({ onMetricsUpdate }: ChatInterfaceProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ConversationMode>('welcome')
  const [showOrderInput, setShowOrderInput] = useState(false)
  const [metricsHistory, setMetricsHistory] = useState<ResponseMetric[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Propager les métriques au parent via useEffect pour éviter setState pendant le rendu
  useEffect(() => {
    if (onMetricsUpdate && metricsHistory.length > 0) {
      onMetricsUpdate(metricsHistory)
    }
  }, [metricsHistory, onMetricsUpdate])

  // Message d'accueil automatique quand le chat s'ouvre
  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: 'Bienvenue sur CoolLibri ! Comment puis-je vous aider aujourd\'hui ?',
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [isChatOpen, messages.length])

  const handleQuickAction = async (action: string) => {
    if (action === 'track_order') {
      // Ajouter message du bot demandant le numéro
      const botMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Veuillez entrer le numéro de votre commande :',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
      setShowOrderInput(true)
      setMode('order_tracking')
    } else if (action === 'other') {
      // Mode chat normal
      setMode('normal')
      setShowOrderInput(false)
    }
  }

  const handleCancelOrderInput = () => {
    setShowOrderInput(false)
    setMode('normal')
    
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'D\'accord, n\'hésitez pas à me poser vos questions sur nos services d\'impression !',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleOrderNumberSubmit = async (orderNumber: string) => {
    // Ajouter le message utilisateur avec le numéro
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: orderNumber,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setShowOrderInput(false)
    setIsLoading(true)

    const startTime = Date.now()
    let firstByteTime: number | undefined = undefined

    const assistantId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '...',
      timestamp: new Date(),
      sources: [{ content: 'Base de données CoolLibri', metadata: { type: 'database' }, relevance_score: 1.0 }],
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      let fullContent = ''
      let hasStartedReceiving = false

      // Utiliser le streaming endpoint avec effet thinking
      await chatAPI.streamOrderTracking(
        orderNumber,
        // onToken: recevoir chaque chunk (pour compatibilité)
        (chunk: string) => {
          if (!hasStartedReceiving) {
            hasStartedReceiving = true
            firstByteTime = Date.now() - startTime
          }
          
          fullContent += chunk
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: fullContent.trim() }
                : msg
            )
          )
        },
        // onComplete
        () => {
          // Sauvegarder les métriques
          const newMetric: ResponseMetric = {
            id: Date.now().toString(),
            question: `Commande n°${orderNumber}`,
            responseTime: Date.now() - startTime,
            ttfb: firstByteTime || 0,
            timestamp: new Date(),
            sources: [{ content: 'Base de données CoolLibri', metadata: { type: 'database' }, relevance_score: 1.0 }]
          }
          
          setMetricsHistory((prev) => {
            const updated = [...prev, newMetric]
            if (onMetricsUpdate) {
              onMetricsUpdate(updated)
            }
            return updated
          })
          
          setIsLoading(false)
          setMode('normal')
        },
        // onError
        (error: string) => {
          const errorMessage: Message = {
            id: assistantId,
            role: 'assistant',
            content: `Désolé, je n'ai pas pu trouver la commande n°${orderNumber}. ${error}`,
            timestamp: new Date(),
          }
          setMessages((prev) => 
            prev.map((msg) =>
              msg.id === assistantId ? errorMessage : msg
            )
          )
          setIsLoading(false)
          setMode('normal')
        },
        // onThinking: afficher les étapes de réflexion
        (thinkingStep: string) => {
          if (!hasStartedReceiving) {
            hasStartedReceiving = true
            firstByteTime = Date.now() - startTime
          }
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: thinkingStep, isThinking: true }
                : msg
            )
          )
        },
        // onFinalResponse: afficher la réponse finale d'un coup
        (finalContent: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: finalContent, isThinking: false }
                : msg
            )
          )
        }
      )
      
    } catch (error) {
      const errorMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: `Désolé, je n'ai pas pu trouver la commande n°${orderNumber}. Veuillez vérifier le numéro et réessayer.`,
        timestamp: new Date(),
      }
      setMessages((prev) => 
        prev.map((msg) =>
          msg.id === assistantId ? errorMessage : msg
        )
      )
      setIsLoading(false)
      setMode('normal')
    }
  }

  const formatOrderResponse = (orderData: any, orderNumber: string): string => {
    // Extraire les informations
    const statusMessages: { [key: number]: string } = {
      1: 'en attente de démarrage',
      2: 'commencée',
      3: 'en phase de prépresse (PAO)',
      4: 'validée et prête pour impression (BAT)',
      5: 'en prépresse numérique',
      6: 'en prépresse offset',
      7: 'en impression numérique',
      8: 'en impression offset',
      9: 'en phase de reliure',
      10: 'en phase de façonnage/finition'
    }

    const status = statusMessages[orderData.status_id] || 'en cours de traitement'
    const item = orderData.items?.[0]

    let response = `Votre commande n°${orderNumber} est actuellement **${status}**.`

    if (orderData.status_id >= 5) {
      response += '\nElle a déjà passé les étapes de prépresse et se trouve maintenant en phase de production.'
    }

    response += '\n\n📅 **Dates clés**\n'
    
    if (item?.production_date) {
      const prodDate = new Date(item.production_date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      response += `La production de votre commande débutera officiellement le **${prodDate}**.\n`
    }

    if (item?.estimated_shipping) {
      const shipDate = new Date(item.estimated_shipping).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      response += `L'expédition est prévue pour le **${shipDate}**`
      
      if (item?.confirmed_shipping) {
        const confirmDate = new Date(item.confirmed_shipping).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        response += `, avec une arrivée confirmée le **${confirmDate}**.\n`
      } else {
        response += '.\n'
      }
    }

    response += '\n🚚 **Modes de livraison disponibles**\n\n'
    response += '**GLS** – Livraison standard (2 à 3 jours) : service de livraison à domicile ou en entreprise.\n\n'
    response += '**Messages Standard** – Click & Collect : vous pouvez retirer directement votre commande dans nos locaux dès qu\'elle sera prête.\n\n'
    response += '**Relais Colis** – Standard (2 à 3 jours) : livraison dans un point relais proche de chez vous.\n\n'

    response += '📁 **Fichiers**\n'
    response += 'Tous vos fichiers ont été reçus et validés : votre commande est prête pour la reproduction.\n\n'
    response += 'Vous recevrez une notification dès que l\'expédition sera confirmée.\nNous restons disponibles si vous avez d\'autres questions. 😊'

    return response
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // ============================================================
    // 1. DÉTECTION DES SALUTATIONS PURES → Réponse avec délai naturel
    // ============================================================
    const greetingResult = detectGreeting(content)
    if (greetingResult.isGreeting) {
      // Ajouter le message utilisateur
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      
      // Afficher l'indicateur de chargement
      setIsLoading(true)
      
      // Délai naturel de 1-1.5 secondes pour simuler une réponse humaine
      const delay = 1000 + Math.random() * 500 // Entre 1s et 1.5s
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Réponse après le délai
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: greetingResult.response || "Bonjour ! Comment puis-je vous aider ?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
      setMode('normal')
      return
    }

    // ============================================================
    // 2. DÉTECTION DES DEMANDES DE SUIVI DE COMMANDE
    // ============================================================
    const inquiryResult = detectOrderInquiry(content)
    
    // Si numéro de commande présent → workflow SQL direct (sans ajouter le message utilisateur ici)
    if (inquiryResult.type === 'direct_tracking') {
      // Ajouter le message utilisateur
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      
      // Appeler directement le tracking
      await handleOrderNumberSubmit(inquiryResult.orderNumber)
      return
    }
    
    // Si demande de suivi sans numéro → demander le numéro
    if (inquiryResult.type === 'ask_order_number') {
      // Ajouter le message utilisateur
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      
      // Demander le numéro de commande
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Veuillez entrer le numéro de votre commande :',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
      setShowOrderInput(true)
      setMode('order_tracking')
      return
    }
    
    // Sinon → question générale, laisser le RAG répondre
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    // Utiliser directement le RAG pour les questions générales
    await handleGeneralQuestion(content, userMessage.id)
  }

  const handleGeneralQuestion = async (content: string, userMessageId: string) => {
    const startTime = Date.now()
    let firstByteTime: number | undefined = undefined

    const assistantId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '...',
      timestamp: new Date(),
      sources: [],
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      const history = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      let fullContent = ''
      let hasStartedReceiving = false
      let sources: any[] = []

      await chatAPI.sendMessageStream(
        {
          question: content,
          conversation_id: conversationId || undefined,
          history: history,
        },
        // onToken
        (token: string) => {
          if (!hasStartedReceiving) {
            hasStartedReceiving = true
            firstByteTime = Date.now() - startTime
            fullContent = token
          } else {
            fullContent += token
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: fullContent }
                : msg
            )
          )
        },
        // onSources
        (sourcesData: any[]) => {
          sources = sourcesData
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, sources: sourcesData }
                : msg
            )
          )
        },
        // onComplete
        () => {
          const newMetric: ResponseMetric = {
            id: Date.now().toString(),
            question: content,
            responseTime: Date.now() - startTime,
            ttfb: firstByteTime || 0,
            timestamp: new Date(),
            sources: sources.map(s => ({
              source: s.metadata?.source || 'Document',
              relevance: s.relevance_score
            }))
          }
          
          setMetricsHistory((prev) => [...prev, newMetric])
          setIsLoading(false)
        },
        // onError
        (errorMsg: string) => {
          setError(errorMsg)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
                  }
                : msg
            )
          )
          setIsLoading(false)
        }
      )
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
              }
            : msg
        )
      )
      setIsLoading(false)
    }
  }

  return (
    <>
      <FloatingChatButton
        isOpen={isChatOpen}
        onClick={() => setIsChatOpen(true)}
      />

      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)}>
        <div className="flex flex-col h-full">
          {/* Zone de messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <ModernMessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {/* Actions rapides après le message de bienvenue */}
            {mode === 'welcome' && messages.length === 1 && (
              <QuickActions onActionClick={handleQuickAction} />
            )}

            {/* Input numéro de commande */}
            {showOrderInput && (
              <OrderNumberInput
                onSubmit={handleOrderNumberSubmit}
                onCancel={handleCancelOrderInput}
                isLoading={isLoading}
              />
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 p-3 rounded-lg text-sm"
              >
                {error}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Zone de saisie - Uniquement en mode normal */}
          {mode === 'normal' && !showOrderInput && (
            <div className="border-t border-gray-200 bg-white p-4">
              <InputBox
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </ChatWindow>
    </>
  )
}
