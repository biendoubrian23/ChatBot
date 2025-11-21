'use client'

import { useState } from 'react'
import ModernChatInterface, { ResponseMetric } from '@/components/ModernChatInterface'
import MetricsPanel from '@/components/MetricsPanel'

export default function Home() {
  const [metrics, setMetrics] = useState<ResponseMetric[]>([])

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Bienvenue sur <span className="text-blue-600">CoolLibri</span>
          </h1>
          <p className="text-xl text-gray-600">
            Votre plateforme d&apos;impression de livres professionnelle
          </p>
        </div>

        {/* Cartes de services et panneau de métriques */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
          {/* Cartes de services */}
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Impression de livres</h3>
              <p className="text-gray-600 text-sm">
                Impression professionnelle de vos livres en petite ou grande quantité
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Qualité garantie</h3>
              <p className="text-gray-600 text-sm">
                Impression haute qualité avec finitions professionnelles
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Livraison rapide</h3>
              <p className="text-gray-600 text-sm">
                Expédition rapide avec suivi de commande en temps réel
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Support client</h3>
              <p className="text-gray-600 text-sm">
                Une équipe dédiée pour répondre à toutes vos questions
              </p>
            </div>
          </div>

          {/* Panneau de métriques */}
          <div className="lg:col-span-1">
            <MetricsPanel metrics={metrics} />
          </div>
        </div>
      </div>

      {/* Chat flottant */}
      <ModernChatInterface onMetricsUpdate={setMetrics} />
    </main>
  )
}
