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

        {/* Panneau de métriques centré */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            <MetricsPanel metrics={metrics} />
          </div>
        </div>
      </div>

      {/* Chat flottant */}
      <ModernChatInterface onMetricsUpdate={setMetrics} />
    </main>
  )
}
