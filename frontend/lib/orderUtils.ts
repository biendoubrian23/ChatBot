// Utilitaires pour la détection et gestion des demandes de suivi de commandes

// ============================================================================
// SYSTÈME DE SCORING POUR CLASSIFICATION D'INTENTION
// ============================================================================

// Fonction pour normaliser le texte (supprimer accents)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/['']/g, ' ')           // Remplace apostrophes par espaces
    .trim();
}

// Catégories de mots avec leurs scores
const SCORING_RULES = {
  // Mots qui AJOUTENT au score (vers suivi de commande)
  possessifs_commande: {
    keywords: ['ma commande', 'mon colis', 'mes livres', 'mon livre', 'ma livraison', 'mon paquet'],
    score: 4
  },
  problemes_commande: {
    keywords: ['probleme avec', 'souci avec', 'pas arrive', 'pas arrivee', 'pas recu', 'pas recue', 'toujours pas', 'jamais recu', 'jamais arrive', 'en retard', 'retard de', 'perdu', 'perdue', 'bloque', 'bloquee'],
    score: 4
  },
  verbes_etat: {
    keywords: ['en est', 'se trouve', 'est rendu', 'est arrive', 'est ou', 'est-elle', 'est-il', 'niveau', 'etape'],
    score: 3
  },
  mots_suivi: {
    keywords: ['suivi', 'suivre', 'tracking', 'statut', 'status', 'etat'],
    score: 3
  },
  interrogatifs_lieu: {
    keywords: ['ou est', 'ou en est', 'a quel niveau', 'quel est', 'quand arrive', 'quand vais-je'],
    score: 2
  },
  mots_livraison: {
    keywords: ['expedie', 'envoye', 'parti', 'livre', 'recu', 'reception', 'chronopost', 'gls', 'colissimo', 'colis', 'livraison', 'expedition'],
    score: 2
  },
  mots_attente: {
    keywords: ['depuis', 'attends', 'attend', 'attendu', 'ca fait', 'jours que', 'semaines que'],
    score: 2
  },
  
  // Mots qui SOUSTRAIENT du score (vers RAG/procédure)
  mots_action: {
    keywords: ['annuler', 'annulation', 'rembourser', 'remboursement', 'modifier', 'modification', 'changer'],
    score: -5
  },
  mots_question_procedure: {
    keywords: ['comment faire', 'comment puis-je', 'est-il possible', 'peut-on', 'puis-je', 'est-ce possible'],
    score: -4
  },
  mots_info_generale: {
    keywords: ['prix', 'tarif', 'cout', 'combien', 'quel format', 'quelle reliure', 'types de', 'delai general'],
    score: -3
  }
};

// Seuil pour déclencher la demande de numéro de commande
const TRACKING_THRESHOLD = 5;

// Calcul du score d'intention
function calculateIntentScore(message: string): { score: number; breakdown: Record<string, number> } {
  const normalized = normalizeText(message);
  let totalScore = 0;
  const breakdown: Record<string, number> = {};
  
  for (const [category, rule] of Object.entries(SCORING_RULES)) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        totalScore += rule.score;
        breakdown[category] = (breakdown[category] || 0) + rule.score;
        break; // Ne compter qu'une fois par catégorie
      }
    }
  }
  
  return { score: totalScore, breakdown };
}

// ============================================================================
// ARBRE DE DÉCISION PRINCIPAL
// ============================================================================

export type OrderInquiryResult = {
  type: 'direct_tracking';    // Numéro de commande présent → SQL direct
  orderNumber: string;
  score?: number;
} | {
  type: 'ask_order_number';   // Veut suivi mais pas de numéro → demander
  score?: number;
} | {
  type: 'general_question';   // Question procédure/générale → RAG
  score?: number;
};

export function detectOrderInquiry(message: string): OrderInquiryResult {
  const normalized = normalizeText(message);
  
  // ========== ÉTAPE 1: Numéro de commande présent ? ==========
  const orderNumber = extractOrderNumber(message);
  if (orderNumber) {
    return { type: 'direct_tracking', orderNumber };
  }
  
  // ========== ÉTAPE 2: Calcul du score d'intention ==========
  const { score, breakdown } = calculateIntentScore(message);
  
  // Debug (peut être retiré en production)
  console.log(`[Intent] Message: "${message.substring(0, 50)}..." | Score: ${score}`, breakdown);
  
  // ========== ÉTAPE 3: Contient possessif + commande ? ==========
  const hasPossessifCommande = /m(a|on|es)\s+(commande|colis|livre|livraison)/i.test(normalized);
  
  // ========== ÉTAPE 4: Contient verbe d'ACTION ? ==========
  const hasActionVerb = /(annuler|rembourser|modifier|changer|supprimer)/i.test(normalized);
  
  // Si action + possessif commande mais PAS de numéro → RAG (procédure)
  if (hasActionVerb && hasPossessifCommande) {
    return { type: 'general_question', score };
  }
  
  // ========== ÉTAPE 5: Décision basée sur le score ==========
  if (score >= TRACKING_THRESHOLD) {
    return { type: 'ask_order_number', score };
  }
  
  // ========== ÉTAPE 6: Vérification supplémentaire pour cas limites ==========
  // Si possessif + commande + verbe d'état (même si score bas)
  const hasEtatVerb = /(en est|se trouve|est rendu|est arrive|est ou|niveau|etape)/i.test(normalized);
  
  if (hasPossessifCommande && hasEtatVerb && !hasActionVerb) {
    return { type: 'ask_order_number', score };
  }
  
  // ========== ÉTAPE 7: Problème/souci avec commande → demander numéro ==========
  const hasProbleme = /(probleme|souci|pas arrive|pas recu|retard|perdu|bloque|toujours pas|jamais recu)/i.test(normalized);
  
  if (hasPossessifCommande && hasProbleme && !hasActionVerb) {
    return { type: 'ask_order_number', score };
  }
  
  // ========== ÉTAPE 8: Par défaut → RAG ==========
  return { type: 'general_question', score };
}

// Configuration du nombre de chiffres pour les numéros de commande
// Actuellement 5 chiffres, passera à 6 chiffres plus tard
export const ORDER_NUMBER_MIN_DIGITS = 5;

export function extractOrderNumber(message: string): string | null {
  // Patterns avec le nombre minimum de chiffres configurable
  const minDigits = ORDER_NUMBER_MIN_DIGITS;
  
  const patterns = [
    new RegExp(`commande\\s*#?\\s*(\\d{${minDigits},})`, 'i'),     // "commande 12345" 
    new RegExp(`numéro\\s*#?\\s*(\\d{${minDigits},})`, 'i'),       // "numéro 12345"
    new RegExp(`#(\\d{${minDigits},})`, 'i'),                      // "#12345"
    new RegExp(`\\b(\\d{${minDigits},})\\b`, 'i')                  // tout nombre de 5+ chiffres
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