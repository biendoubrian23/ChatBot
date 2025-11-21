'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ResponseMetric {
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

interface MetricsPanelProps {
  metrics: ResponseMetric[]
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Métriques de performance</h2>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">Aucune donnée pour le moment</p>
          <p className="text-xs mt-1">Posez une question au chatbot pour voir les métriques</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md max-h-[600px] overflow-hidden flex flex-col">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-800">Métriques</h2>
          <p className="text-xs text-gray-500">{metrics.length} réponse{metrics.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {metrics.slice().reverse().map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              {/* Question */}
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 line-clamp-2">
                  {metric.question}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {metric.timestamp.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>

              {/* Métriques de temps */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg p-2 border border-blue-100">
                  <div className="flex items-center space-x-1 mb-1">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">TTFB</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{(metric.ttfb / 1000).toFixed(2)}s</p>
                </div>

                <div className="bg-white rounded-lg p-2 border border-purple-100">
                  <div className="flex items-center space-x-1 mb-1">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Total</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">{(metric.responseTime / 1000).toFixed(2)}s</p>
                </div>
              </div>

              {/* Sources */}
              {metric.sources && metric.sources.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center space-x-1 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700">
                      Sources ({metric.sources.length})
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {metric.sources.slice(0, 3).map((source, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <div className="mt-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate font-medium">
                            {source.source}
                          </p>
                          {source.relevance && (
                            <div className="mt-1 flex items-center space-x-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{ width: `${source.relevance * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 font-mono">
                                {Math.round(source.relevance * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    {metric.sources.length > 3 && (
                      <li className="text-xs text-gray-500 italic pl-4">
                        +{metric.sources.length - 3} autre{metric.sources.length - 3 > 1 ? 's' : ''} source{metric.sources.length - 3 > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
