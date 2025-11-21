import React from 'react';

import { OrderData } from '@/lib/orderUtils';

interface OrderStatusProps {
  order: OrderData;
  onClose: () => void;
}

export default function OrderStatus({ order, onClose }: OrderStatusProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const getShippingStatus = () => {
    const item = order.items[0];
    if (!item) return { message: 'En cours de traitement', emoji: '⚙️', color: 'blue' };

    if (item.confirmed_shipping) {
      return { 
        message: `Expédié le ${formatDate(item.confirmed_shipping)}`, 
        emoji: '📦', 
        color: 'green' 
      };
    }

    if (item.production_date && new Date(item.production_date) < new Date()) {
      return { 
        message: `Expédition prévue le ${formatDate(item.estimated_shipping || '')}`, 
        emoji: '🚚', 
        color: 'orange' 
      };
    }

    return { 
      message: 'En cours de production', 
      emoji: '⚙️', 
      color: 'blue' 
    };
  };

  const shippingStatus = getShippingStatus();

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Commande #{order.order_id}</h2>
            <p className="text-green-100 mt-1">Commande du {formatDate(order.order_date)}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{order.total}€</div>
            <div className="text-green-100">TTC</div>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200">
        <div className={`flex items-center p-4 rounded-lg ${
          shippingStatus.color === 'green' ? 'bg-green-50 border border-green-200' :
          shippingStatus.color === 'orange' ? 'bg-orange-50 border border-orange-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="text-3xl mr-4">{shippingStatus.emoji}</div>
          <div>
            <h3 className={`text-lg font-semibold ${
              shippingStatus.color === 'green' ? 'text-green-800' :
              shippingStatus.color === 'orange' ? 'text-orange-800' :
              'text-blue-800'
            }`}>
              {shippingStatus.message}
            </h3>
            <p className={`text-sm ${
              shippingStatus.color === 'green' ? 'text-green-600' :
              shippingStatus.color === 'orange' ? 'text-orange-600' :
              'text-blue-600'
            }`}>
              Votre commande est en cours de traitement
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Détails des produits
        </h3>
        
        <div className="space-y-4">
          {order.items.map((item: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                  <p className="text-sm text-gray-600">{item.quantity} exemplaire(s)</p>
                </div>
                {item.chrono_number && (
                  <div className="text-right">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Chrono: {item.chrono_number}
                    </span>
                  </div>
                )}
              </div>
              
              {item.num_pages && (
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {item.num_pages} pages
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Production</div>
                  <div className="text-sm font-medium">
                    {item.production_date ? formatDate(item.production_date) : 'En attente'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Expédition prévue</div>
                  <div className="text-sm font-medium">
                    {item.estimated_shipping ? formatDate(item.estimated_shipping) : 'À définir'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Expédition confirmée</div>
                  <div className="text-sm font-medium">
                    {item.confirmed_shipping ? formatDate(item.confirmed_shipping) : 'En attente'}
                  </div>
                </div>
              </div>

              {item.tracking_url && (
                <div className="mt-4">
                  <a 
                    href={item.tracking_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Suivre le colis
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Adresse de livraison
        </h3>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="font-medium text-gray-900 mb-2">{order.customer.name}</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>{order.customer.address}</div>
            {order.customer.address2 && <div>{order.customer.address2}</div>}
            <div>{order.customer.zip_code} {order.customer.city}</div>
          </div>
        </div>

        {/* Bouton de fermeture */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}