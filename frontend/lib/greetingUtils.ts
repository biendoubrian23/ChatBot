// Utilitaires pour la détection des salutations simples
// Si c'est une salutation PURE → réponse instantanée (pas d'appel à Ollama)
// Si c'est une salutation + autre chose → envoyer à Ollama

// ============================================================================
// LISTE EXHAUSTIVE DES SALUTATIONS
// ============================================================================

const GREETINGS = [
  // Français - Formelles
  'bonjour',
  'bonsoir',
  'bonne journee',
  'bonne soiree',
  
  // Français - Informelles
  'salut',
  'coucou',
  'cc',
  'slt',
  'bjr',
  'bsr',
  'hello',
  'hey',
  'hi',
  'yo',
  'wesh',
  'hola',
  'ola',
  
  // Salutations avec "ça va"
  'salut ca va',
  'coucou ca va',
  'hello ca va',
  'bonjour ca va',
  'hey ca va',
  'ca va',
  'comment ca va',
  'comment vas tu',
  'comment allez vous',
  'tu vas bien',
  'vous allez bien',
  'bien ou quoi',
  
  // Expressions courtes
  'kikou',
  'kikoo',
  'plop',
  're',
  'rebonjour',
  're bonjour',
  'resalut',
  're salut',
];

// ============================================================================
// RÉPONSES ALÉATOIRES
// ============================================================================

const GREETING_RESPONSES = [
  "Bonjour ! Comment puis-je vous aider ?",
  "Bonjour ! Que puis-je faire pour vous aujourd'hui ?",
  "Salut ! Je suis là pour répondre à vos questions sur CoolLibri.",
  "Bonjour ! En quoi puis-je vous être utile ?",
  "Hello ! Comment puis-je vous aider ?",
];

// ============================================================================
// FONCTIONS DE DÉTECTION
// ============================================================================

/**
 * Normalise le texte pour la comparaison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[.,!?;:'"]/g, '')       // Supprime la ponctuation
    .replace(/\s+/g, ' ')             // Normalise les espaces
    .trim();
}

/**
 * Vérifie si le message est une salutation PURE (sans autre contenu)
 * 
 * @param message - Le message de l'utilisateur
 * @returns true si c'est une salutation pure, false sinon
 * 
 * Exemples:
 * - "salut" → true
 * - "Bonjour !" → true
 * - "salut, ma commande ?" → false
 * - "bonjour 13308" → false
 */
export function isPureGreeting(message: string): boolean {
  const normalized = normalizeText(message);
  
  // Vérifier si le message normalisé est exactement une salutation
  for (const greeting of GREETINGS) {
    if (normalized === greeting) {
      return true;
    }
  }
  
  return false;
}

/**
 * Retourne une réponse aléatoire pour une salutation
 */
export function getGreetingResponse(): string {
  const randomIndex = Math.floor(Math.random() * GREETING_RESPONSES.length);
  return GREETING_RESPONSES[randomIndex];
}

/**
 * Détecte et gère les salutations
 * 
 * @param message - Le message de l'utilisateur
 * @returns { isGreeting: boolean, response?: string }
 */
export function detectGreeting(message: string): { isGreeting: boolean; response?: string } {
  if (isPureGreeting(message)) {
    return {
      isGreeting: true,
      response: getGreetingResponse()
    };
  }
  
  return { isGreeting: false };
}

// ============================================================================
// TESTS (pour debug)
// ============================================================================

/*
Tests attendus:
- isPureGreeting("salut") → true
- isPureGreeting("Salut !") → true
- isPureGreeting("BONJOUR") → true
- isPureGreeting("coucou ça va") → true (variante reconnue)
- isPureGreeting("salut, ma commande ?") → false
- isPureGreeting("bonjour 13308") → false
- isPureGreeting("salut comment imprimer") → false
*/
