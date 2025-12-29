import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, HardDrive, Activity, Zap, Thermometer, Users, TrendingUp, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

/**
 * Composant VU-mètre pour afficher les niveaux CPU/GPU en temps réel
 * Style audio VU-meter avec barres animées
 */

// Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1/metrics';
const WS_URL = 'ws://localhost:8000/api/v1/metrics/ws';

// Composant barre VU-mètre individuelle
const VUMeterBar = ({ value, max = 100, label, color = 'green', showValue = true, segments = 20 }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const activeSegments = Math.round((percentage / 100) * segments);
  
  // Couleurs selon le niveau
  const getSegmentColor = (index, total) => {
    const position = index / total;
    if (position > 0.85) return 'bg-red-500';
    if (position > 0.7) return 'bg-orange-500';
    if (position > 0.5) return 'bg-yellow-500';
    return color === 'blue' ? 'bg-blue-500' : 'bg-green-500';
  };
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        {showValue && (
          <span className={`font-bold ${percentage > 85 ? 'text-red-600' : percentage > 70 ? 'text-orange-600' : 'text-gray-700'}`}>
            {value.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex gap-0.5 h-6 bg-gray-100 rounded p-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-all duration-75 ${
              i < activeSegments ? getSegmentColor(i, segments) : 'bg-gray-200'
            }`}
            style={{
              opacity: i < activeSegments ? 1 : 0.3,
              transform: i < activeSegments ? 'scaleY(1)' : 'scaleY(0.7)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Composant VU-mètre vertical (style audio)
const VerticalVUMeter = ({ value, max = 100, label, icon: Icon, color = 'green' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const segments = 15;
  const activeSegments = Math.round((percentage / 100) * segments);
  
  const getSegmentColor = (index) => {
    if (index > segments * 0.85) return 'bg-red-500';
    if (index > segments * 0.7) return 'bg-orange-500';
    if (index > segments * 0.5) return 'bg-yellow-500';
    return color === 'blue' ? 'bg-blue-500' : 'bg-green-500';
  };
  
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-lg min-w-[60px]">
      <div className="flex flex-col-reverse gap-0.5 h-32">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-2 rounded-sm transition-all duration-100 ${
              i < activeSegments ? getSegmentColor(i) : 'bg-gray-600'
            }`}
            style={{
              boxShadow: i < activeSegments ? `0 0 8px ${i > segments * 0.7 ? '#ef4444' : i > segments * 0.5 ? '#f97316' : color === 'blue' ? '#3b82f6' : '#22c55e'}` : 'none'
            }}
          />
        ))}
      </div>
      <div className="text-center">
        {Icon && <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />}
        <div className="text-xs text-gray-400">{label}</div>
        <div className={`text-sm font-bold ${percentage > 85 ? 'text-red-400' : 'text-white'}`}>
          {value.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

// Composant compteur de requêtes
const RequestCounter = ({ active, peak }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white">
      <Users className="w-8 h-8" />
      <div>
        <div className="text-2xl font-bold">{active}</div>
        <div className="text-xs text-purple-200">Requêtes actives</div>
      </div>
      <div className="border-l border-purple-400 pl-4">
        <div className="text-lg font-bold text-yellow-300">{peak}</div>
        <div className="text-xs text-purple-200">Pic max</div>
      </div>
    </div>
  );
};

// Composant principal
const SystemMonitor = ({ backendUrl = 'http://localhost:8000' }) => {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const API_URL = `${backendUrl}/api/v1/metrics`;
  const WS_URL_DYNAMIC = backendUrl.replace('http', 'ws') + '/api/v1/metrics/ws';
  
  // Connexion WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      wsRef.current = new WebSocket(WS_URL_DYNAMIC);
      
      wsRef.current.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('📊 WebSocket connecté pour les métriques système');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(data);
          setHistory(prev => {
            const newHistory = [...prev, data];
            // Garder 60 dernières entrées (30 secondes à 2 samples/sec)
            return newHistory.slice(-60);
          });
        } catch (e) {
          console.error('Erreur parsing métriques:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        setConnected(false);
        console.log('❌ WebSocket déconnecté, tentative de reconnexion...');
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };
      
      wsRef.current.onerror = (e) => {
        setError('Erreur de connexion au serveur de métriques');
        console.error('WebSocket error:', e);
      };
    } catch (e) {
      setError('Impossible de se connecter au serveur');
      console.error('WebSocket connection error:', e);
    }
  }, [WS_URL_DYNAMIC]);
  
  // Effet pour la connexion WebSocket
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);
  
  // Lancer un stress test
  const runStressTest = async (duration = 5, intensity = 70) => {
    try {
      await fetch(`${API_URL}/stress-test?duration_seconds=${duration}&intensity=${intensity}`);
    } catch (e) {
      console.error('Erreur stress test:', e);
    }
  };
  
  // Reset le pic
  const resetPeak = async () => {
    try {
      await fetch(`${API_URL}/request/reset-peak`, { method: 'POST' });
    } catch (e) {
      console.error('Erreur reset peak:', e);
    }
  };
  
  if (error && !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-700 mb-2">Connexion impossible</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={connectWebSocket}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center animate-pulse">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-spin" />
        <p className="text-gray-500">Connexion au moniteur système...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold">Moniteur Système Temps Réel</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {connected ? 'Connecté' : 'Déconnecté'}
            </div>
            <span className="text-xs text-gray-400">PID: {metrics.worker_pid}</span>
          </div>
        </div>
      </div>
      
      {/* VU-mètres style audio */}
      <div className="p-4 bg-gray-900">
        <div className="flex justify-center gap-3 flex-wrap">
          <VerticalVUMeter
            value={metrics.cpu_percent}
            label="CPU"
            icon={Cpu}
            color="green"
          />
          <VerticalVUMeter
            value={metrics.memory_percent}
            label="RAM"
            icon={HardDrive}
            color="blue"
          />
          {metrics.gpu_available && (
            <>
              <VerticalVUMeter
                value={metrics.gpu_percent || 0}
                label="GPU"
                icon={Zap}
                color="green"
              />
              <VerticalVUMeter
                value={metrics.gpu_memory_percent || 0}
                label="VRAM"
                icon={HardDrive}
                color="blue"
              />
            </>
          )}
        </div>
      </div>
      
      {/* Détails */}
      <div className="p-4 grid md:grid-cols-2 gap-4">
        {/* CPU */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-800">CPU</h3>
            <span className="ml-auto text-sm text-gray-500">{metrics.cpu_count} cœurs</span>
          </div>
          <VUMeterBar value={metrics.cpu_percent} label="Utilisation globale" />
          <div className="mt-3 grid grid-cols-4 gap-1">
            {metrics.cpu_percent_per_core.map((core, i) => (
              <div key={i} className="text-center">
                <div className="text-[10px] text-gray-400">C{i}</div>
                <div 
                  className="h-8 rounded bg-gray-200 relative overflow-hidden"
                  title={`Core ${i}: ${core.toFixed(1)}%`}
                >
                  <div 
                    className={`absolute bottom-0 left-0 right-0 transition-all duration-200 ${
                      core > 85 ? 'bg-red-500' : core > 70 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ height: `${core}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {metrics.cpu_freq_current && (
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Fréquence: {metrics.cpu_freq_current.toFixed(0)} MHz</span>
              {metrics.cpu_freq_max && <span>Max: {metrics.cpu_freq_max.toFixed(0)} MHz</span>}
            </div>
          )}
        </div>
        
        {/* Mémoire */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800">Mémoire RAM</h3>
          </div>
          <VUMeterBar value={metrics.memory_percent} label="Utilisation" color="blue" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="bg-white rounded p-2">
              <div className="text-gray-500 text-xs">Utilisé</div>
              <div className="font-bold text-blue-600">{metrics.memory_used_gb} GB</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-gray-500 text-xs">Disponible</div>
              <div className="font-bold text-green-600">{metrics.memory_available_gb} GB</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-gray-500 text-xs">Total</div>
              <div className="font-bold text-gray-700">{metrics.memory_total_gb} GB</div>
            </div>
          </div>
        </div>
        
        {/* GPU (si disponible) */}
        {metrics.gpu_available && (
          <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-gray-800">GPU - {metrics.gpu_name}</h3>
              {metrics.gpu_temperature && (
                <div className="ml-auto flex items-center gap-1 text-sm">
                  <Thermometer className="w-4 h-4 text-orange-500" />
                  <span className={metrics.gpu_temperature > 80 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                    {metrics.gpu_temperature}°C
                  </span>
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <VUMeterBar value={metrics.gpu_percent || 0} label="GPU Compute" color="green" />
              <VUMeterBar value={metrics.gpu_memory_percent || 0} label="VRAM" color="blue" />
            </div>
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>VRAM: {metrics.gpu_memory_used_mb?.toFixed(0)} MB utilisé</span>
              <span>Total: {metrics.gpu_memory_total_mb?.toFixed(0)} MB</span>
            </div>
          </div>
        )}
        
        {/* Requêtes Chatbot */}
        <div className="md:col-span-2">
          <RequestCounter 
            active={metrics.active_requests} 
            peak={metrics.peak_requests} 
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t flex gap-3 justify-center">
        <button
          onClick={() => runStressTest(5, 50)}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 text-sm"
        >
          <TrendingUp className="w-4 h-4" />
          Stress Test 50%
        </button>
        <button
          onClick={() => runStressTest(5, 90)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 text-sm"
        >
          <Zap className="w-4 h-4" />
          Stress Test 90%
        </button>
        <button
          onClick={resetPeak}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Pic
        </button>
      </div>
    </div>
  );
};

export default SystemMonitor;
