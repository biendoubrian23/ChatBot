import React, { useState, useEffect } from 'react';
import { getOrderTracking } from '@/lib/orderUtils';
import ReactMarkdown from 'react-markdown';

interface OrderTrackingWorkflowProps {
  initialOrderNumber?: string;
  onClose: () => void;
}

export default function OrderTrackingWorkflow({ initialOrderNumber, onClose }: OrderTrackingWorkflowProps) {
  const [step, setStep] = useState<'order_number' | 'tracking'>(
    initialOrderNumber ? 'tracking' : 'order_number'
  );
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingResponse, setTrackingResponse] = useState<string | null>(null);

  // Auto-load tracking si un numéro est fourni
  useEffect(() => {
    if (initialOrderNumber) {
      handleOrderSubmit(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleOrderSubmit = async (orderNum: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const tracking = await getOrderTracking(orderNum);
      
      if (tracking) {
        setTrackingResponse(tracking.tracking_response);
        setStep('tracking');
      } else {
        setError('Commande introuvable. Vérifiez le numéro de commande.');
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      handleOrderSubmit(orderNumber.trim());
    }
  };

  const handleNewSearch = () => {
    setStep('order_number');
    setOrderNumber('');
    setError(null);
    setTrackingResponse(null);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📦 Suivi de commande
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Étape 1: Numéro de commande */}
        {step === 'order_number' && (
          <form onSubmit={handleOrderNumberSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéro de commande
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ex: 13349"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                💡 Entrez le numéro de votre commande CoolLibri
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!orderNumber.trim() || isLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recherche...
                </>
              ) : (
                'Rechercher ma commande'
              )}
            </button>
          </form>
        )}



        {/* Affichage du tracking */}
        {step === 'tracking' && trackingResponse && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Informations de commande récupérées
              </p>
            </div>

            <div className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <ReactMarkdown>{trackingResponse}</ReactMarkdown>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleNewSearch}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Nouvelle recherche
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
