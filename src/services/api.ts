import router from '@/router'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Base URL for backend-served media (Django /media/). In dev this stays a
// relative path and the Vite proxy forwards it to the backend; in production
// set VITE_MEDIA_BASE_URL to the backend's absolute media URL if it lives on a
// different origin than the frontend.
const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE_URL || '/media'

/** Build a URL for a file stored in the backend media folder, e.g. mediaUrl('img.png'). */
export function mediaUrl(name: string): string {
  return `${MEDIA_BASE}/${name.replace(/^\/+/, '')}`
}

/** Error carrying the HTTP status so callers can branch on it (e.g. 502 → сервис недоступен). */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Tear down the session and send the user to login. Prefers the auth store so
 * reactive state (token/user) resets too; the dynamic import also breaks the
 * api → store → auth-service → api import cycle. Falls back to clearing storage
 * directly (and redirecting) if the store isn't available.
 */
async function handleSessionExpired(): Promise<void> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    useAuthStore().logout() // clears storage + redirects to /login
    return
  } catch {
    localStorage.removeItem('dopsy_token')
    localStorage.removeItem('dopsy_user')
    sessionStorage.removeItem('dopsy_token')
    sessionStorage.removeItem('dopsy_user')
    if (router.currentRoute.value.path !== '/login') {
      router.push('/login')
    }
  }
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token =
    localStorage.getItem('dopsy_token') || sessionStorage.getItem('dopsy_token')

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })

  // An authenticated request rejected with 401 means the token expired or was
  // revoked — end the session and bounce to login. (A 401 with no token, e.g. a
  // failed signin, falls through to normal error handling below.)
  if (res.status === 401 && token) {
    await handleSessionExpired()
    throw new Error('Сессия истекла. Войдите снова.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // FastAPI reports errors under `detail`; fall back to `message` or a generic label.
    const detail = typeof body.detail === 'string' ? body.detail : undefined
    throw new ApiError(res.status, detail || body.message || `API error ${res.status}`)
  }

  return res.json()
}
