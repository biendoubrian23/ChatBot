'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chatAPI } from '@/lib/api'
import type { Message } from '@/types/chat'
import MessageBubble from './MessageBubble'
import InputBox from './InputBox'
import Header from './Header'
import WelcomeScreen from './WelcomeScreen'
import OrderTrackingWorkflow from './OrderTrackingWorkflow'
import { detectOrderInquiry } from '@/lib/orderUtils'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showOrderTracking, setShowOrderTracking] = useState(false)
  const [detectedOrderNumber, setDetectedOrderNumber] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // Détecter le type de demande (suivi commande vs question générale)
    const inquiryResult = detectOrderInquiry(content)
    
    // Si numéro de commande présent → workflow SQL direct
    if (inquiryResult.type === 'direct_tracking') {
      setShowOrderTracking(true)
      setDetectedOrderNumber(inquiryResult.orderNumber)
      return
    }
    
    // Si demande de suivi sans numéro → demander le numéro
    if (inquiryResult.type === 'ask_order_number') {
      setShowOrderTracking(true)
      setDetectedOrderNumber(undefined)
      return
    }
    
    // Sinon → question générale, laisser le RAG répondre

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)
    
    // Masquer le workflow de commande si affiché
    setShowOrderTracking(false)
    setDetectedOrderNumber(undefined)
    
    // Démarrer le chronomètre
    const startTime = Date.now()
    let firstByteTime: number | undefined = undefined

    // Create assistant message placeholder with loading indicator
    const assistantId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '...', // Indicateur de chargement
      timestamp: new Date(),
      sources: [],
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Prepare conversation history
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      let fullContent = ''
      let hasStartedReceiving = false

      // Use streaming API
      await chatAPI.sendMessageStream(
        {
          question: content,
          conversation_id: conversationId || undefined,
          history: history,
        },
        // onToken: append each chunk to the message
        (token: string) => {
          if (!hasStartedReceiving) {
            hasStartedReceiving = true
            firstByteTime = Date.now() - startTime // Capturer TTFB
            fullContent = token // Replace loading indicator with first token
          } else {
            fullContent += token
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: fullContent, ttfb: firstByteTime }
                : msg
            )
          )
        },
        // onSources: add sources when received (à la fin maintenant)
        (sources: any[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, sources }
                : msg
            )
          )
        },
        // onComplete
        () => {
          const responseTime = Date.now() - startTime
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, responseTime }
                : msg
            )
          )
          setIsLoading(false)
          if (!conversationId) {
            setConversationId(Date.now().toString())
          }
        },
        // onError
        (errorMsg: string) => {
          console.error('Streaming error:', errorMsg)
          setError(errorMsg)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: 'Désolé, une erreur est survenue lors de la génération de la réponse.' }
                : msg
            )
          )
          setIsLoading(false)
        }
      )
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(
        err.response?.data?.detail || 
        'Une erreur est survenue. Vérifiez que le serveur est démarré.'
      )
      
      // Update message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: 'Désolé, je rencontre des difficultés à répondre pour le moment.' }
            : msg
        )
      )
      setIsLoading(false)
    }
  }

  const handleCloseOrderTracking = () => {
    setShowOrderTracking(false)
    setDetectedOrderNumber(undefined)
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
    setShowOrderTracking(false)
    setDetectedOrderNumber(undefined)
  }

  return (
    <div className="h-screen flex flex-col max-w-5xl mx-auto">
      <Header onNewChat={handleNewChat} hasMessages={messages.length > 0} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !showOrderTracking ? (
          <WelcomeScreen onSendMessage={handleSendMessage} />
        ) : (
          <>
            {/* Messages du chat */}
            <AnimatePresence>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {/* Workflow de suivi de commande */}
            {showOrderTracking && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4"
              >
                <OrderTrackingWorkflow
                  initialOrderNumber={detectedOrderNumber}
                  onClose={handleCloseOrderTracking}
                />
              </motion.div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 mx-4 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <InputBox onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}
