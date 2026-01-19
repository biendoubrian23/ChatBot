/**
 * Service d'authentification pour MONITORA
 * Supporte SQL Server (nouveau) et Supabase (legacy)
 */

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || 'sqlserver'

// Clés de stockage local
const TOKEN_KEY = 'monitora_access_token'
const REFRESH_TOKEN_KEY = 'monitora_refresh_token'
const USER_KEY = 'monitora_user'

// Types
export interface User {
  id: string
  email: string
  full_name?: string
  role: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthError {
  message: string
  status?: number
}

// =====================================================
// GESTION DES TOKENS
// =====================================================

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

// =====================================================
// API D'AUTHENTIFICATION
// =====================================================

async function authFetch(endpoint: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_URL}/api/auth${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await res.json().catch(() => ({ message: 'Erreur serveur' }))

  if (!res.ok) {
    throw { message: data.detail || data.message || 'Erreur', status: res.status } as AuthError
  }

  return data
}

/**
 * Inscription d'un nouvel utilisateur
 */
export async function register(
  email: string, 
  password: string, 
  fullName?: string
): Promise<AuthResponse> {
  const data = await authFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName }),
  })

  // Stocker les tokens et l'utilisateur
  setTokens(data.access_token, data.refresh_token)
  setStoredUser(data.user)

  return data
}

/**
 * Connexion d'un utilisateur existant
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await authFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  // Stocker les tokens et l'utilisateur
  setTokens(data.access_token, data.refresh_token)
  setStoredUser(data.user)

  return data
}

/**
 * Déconnexion
 */
export async function logout(): Promise<void> {
  const token = getAccessToken()
  
  if (token) {
    try {
      await authFetch('/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    } catch {
      // Ignorer les erreurs de déconnexion
    }
  }

  clearTokens()
}

/**
 * Rafraîchit les tokens
 */
export async function refreshTokens(): Promise<AuthResponse | null> {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    return null
  }

  try {
    const data = await authFetch('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    setTokens(data.access_token, data.refresh_token)
    return data
  } catch {
    clearTokens()
    return null
  }
}

/**
 * Récupère l'utilisateur courant
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getAccessToken()
  
  if (!token) {
    return getStoredUser()
  }

  try {
    const user = await authFetch('/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    setStoredUser(user)
    return user
  } catch (error: any) {
    // Si le token est expiré, essayer de rafraîchir
    if (error.status === 401) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        return refreshed.user
      }
    }
    
    clearTokens()
    return null
  }
}

/**
 * Vérifie si le token est valide
 */
export async function verifyToken(): Promise<{ valid: boolean; user?: User }> {
  const token = getAccessToken()
  
  if (!token) {
    return { valid: false }
  }

  try {
    const data = await authFetch('/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (data.valid && data.user) {
      setStoredUser(data.user)
    }

    return data
  } catch {
    return { valid: false }
  }
}

/**
 * Change le mot de passe
 */
export async function changePassword(
  oldPassword: string, 
  newPassword: string
): Promise<void> {
  const token = getAccessToken()
  
  if (!token) {
    throw { message: 'Non authentifié', status: 401 } as AuthError
  }

  await authFetch('/change-password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
}

// =====================================================
// FETCH AUTHENTIFIÉ POUR LES AUTRES API
// =====================================================

/**
 * Effectue une requête API authentifiée
 * Gère automatiquement le rafraîchissement des tokens
 */
export async function authenticatedFetch(
  endpoint: string, 
  options?: RequestInit
): Promise<Response> {
  let token = getAccessToken()

  const makeRequest = async (authToken: string | null): Promise<Response> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`
    }

    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })
  }

  let response = await makeRequest(token)

  // Si 401, essayer de rafraîchir le token
  if (response.status === 401 && token) {
    const refreshed = await refreshTokens()
    
    if (refreshed) {
      response = await makeRequest(refreshed.access_token)
    }
  }

  return response
}

/**
 * Version JSON de authenticatedFetch
 */
export async function authenticatedFetchJSON<T = any>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  const response = await authenticatedFetch(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur serveur' }))
    throw { message: error.detail || error.message || 'Erreur', status: response.status } as AuthError
  }

  return response.json()
}

// =====================================================
// EXPORT PAR DÉFAUT
// =====================================================

const auth = {
  register,
  login,
  logout,
  refreshTokens,
  getCurrentUser,
  verifyToken,
  changePassword,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  authenticatedFetch,
  authenticatedFetchJSON,
}

export default auth
