'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SystemMetrics {
  timestamp: string
  cpu_percent: number
  cpu_percent_per_core: number[]
  cpu_count: number
  memory_percent: number
  memory_used_gb: number
  memory_total_gb: number
  gpu_available: boolean
  gpu_percent: number | null
  gpu_memory_percent: number | null
  gpu_memory_used_mb: number | null
  gpu_memory_total_mb: number | null
  gpu_temperature: number | null
  gpu_name: string | null
  active_requests: number
  peak_requests: number
  worker_pid: number
}

interface TrackedRequest {
  request_id: string
  question: string
  session_id?: string
  source: string
  status: string
  start_time: string
  start_timestamp: number
  end_time?: string
  end_timestamp?: number
  duration_ms?: number
  worker_pid: number
  response_preview: string
  tokens_count: number
  error_message?: string
}

export default function ParallelMonitor() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000')
  const [isMetricsConnected, setIsMetricsConnected] = useState(false)
  const [isTrackingConnected, setIsTrackingConnected] = useState(false)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [gpuHistory, setGpuHistory] = useState<number[]>([])
  const [activeRequests, setActiveRequests] = useState<TrackedRequest[]>([])
  const [completedRequests, setCompletedRequests] = useState<TrackedRequest[]>([])
  
  const metricsWsRef = useRef<WebSocket | null>(null)
  const trackingWsRef = useRef<WebSocket | null>(null)

  // Connexion WebSocket pour les métriques système
  const connectMetricsWs = useCallback(() => {
    if (metricsWsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    const ws = new WebSocket(`${wsUrl}/api/v1/metrics/ws`)

    ws.onopen = () => setIsMetricsConnected(true)
    ws.onmessage = (event) => {
      const data: SystemMetrics = JSON.parse(event.data)
      setMetrics(data)
      setCpuHistory(prev => [...prev, data.cpu_percent].slice(-60))
      if (data.gpu_percent !== null) {
        setGpuHistory(prev => [...prev, data.gpu_percent!].slice(-60))
      }
    }
    ws.onclose = () => {
      setIsMetricsConnected(false)
      setTimeout(connectMetricsWs, 3000)
    }
    ws.onerror = () => setIsMetricsConnected(false)

    metricsWsRef.current = ws
  }, [backendUrl])

  // Connexion WebSocket pour le tracking des requêtes
  const connectTrackingWs = useCallback(() => {
    if (trackingWsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    const ws = new WebSocket(`${wsUrl}/api/v1/tracking/ws`)

    ws.onopen = () => setIsTrackingConnected(true)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'init':
          setActiveRequests(data.active_requests || [])
          setCompletedRequests(data.history || [])
          break
          
        case 'request_start':
          setActiveRequests(prev => {
            const exists = prev.find(r => r.request_id === data.request_id)
            if (exists) return prev
            return [data, ...prev]
          })
          break
          
        case 'request_update':
          setActiveRequests(prev => 
            prev.map(r => r.request_id === data.request_id 
              ? { ...r, status: data.status, response_preview: data.response_preview || r.response_preview, tokens_count: data.tokens_count || r.tokens_count }
              : r
            )
          )
          break
          
        case 'request_end':
          setActiveRequests(prev => prev.filter(r => r.request_id !== data.request_id))
          setCompletedRequests(prev => [data, ...prev].slice(0, 30))
          break
          
        case 'history_cleared':
          setCompletedRequests([])
          break
      }
    }
    
    ws.onclose = () => {
      setIsTrackingConnected(false)
      setTimeout(connectTrackingWs, 3000)
    }
    ws.onerror = () => setIsTrackingConnected(false)

    trackingWsRef.current = ws
  }, [backendUrl])

  useEffect(() => {
    connectMetricsWs()
    connectTrackingWs()
    return () => {
      metricsWsRef.current?.close()
      trackingWsRef.current?.close()
    }
  }, [connectMetricsWs, connectTrackingWs])

  // Effacer l'historique
  const clearHistory = async () => {
    try {
      await fetch(`${backendUrl}/api/v1/tracking/clear`, { method: 'DELETE' })
      setCompletedRequests([])
    } catch (e) {
      console.error(e)
    }
  }

  // Stats
  const avgDuration = completedRequests.length > 0
    ? Math.round(completedRequests.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / completedRequests.length)
    : 0

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-semibold">Parallel Monitor</h1>
          <p className="text-gray-500 text-sm mt-1">Surveillance temps reel des requetes et ressources systeme</p>
        </div>

        {/* Configuration */}
        <div className="border border-gray-200 p-4 mb-6">
          <div className="text-sm font-medium text-gray-600 mb-3">Configuration</div>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">URL Backend</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${isMetricsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">Metriques</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 ${isTrackingConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grille principale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* CPU / GPU / Memoire */}
          <div className="border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600 mb-4">Ressources Systeme</div>
            
            {/* CPU */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>CPU</span>
                <span>{metrics?.cpu_percent?.toFixed(1) || 0}%</span>
              </div>
              <div className="h-3 bg-gray-100 border border-gray-200">
                <div className="h-full bg-black transition-all duration-300" style={{ width: `${metrics?.cpu_percent || 0}%` }} />
              </div>
            </div>

            {/* GPU */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>GPU</span>
                <span>{metrics?.gpu_available ? `${metrics.gpu_percent?.toFixed(1)}%` : 'N/A'}</span>
              </div>
              <div className="h-3 bg-gray-100 border border-gray-200">
                <div className="h-full bg-gray-600 transition-all duration-300" style={{ width: `${metrics?.gpu_percent || 0}%` }} />
              </div>
            </div>

            {/* Memoire */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>RAM</span>
                <span>{metrics?.memory_used_gb?.toFixed(1)} / {metrics?.memory_total_gb?.toFixed(1)} GB</span>
              </div>
              <div className="h-3 bg-gray-100 border border-gray-200">
                <div className="h-full bg-gray-400 transition-all duration-300" style={{ width: `${metrics?.memory_percent || 0}%` }} />
              </div>
            </div>

            {/* Historique */}
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Historique CPU (60s)</div>
              <div className="h-12 bg-gray-50 border border-gray-200 flex items-end">
                {cpuHistory.map((val, i) => (
                  <div key={i} className="flex-1 bg-black mx-px transition-all" style={{ height: `${val}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Requetes actives */}
          <div className="border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium text-gray-600">
                Requetes en cours ({activeRequests.length})
              </div>
              <div className="text-xs text-gray-400">
                Temps moyen: {avgDuration} ms
              </div>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeRequests.length === 0 ? (
                <div className="text-center text-gray-400 py-6 text-sm">
                  Aucune requete en cours. Ouvrez le chatbot et posez une question.
                </div>
              ) : (
                activeRequests.map((req) => (
                  <div key={req.request_id} className="border border-gray-200 p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium truncate">{req.question}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          ID: {req.request_id} | Worker: {req.worker_pid} | Source: {req.source}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 ${
                          req.status === 'streaming' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                    {req.response_preview && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 truncate">
                        {req.response_preview}
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>{req.tokens_count} tokens</span>
                      <span>{Math.round((Date.now() - req.start_timestamp) / 1000)}s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Timeline visuelle */}
        <div className="border border-gray-200 p-4 mb-6">
          <div className="text-sm font-medium text-gray-600 mb-4">Timeline des requetes (parallelisme)</div>
          <div className="h-40 bg-gray-50 border border-gray-200 relative overflow-hidden">
            {activeRequests.length === 0 && completedRequests.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Les requetes apparaitront ici en temps reel
              </div>
            ) : (
              <>
                {/* Requetes actives (en cours) */}
                {activeRequests.map((req, index) => {
                  const now = Date.now()
                  const allRequests = [...activeRequests, ...completedRequests.slice(0, 10)]
                  const minTime = Math.min(...allRequests.map(r => r.start_timestamp))
                  const maxTime = Math.max(now, ...allRequests.map(r => r.end_timestamp || now))
                  const totalDuration = maxTime - minTime || 1
                  
                  const startPercent = ((req.start_timestamp - minTime) / totalDuration) * 100
                  const width = ((now - req.start_timestamp) / totalDuration) * 100

                  return (
                    <div
                      key={req.request_id}
                      className="absolute h-6 bg-yellow-400 animate-pulse flex items-center px-2"
                      style={{
                        left: `${Math.max(0, startPercent)}%`,
                        width: `${Math.max(2, width)}%`,
                        top: `${index * 28 + 8}px`
                      }}
                      title={req.question}
                    >
                      <span className="text-xs text-black truncate">{req.request_id}</span>
                    </div>
                  )
                })}
                
                {/* Requetes completees */}
                {completedRequests.slice(0, 10 - activeRequests.length).map((req, index) => {
                  const now = Date.now()
                  const allRequests = [...activeRequests, ...completedRequests.slice(0, 10)]
                  const minTime = Math.min(...allRequests.map(r => r.start_timestamp))
                  const maxTime = Math.max(now, ...allRequests.map(r => r.end_timestamp || now))
                  const totalDuration = maxTime - minTime || 1
                  
                  const startPercent = ((req.start_timestamp - minTime) / totalDuration) * 100
                  const width = (((req.end_timestamp || now) - req.start_timestamp) / totalDuration) * 100
                  const adjustedIndex = activeRequests.length + index

                  return (
                    <div
                      key={req.request_id}
                      className={`absolute h-6 ${req.status === 'completed' ? 'bg-black' : 'bg-red-500'} flex items-center px-2`}
                      style={{
                        left: `${Math.max(0, startPercent)}%`,
                        width: `${Math.max(2, width)}%`,
                        top: `${adjustedIndex * 28 + 8}px`
                      }}
                      title={`${req.question} (${req.duration_ms}ms)`}
                    >
                      <span className="text-xs text-white truncate">{req.request_id}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Jaune = en cours | Noir = termine | Rouge = erreur
          </div>
        </div>

        {/* Historique des requetes */}
        <div className="border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-medium text-gray-600">
              Historique des requetes ({completedRequests.length})
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-black border border-gray-300 px-3 py-1"
            >
              Effacer
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {completedRequests.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-sm">
                Aucune requete completee
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="pb-2 w-16">ID</th>
                    <th className="pb-2">Question</th>
                    <th className="pb-2 w-20">Statut</th>
                    <th className="pb-2 w-16">Worker</th>
                    <th className="pb-2 w-20">Duree</th>
                    <th className="pb-2 w-16">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {completedRequests.map((req) => (
                    <tr key={req.request_id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-400">{req.request_id}</td>
                      <td className="py-2 truncate max-w-xs" title={req.question}>{req.question}</td>
                      <td className="py-2">
                        <span className={`inline-block w-2 h-2 mr-2 ${
                          req.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-xs text-gray-500">
                          {req.status === 'completed' ? 'OK' : 'Erreur'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{req.worker_pid}</td>
                      <td className="py-2 text-gray-500">{req.duration_ms} ms</td>
                      <td className="py-2 text-gray-500">{req.tokens_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="border border-gray-200 p-4">
            <div className="text-2xl font-semibold">{activeRequests.length}</div>
            <div className="text-xs text-gray-500">En cours</div>
          </div>
          <div className="border border-gray-200 p-4">
            <div className="text-2xl font-semibold">{completedRequests.length}</div>
            <div className="text-xs text-gray-500">Completees</div>
          </div>
          <div className="border border-gray-200 p-4">
            <div className="text-2xl font-semibold">{avgDuration} ms</div>
            <div className="text-xs text-gray-500">Temps moyen</div>
          </div>
          <div className="border border-gray-200 p-4">
            <div className="text-2xl font-semibold">{new Set(completedRequests.map(r => r.worker_pid)).size}</div>
            <div className="text-xs text-gray-500">Workers utilises</div>
          </div>
        </div>

      </div>
    </div>
  )
}
