import React, { useState } from 'react';
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react';

const BenchmarkExcelGenerator = () => {
  const [generating, setGenerating] = useState(false);

  // Données d'analyse détaillées
  const modelScores = {
    'llama3.1:8b': {
      exactitude: 4.2,
      completude: 4.0,
      clarte: 4.3,
      tempsMoyen: 16.73,
      ttft: 5.77,
      rank: 1,
      color: '#10b981'
    },
    'mistral:7b': {
      exactitude: 3.8,
      completude: 3.5,
      clarte: 4.0,
      tempsMoyen: 12.98,
      ttft: 6.16,
      rank: 2,
      color: '#3b82f6'
    },
    'neural-chat:7b': {
      exactitude: 3.6,
      completude: 3.8,
      clarte: 3.7,
      tempsMoyen: 15.34,
      ttft: 5.90,
      rank: 3,
      color: '#8b5cf6'
    },
    'gemma2': {
      exactitude: 3.4,
      completude: 3.6,
      clarte: 3.3,
      tempsMoyen: 18.32,
      ttft: 6.88,
      rank: 4,
      color: '#f59e0b'
    },
    'zephyr': {
      exactitude: 3.2,
      completude: 3.4,
      clarte: 2.8,
      tempsMoyen: 19.62,
      ttft: 6.14,
      rank: 5,
      color: '#ef4444'
    },
    'llama3.2': {
      exactitude: 2.8,
      completude: 2.9,
      clarte: 3.5,
      tempsMoyen: 5.76,
      ttft: 3.62,
      rank: 6,
      color: '#ec4899'
    },
    'phi3': {
      exactitude: 2.3,
      completude: 2.5,
      clarte: 2.8,
      tempsMoyen: 10.13,
      ttft: 4.71,
      rank: 7,
      color: '#6b7280'
    }
  };

  const categoriesPerformance = {
    'Facile': {
      'llama3.1:8b': 4.5,
      'mistral:7b': 4.2,
      'neural-chat:7b': 4.0,
      'gemma2': 3.8,
      'zephyr': 3.5,
      'llama3.2': 3.2,
      'phi3': 2.8
    },
    'Chiffres': {
      'llama3.1:8b': 4.3,
      'mistral:7b': 4.0,
      'neural-chat:7b': 3.8,
      'gemma2': 3.5,
      'zephyr': 3.3,
      'llama3.2': 2.9,
      'phi3': 2.5
    },
    'Comparative': {
      'llama3.1:8b': 4.1,
      'mistral:7b': 3.7,
      'neural-chat:7b': 3.6,
      'gemma2': 3.4,
      'zephyr': 3.2,
      'llama3.2': 2.7,
      'phi3': 2.3
    },
    'Complexe': {
      'llama3.1:8b': 3.9,
      'mistral:7b': 3.5,
      'neural-chat:7b': 3.4,
      'gemma2': 3.2,
      'zephyr': 3.0,
      'llama3.2': 2.5,
      'phi3': 2.0
    },
    'Piège': {
      'llama3.1:8b': 4.2,
      'mistral:7b': 3.8,
      'neural-chat:7b': 2.5,
      'gemma2': 2.3,
      'zephyr': 2.2,
      'llama3.2': 1.8,
      'phi3': 1.5
    }
  };

  const generateExcelData = () => {
    // Simulation de génération Excel
    setGenerating(true);
    
    setTimeout(() => {
      const csvContent = generateCSV();
      downloadCSV(csvContent);
      setGenerating(false);
    }, 1500);
  };

  const generateCSV = () => {
    let csv = 'Modèle,Rang,Exactitude,Complétude,Clarté,Score Global,Temps Moyen (s),TTFT (s),Facile,Chiffres,Comparative,Complexe,Piège\n';
    
    Object.entries(modelScores).forEach(([model, data]) => {
      const scoreGlobal = ((data.exactitude + data.completude + data.clarte) / 3).toFixed(2);
      csv += `${model},${data.rank},${data.exactitude},${data.completude},${data.clarte},${scoreGlobal},${data.tempsMoyen},${data.ttft},`;
      csv += `${categoriesPerformance['Facile'][model]},`;
      csv += `${categoriesPerformance['Chiffres'][model]},`;
      csv += `${categoriesPerformance['Comparative'][model]},`;
      csv += `${categoriesPerformance['Complexe'][model]},`;
      csv += `${categoriesPerformance['Piège'][model]}\n`;
    });
    
    return csv;
  };

  const downloadCSV = (csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'benchmark_chatbot_analyse.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-12 h-12 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Analyse Benchmark Chatbot</h1>
                <p className="text-gray-600">Comparaison de 7 modèles LLM - 30 questions</p>
              </div>
            </div>
            <button
              onClick={generateExcelData}
              disabled={generating}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {generating ? 'Génération...' : 'Télécharger CSV'}
            </button>
          </div>
        </div>

        {/* Classement */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Classement des Modèles
          </h2>
          <div className="space-y-4">
            {Object.entries(modelScores)
              .sort((a, b) => a[1].rank - b[1].rank)
              .map(([model, data]) => {
                const scoreGlobal = ((data.exactitude + data.completude + data.clarte) / 3).toFixed(2);
                return (
                  <div key={model} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: data.color }}
                        >
                          {data.rank}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{model}</h3>
                          <p className="text-sm text-gray-600">Score global: {scoreGlobal}/5</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">TTFT</p>
                        <p className="font-bold text-gray-800">{data.ttft}s</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Exactitude</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(data.exactitude / 5) * 100}%`,
                                backgroundColor: data.color 
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{data.exactitude}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Complétude</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(data.completude / 5) * 100}%`,
                                backgroundColor: data.color 
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{data.completude}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Clarté</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(data.clarte / 5) * 100}%`,
                                backgroundColor: data.color 
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{data.clarte}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Analyse des Temps de Réponse */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">⚡ Analyse des Temps de Réponse</h2>
          
          {/* Comparaison globale */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏃</span> Temps de Réponse Complet
              </h3>
              <div className="space-y-3">
                {Object.entries(modelScores)
                  .sort((a, b) => a[1].tempsMoyen - b[1].tempsMoyen)
                  .map(([model, data], index) => (
                    <div key={model} className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: data.color }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-700">{model}</span>
                          <span className="text-lg font-bold text-gray-800">{data.tempsMoyen}s</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(data.tempsMoyen / 20) * 100}%`,
                              backgroundColor: data.color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  <strong>Llama3.2</strong> est 3.4x plus rapide que <strong>Zephyr</strong>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚡</span> TTFT (Time To First Token)
              </h3>
              <div className="space-y-3">
                {Object.entries(modelScores)
                  .sort((a, b) => a[1].ttft - b[1].ttft)
                  .map(([model, data], index) => (
                    <div key={model} className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: data.color }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-700">{model}</span>
                          <span className="text-lg font-bold text-gray-800">{data.ttft}s</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(data.ttft / 7) * 100}%`,
                              backgroundColor: data.color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-xs text-gray-600">
                  Temps avant le premier caractère de réponse (réactivité perçue)
                </p>
              </div>
            </div>
          </div>

          {/* Temps par catégorie */}
          <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-4">⏱️ Temps de Réponse par Catégorie</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-teal-200">
                    <th className="text-left py-3 px-4 font-bold text-gray-700">Modèle</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Facile</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Chiffres</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Comparative</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Complexe</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">Piège</th>
                    <th className="text-center py-3 px-4 font-bold text-teal-700">Moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { model: 'llama3.2', times: { facile: 7.57, chiffres: 4.99, comparative: 5.36, complexe: 5.66, piege: 5.33 } },
                    { model: 'phi3', times: { facile: 14.07, chiffres: 8.83, comparative: 9.65, complexe: 9.54, piege: 8.44 } },
                    { model: 'mistral:7b', times: { facile: 14.57, chiffres: 9.66, comparative: 12.77, complexe: 16.18, piege: 12.72 } },
                    { model: 'neural-chat:7b', times: { facile: 13.17, chiffres: 12.67, comparative: 17.05, complexe: 19.95, piege: 14.48 } },
                    { model: 'llama3.1:8b', times: { facile: 12.94, chiffres: 14.49, comparative: 17.87, complexe: 17.77, piege: 23.63 } },
                    { model: 'gemma2', times: { facile: 20.13, chiffres: 16.68, comparative: 17.23, complexe: 17.88, piege: 21.15 } },
                    { model: 'zephyr', times: { facile: 18.34, chiffres: 16.71, comparative: 18.15, complexe: 26.04, piege: 19.98 } }
                  ].map(({ model, times }) => {
                    const avg = ((times.facile + times.chiffres + times.comparative + times.complexe + times.piege) / 5).toFixed(2);
                    const color = modelScores[model].color;
                    return (
                      <tr key={model} className="border-b border-teal-100 hover:bg-teal-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-semibold text-gray-700">{model}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4 text-gray-600">{times.facile}s</td>
                        <td className="text-center py-3 px-4 text-gray-600">{times.chiffres}s</td>
                        <td className="text-center py-3 px-4 text-gray-600">{times.comparative}s</td>
                        <td className="text-center py-3 px-4 text-gray-600">{times.complexe}s</td>
                        <td className="text-center py-3 px-4 text-gray-600">{times.piege}s</td>
                        <td className="text-center py-3 px-4">
                          <span className="font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">
                            {avg}s
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-teal-200">
                <p className="text-xs text-gray-600 mb-1">Questions Faciles</p>
                <p className="text-sm text-gray-700">
                  <strong className="text-green-600">Llama3.2:</strong> 7.57s (le plus rapide)
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-teal-200">
                <p className="text-xs text-gray-600 mb-1">Questions Complexes</p>
                <p className="text-sm text-gray-700">
                  <strong className="text-orange-600">Zephyr:</strong> 26.04s (le plus lent)
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-teal-200">
                <p className="text-xs text-gray-600 mb-1">Questions Pièges</p>
                <p className="text-sm text-gray-700">
                  <strong className="text-blue-600">Llama3.1:8b:</strong> 23.63s (prend son temps)
                </p>
              </div>
            </div>
          </div>

          {/* Rapport Qualité/Vitesse */}
          <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-4">🎯 Rapport Qualité / Vitesse</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">⚡ Plus Rapides (mais moins fiables)</h4>
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded-lg border-l-4 border-pink-500">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Llama3.2</span>
                      <span className="text-sm text-gray-600">5.76s</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">❌ Score qualité: 2.9/5 - Trop d'erreurs</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-l-4 border-gray-500">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Phi3</span>
                      <span className="text-sm text-gray-600">10.13s</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">❌ Score qualité: 2.5/5 - Hallucinations</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">🏆 Meilleur Compromis</h4>
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded-lg border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Mistral:7b</span>
                      <span className="text-sm text-gray-600">12.98s</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">✅ Score qualité: 3.8/5 - Bon équilibre</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Llama3.1:8b</span>
                      <span className="text-sm text-gray-600">16.73s</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">✅ Score qualité: 4.2/5 - Meilleure fiabilité</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg border border-orange-300">
              <p className="text-sm text-gray-700">
                <strong>💡 Insight:</strong> Llama3.2 est 2.9x plus rapide que Llama3.1:8b, mais son score de qualité est 45% inférieur. 
                <strong className="text-orange-600"> La vitesse ne compense pas les erreurs critiques.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Performance par catégorie */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Performance par Catégorie de Questions</h2>
          <div className="space-y-6">
            {Object.entries(categoriesPerformance).map(([category, scores]) => (
              <div key={category} className="border-b pb-6 last:border-b-0">
                <h3 className="font-bold text-lg text-gray-700 mb-4">{category}</h3>
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(scores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([model, score]) => (
                      <div key={model} className="text-center">
                        <div 
                          className="h-24 rounded-lg flex items-end justify-center p-2 mb-2 transition-all hover:scale-105"
                          style={{ 
                            backgroundColor: modelScores[model].color,
                            height: `${(score / 5) * 100}px`
                          }}
                        >
                          <span className="text-white font-bold">{score}</span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{model.split(':')[0]}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions Problématiques */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
          <h2 className="text-2xl font-bold text-red-600 mb-6">🚨 Questions où TOUS les modèles ont échoué</h2>
          
          <div className="space-y-6">
            {/* Q28 - Droit de rétractation */}
            <div className="border-l-4 border-red-500 bg-red-50 p-6 rounded-r-xl">
              <div className="flex items-start gap-4">
                <div className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                  28
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    Droit de rétractation - ERREUR CRITIQUE
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Question:</strong> "J'ai commandé mon livre mais je veux annuler, j'ai 14 jours de rétractation légale n'est-ce pas ?"
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-red-600 mb-2">❌ Réponses incorrectes (5 modèles sur 7):</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• <strong>Gemma2:</strong> "Vous avez bien raison, vous disposez d'un délai de rétractation légal de 14 jours"</li>
                      <li>• <strong>Llama3.2:</strong> "Vous avez effectivement la possibilité de rétracter..."</li>
                      <li>• <strong>Neural-chat:</strong> "Bien sûr ! Vous avez bien droit à une période de rétractation..."</li>
                      <li>• <strong>Zephyr:</strong> "Bien sûr! En vertu de la législation..."</li>
                      <li>• <strong>Phi3:</strong> Suggère de contacter pour vérifier le délai</li>
                    </ul>
                  </div>
                  <div className="bg-green-100 border border-green-400 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ RÉPONSE CORRECTE:</p>
                    <p className="text-sm text-gray-800">
                      <strong>NON</strong> - Le droit de rétractation ne s'applique PAS car les livres sont des produits personnalisés fabriqués selon vos spécifications. Une fois la commande validée, elle ne peut pas être annulée.
                    </p>
                    <p className="text-xs text-green-700 mt-2">✅ Seuls Llama3.1:8b et Mistral:7b répondent correctement</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Q27 - Correction orthographe */}
            <div className="border-l-4 border-orange-500 bg-orange-50 p-6 rounded-r-xl">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                  27
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    Correction orthographe - Confusion fréquente
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Question:</strong> "Est-ce que Coollibri va corriger les fautes d'orthographe de mon livre avant l'impression ?"
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-orange-600 mb-2">❌ Problèmes identifiés:</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• <strong>Neural-chat:</strong> "Nous ne relisons pas... mais vous pouvez corriger manuellement après impression" (FAUX!)</li>
                      <li>• <strong>Phi3:</strong> "Nous proposons un service d'ajustement post-impression" (Invente un service!)</li>
                      <li>• <strong>Zephyr:</strong> Liste des correcteurs mais pas assez clair sur le NON</li>
                      <li>• Plusieurs modèles manquent de fermeté dans le NON</li>
                    </ul>
                  </div>
                  <div className="bg-green-100 border border-green-400 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ RÉPONSE CORRECTE:</p>
                    <p className="text-sm text-gray-800">
                      <strong>NON</strong> - Coollibri n'effectue AUCUNE relecture orthographique, ni correction d'erreurs, ni contrôle du contenu. Le livre est imprimé tel quel. Des correcteurs indépendants sont listés sur le blog: https://www.coollibri.com/blog/correcteur-relecteur/
                    </p>
                    <p className="text-xs text-green-700 mt-2">✅ Seul Llama3.1:8b donne une réponse parfaite</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Q1 - Horaires service client */}
            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-6 rounded-r-xl">
              <div className="flex items-start gap-4">
                <div className="bg-yellow-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    Horaires service client - Erreur récurrente
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Question:</strong> "Comment puis-je contacter le service client de Coollibri ?"
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-yellow-600 mb-2">❌ Erreur fréquente (5 modèles sur 7):</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• <strong>Gemma2, Llama3.1:8b, Neural-chat, Zephyr:</strong> "8h30 à 17h"</li>
                      <li>• <strong>Phi3:</strong> Invente un numéro: "+3164205987" (GRAVE!)</li>
                    </ul>
                  </div>
                  <div className="bg-green-100 border border-green-400 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ RÉPONSE CORRECTE:</p>
                    <p className="text-sm text-gray-800">
                      Par téléphone au <strong>05 31 61 60 42</strong> ou par email à <strong>contact@coollibri.com</strong>, du lundi au vendredi de <strong>8h30 à 18h</strong> (et non 17h).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Q6 - Délai réclamation */}
            <div className="border-l-4 border-purple-500 bg-purple-50 p-6 rounded-r-xl">
              <div className="flex items-start gap-4">
                <div className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                  6
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    Délai réclamation - Imprécision généralisée
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Question:</strong> "Quel est le délai pour faire une réclamation après livraison ?"
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-purple-600 mb-2">❌ Tous les modèles sont vagues:</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• <strong>Gemma2:</strong> "un délai raisonnable" (trop vague)</li>
                      <li>• <strong>Llama3.1:8b, Neural-chat, Zephyr:</strong> "deux semaines" (FAUX - trop long!)</li>
                      <li>• Aucun ne donne le délai exact de 3 jours ouvrables</li>
                    </ul>
                  </div>
                  <div className="bg-green-100 border border-green-400 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ RÉPONSE CORRECTE:</p>
                    <p className="text-sm text-gray-800">
                      <strong>3 jours ouvrables</strong> après la livraison, en envoyant un email à contact@coollibri.com avec photos et numéro de commande.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Q29 - Image double page */}
            <div className="border-l-4 border-pink-500 bg-pink-50 p-6 rounded-r-xl">
              <div className="flex items-start gap-4">
                <div className="bg-pink-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                  29
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">
                    Image double page - Conseils inappropriés
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Question:</strong> "Je veux mettre une grande photo sur deux pages en vis-à-vis avec une reliure dos carré collé, c'est possible ?"
                  </p>
                  <div className="bg-white p-4 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-pink-600 mb-2">❌ Mauvais conseils (6 modèles sur 7):</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• <strong>Llama3.2, Phi3, Zephyr:</strong> "Oui c'est possible" (mauvais conseil!)</li>
                      <li>• <strong>Neural-chat:</strong> Recommande du papier plus épais (ne résout pas le problème)</li>
                      <li>• Ne déconseillent pas clairement cette pratique</li>
                    </ul>
                  </div>
                  <div className="bg-green-100 border border-green-400 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ RÉPONSE CORRECTE:</p>
                    <p className="text-sm text-gray-800">
                      <strong>DÉCONSEILLÉ</strong> - Avec une reliure dos carré collé ou rembordé, le livre ne s'ouvre jamais complètement à plat. Une partie de l'image sera prise dans la reliure. Pour une image panoramique, privilégier la <strong>reliure spirale</strong> qui s'ouvre à 360°.
                    </p>
                    <p className="text-xs text-green-700 mt-2">✅ Seuls Llama3.1:8b et Mistral:7b le déconseillent correctement</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🏆 TOP 3 DES MEILLEURS MODÈLES */}
        <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl shadow-xl p-8 mt-8 border-2 border-amber-300">
          <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-3">
            <span className="text-4xl">🏆</span>
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              TOP 3 DES MEILLEURS MODÈLES
            </span>
            <span className="text-4xl">🏆</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* 🥇 1ère Place - Llama3.1:8b */}
            <div className="relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2">
                  <span className="text-2xl">🥇</span> 1ère Place
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl p-6 pt-10 border-4 border-yellow-400 shadow-xl transform hover:scale-105 transition-all">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    #1
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mt-3">Llama3.1:8b</h3>
                  <p className="text-amber-600 font-semibold">Champion Toutes Catégories</p>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score Global</span>
                      <span className="text-xl font-bold text-green-600">4.17/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '83.4%' }}></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exactitude</span>
                      <span className="font-bold text-green-600">4.2/5</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Questions Pièges</span>
                      <span className="font-bold text-green-600">4.2/5 ⭐</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">TTFT</span>
                      <span className="font-bold text-gray-700">5.77s</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-300">
                  <p className="text-xs text-green-800 text-center">
                    <strong>✅ Meilleur choix pour la production</strong><br/>
                    Fiabilité maximale, gère bien les questions complexes
                  </p>
                </div>
              </div>
            </div>

            {/* 🥈 2ème Place - Mistral:7b */}
            <div className="relative md:mt-8">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2">
                  <span className="text-2xl">🥈</span> 2ème Place
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 pt-10 border-4 border-gray-300 shadow-xl transform hover:scale-105 transition-all">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    #2
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mt-3">Mistral:7b</h3>
                  <p className="text-blue-600 font-semibold">Meilleur Compromis</p>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score Global</span>
                      <span className="text-xl font-bold text-blue-600">3.77/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75.4%' }}></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exactitude</span>
                      <span className="font-bold text-blue-600">3.8/5</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Questions Pièges</span>
                      <span className="font-bold text-blue-600">3.8/5</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">TTFT</span>
                      <span className="font-bold text-gray-700">6.16s</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-xs text-blue-800 text-center">
                    <strong>⚡ Temps réponse total: 12.98s</strong><br/>
                    Bon équilibre vitesse/qualité
                  </p>
                </div>
              </div>
            </div>

            {/* 🥉 3ème Place - Neural-chat:7b */}
            <div className="relative md:mt-16">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-orange-300 to-orange-400 text-orange-900 px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2">
                  <span className="text-2xl">🥉</span> 3ème Place
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 pt-10 border-4 border-orange-300 shadow-xl transform hover:scale-105 transition-all">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    #3
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mt-3">Neural-chat:7b</h3>
                  <p className="text-purple-600 font-semibold">Solide Alternatif</p>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score Global</span>
                      <span className="text-xl font-bold text-purple-600">3.70/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '74%' }}></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Complétude</span>
                      <span className="font-bold text-purple-600">3.8/5 ⭐</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Questions Pièges</span>
                      <span className="font-bold text-orange-500">2.5/5 ⚠️</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">TTFT</span>
                      <span className="font-bold text-purple-600">5.90s ⚡</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-300">
                  <p className="text-xs text-orange-800 text-center">
                    <strong>⚠️ Attention aux questions pièges</strong><br/>
                    Bonne complétude, vigilance requise
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé comparatif */}
          <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
            <h3 className="font-bold text-lg text-gray-800 mb-4 text-center">📊 Tableau Comparatif du Top 3</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-amber-300">
                    <th className="text-left py-3 px-4">Modèle</th>
                    <th className="text-center py-3 px-4">Score</th>
                    <th className="text-center py-3 px-4">Exactitude</th>
                    <th className="text-center py-3 px-4">Pièges</th>
                    <th className="text-center py-3 px-4">TTFT</th>
                    <th className="text-center py-3 px-4">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-amber-100 bg-yellow-50">
                    <td className="py-3 px-4 font-bold">🥇 Llama3.1:8b</td>
                    <td className="text-center py-3 px-4 font-bold text-green-600">4.17</td>
                    <td className="text-center py-3 px-4">4.2</td>
                    <td className="text-center py-3 px-4 text-green-600">4.2 ✓</td>
                    <td className="text-center py-3 px-4">5.77s</td>
                    <td className="text-center py-3 px-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">PRODUCTION</span></td>
                  </tr>
                  <tr className="border-b border-amber-100 bg-gray-50">
                    <td className="py-3 px-4 font-bold">🥈 Mistral:7b</td>
                    <td className="text-center py-3 px-4 font-bold text-blue-600">3.77</td>
                    <td className="text-center py-3 px-4">3.8</td>
                    <td className="text-center py-3 px-4 text-blue-600">3.8 ✓</td>
                    <td className="text-center py-3 px-4">6.16s</td>
                    <td className="text-center py-3 px-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">COMPROMIS</span></td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="py-3 px-4 font-bold">🥉 Neural-chat:7b</td>
                    <td className="text-center py-3 px-4 font-bold text-purple-600">3.70</td>
                    <td className="text-center py-3 px-4">3.6</td>
                    <td className="text-center py-3 px-4 text-orange-500">2.5 ⚠️</td>
                    <td className="text-center py-3 px-4 text-green-600">5.90s ⚡</td>
                    <td className="text-center py-3 px-4"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-bold">ALTERNATIF</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusion */}
          <div className="mt-6 text-center">
            <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl shadow-lg">
              <p className="text-lg font-bold mb-1">🎯 RECOMMANDATION FINALE</p>
              <p className="text-sm">
                Utilisez <strong>Llama3.1:8b</strong> pour la production • 
                <strong> Mistral:7b</strong> si la vitesse est prioritaire
              </p>
            </div>
          </div>
        </div>

        {/* Recommandations */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mt-8 text-white">
          <h2 className="text-2xl font-bold mb-4">🎯 Recommandations</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <h3 className="font-bold mb-2">✅ Pour la Production</h3>
              <ul className="space-y-1 text-sm">
                <li>• Utiliser <strong>Llama3.1:8b</strong> (meilleur rapport qualité/fiabilité)</li>
                <li>• TTFT rapide: <strong>5.77s</strong> (réactivité perçue)</li>
                <li>• Excellente gestion des questions pièges</li>
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <h3 className="font-bold mb-2">⚡ Pour la Rapidité</h3>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Llama3.2</strong> TTFT le plus bas: <strong>3.62s</strong></li>
                <li>• ⚠️ Mais score qualité faible (2.9/5)</li>
                <li>• <strong>Neural-chat:7b</strong> bon TTFT (5.90s) + qualité correcte</li>
              </ul>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 mt-4">
            <h3 className="font-bold mb-2">⚠️ Actions Urgentes</h3>
            <ul className="space-y-1 text-sm">
              <li>• <strong>Fine-tuning CRITIQUE sur Q28</strong> (rétractation) - 5/7 modèles se trompent</li>
              <li>• Corriger les horaires (18h pas 17h) - base de connaissances</li>
              <li>• Valider délai réclamation (3 jours) dans le prompt système</li>
              <li>• Renforcer "NON" ferme sur Q27 (pas de correction)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkExcelGenerator;
