// Utilitaires pour la détection et gestion des demandes de suivi de commandes

export const ORDER_TRACKING_KEYWORDS = [
  'commande', 'commandes', 'numéro', 'statut', 'où en est', 'livraison', 
  'expédition', 'tracking', 'suivi', 'en cours', 'reçu',
  'impression', 'délai', 'chronopost', 'gls'
];

export function detectOrderInquiry(message: string): { isOrderInquiry: boolean; orderNumber?: string } {
  const messageLower = message.toLowerCase();
  
  // Mots-clés de base
  const hasOrderKeyword = ORDER_TRACKING_KEYWORDS.some(keyword => 
    messageLower.includes(keyword)
  );
  
  // Patterns spécifiques
  const orderPatterns = [
    /commande\s*#?\s*\d+/i,  // "commande 12345" ou "commande #12345"
    /numéro\s+\d+/i,         // "numéro 12345" 
    /où\s+en\s+est/i,        // "où en est ma commande"
    /livraison\s+de/i,       // "livraison de ma commande"
    /reçu\s+ma\s+commande/i, // "reçu ma commande"
  ];
  
  const hasPattern = orderPatterns.some(pattern => pattern.test(messageLower));
  const isOrderInquiry = hasOrderKeyword || hasPattern;
  
  // Extraire le numéro de commande si présent
  const orderNumber = isOrderInquiry ? extractOrderNumber(message) || undefined : undefined;
  
  return { isOrderInquiry, orderNumber };
}

export function extractOrderNumber(message: string): string | null {
  const patterns = [
    /commande\s*#?\s*(\d+)/i,     // "commande 12345" 
    /numéro\s*#?\s*(\d+)/i,       // "numéro 12345"
    /#(\d+)/i,                    // "#12345"
    /\b(\d{4,})\b/i               // tout nombre de 4+ chiffres
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export interface OrderData {
  order_id: string;
  customer: {
    name: string;
    address: string;
    address2?: string;
    city: string;
    zip_code: string;
  };
  total: number;
  order_date: string;
  items: Array<{
    product_name: string;
    quantity: number;
    chrono_number?: string;
    num_pages?: number;
    production_date?: string;
    estimated_shipping?: string;
    confirmed_shipping?: string;
    tracking_url?: string;
  }>;
}

export async function lookupOrder(orderNumber: string, lastName?: string): Promise<OrderData | null> {
  try {
    const response = await fetch(`/api/v1/order/${orderNumber}/tracking`);
    
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.order_data;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}



export async function getOrderTracking(orderNumber: string): Promise<{
  tracking_response: string;
  order_data: OrderData;
} | null> {
  try {
    const response = await fetch(`/api/v1/order/${orderNumber}/tracking`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tracking:', error);
    return null;
  }
}