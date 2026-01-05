/**
 * Fingerprint Generator - Client-side browser fingerprinting
 * 
 * Ce module génère un fingerprint unique basé sur les caractéristiques
 * du navigateur pour aider à identifier les utilisateurs de manière anonyme.
 * Utilisé pour la protection anti-spam côté serveur.
 */

interface FingerprintComponents {
  userAgent: string
  language: string
  languages: string[]
  platform: string
  hardwareConcurrency: number
  deviceMemory: number | undefined
  screenWidth: number
  screenHeight: number
  screenDepth: number
  timezoneOffset: number
  timezone: string
  sessionStorage: boolean
  localStorage: boolean
  indexedDB: boolean
  cookieEnabled: boolean
  canvas: string
  webgl: string
  fonts: string[]
}

/**
 * Collecte les composants du fingerprint
 */
function getComponents(): FingerprintComponents {
  const nav = typeof navigator !== 'undefined' ? navigator : null
  const screen = typeof window !== 'undefined' ? window.screen : null
  const win = typeof window !== 'undefined' ? window : null

  return {
    userAgent: nav?.userAgent || '',
    language: nav?.language || '',
    languages: Array.from(nav?.languages || []),
    platform: nav?.platform || '',
    hardwareConcurrency: nav?.hardwareConcurrency || 0,
    deviceMemory: (nav as any)?.deviceMemory,
    screenWidth: screen?.width || 0,
    screenHeight: screen?.height || 0,
    screenDepth: screen?.colorDepth || 0,
    timezoneOffset: new Date().getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionStorage: hasSessionStorage(),
    localStorage: hasLocalStorage(),
    indexedDB: hasIndexedDB(),
    cookieEnabled: nav?.cookieEnabled || false,
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    fonts: detectFonts(),
  }
}

/**
 * Vérifie la disponibilité du sessionStorage
 */
function hasSessionStorage(): boolean {
  try {
    const test = '__test__'
    sessionStorage.setItem(test, test)
    sessionStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Vérifie la disponibilité du localStorage
 */
function hasLocalStorage(): boolean {
  try {
    const test = '__test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Vérifie la disponibilité d'IndexedDB
 */
function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

/**
 * Génère un fingerprint basé sur le canvas
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    canvas.width = 200
    canvas.height = 50
    
    // Dessiner du texte avec différents styles
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.font = '14px Arial'
    ctx.fillText('LibriAssist 🔐', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.font = '18px Times New Roman'
    ctx.fillText('Fingerprint', 4, 45)
    
    return canvas.toDataURL().slice(-50) // Garder seulement la fin pour réduire la taille
  } catch {
    return ''
  }
}

/**
 * Génère un fingerprint basé sur WebGL
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return ''
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 'no-debug-info'
    
    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    
    return `${vendor}~${renderer}`
  } catch {
    return ''
  }
}

/**
 * Détecte les polices installées
 */
function detectFonts(): string[] {
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman',
    'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
  ]
  
  try {
    const testString = 'mmmmmmmmmmlli'
    const testSize = '72px'
    const baseFonts = ['monospace', 'sans-serif', 'serif']
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    
    const detected: string[] = []
    
    // Mesurer la largeur avec les polices de base
    const baseWidths: { [key: string]: number } = {}
    for (const baseFont of baseFonts) {
      ctx.font = `${testSize} ${baseFont}`
      baseWidths[baseFont] = ctx.measureText(testString).width
    }
    
    // Tester chaque police
    for (const font of testFonts) {
      let isDetected = false
      for (const baseFont of baseFonts) {
        ctx.font = `${testSize} "${font}", ${baseFont}`
        const width = ctx.measureText(testString).width
        if (width !== baseWidths[baseFont]) {
          isDetected = true
          break
        }
      }
      if (isDetected) {
        detected.push(font)
      }
    }
    
    return detected
  } catch {
    return []
  }
}

/**
 * Hash simple pour convertir une chaîne en fingerprint
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  
  try {
    // Utiliser SubtleCrypto si disponible
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback: hash simple
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
}

/**
 * Génère le fingerprint complet
 */
export async function generateFingerprint(): Promise<string> {
  // Vérifier le cache
  const cached = getCachedFingerprint()
  if (cached) return cached
  
  try {
    const components = getComponents()
    const componentString = JSON.stringify(components)
    const fingerprint = await hashString(componentString)
    
    // Mettre en cache (expire après 24h)
    cacheFingerprint(fingerprint)
    
    return fingerprint
  } catch (error) {
    console.error('Error generating fingerprint:', error)
    return 'error-fallback'
  }
}

/**
 * Récupère le fingerprint depuis le cache
 */
function getCachedFingerprint(): string | null {
  try {
    const cached = localStorage.getItem('_fp')
    if (!cached) return null
    
    const { value, expiry } = JSON.parse(cached)
    if (Date.now() > expiry) {
      localStorage.removeItem('_fp')
      return null
    }
    
    return value
  } catch {
    return null
  }
}

/**
 * Met en cache le fingerprint
 */
function cacheFingerprint(fingerprint: string): void {
  try {
    const item = {
      value: fingerprint,
      expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 heures
    }
    localStorage.setItem('_fp', JSON.stringify(item))
  } catch {
    // Ignorer les erreurs de cache
  }
}

/**
 * Force la régénération du fingerprint
 */
export function clearFingerprintCache(): void {
  try {
    localStorage.removeItem('_fp')
  } catch {
    // Ignorer
  }
}

/**
 * Export synchrone pour les cas où on a déjà un fingerprint en cache
 */
export function getFingerprint(): string {
  return getCachedFingerprint() || 'pending'
}
