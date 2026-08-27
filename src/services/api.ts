import router from '@/router'

const LOCAL_CHANGES = import.meta.env.LOCAL_CHANGES === 'true'
const API_BASE = LOCAL_CHANGES ? 'http://localhost:8000/api' : 'https://api.dopsy.kz/api'

// Base URL for backend-served media. LOCAL_CHANGES=true points the app at the
// local backend; otherwise the production API/media host is used.
const MEDIA_BASE = LOCAL_CHANGES ? 'http://localhost:8000/media' : 'https://api.dopsy.kz/media'

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

interface ApiFetchOptions extends RequestInit {
  skipSessionExpiredRedirect?: boolean
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

export async function apiFetch<T>(endpoint: string, options?: ApiFetchOptions): Promise<T> {
  const token =
    localStorage.getItem('dopsy_token') || sessionStorage.getItem('dopsy_token')
  const { skipSessionExpiredRedirect, ...fetchOptions } = options ?? {}

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  })

  // An authenticated request rejected with 401 means the token expired or was
  // revoked — end the session and bounce to login. (A 401 with no token, e.g. a
  // failed signin, falls through to normal error handling below.)
  if (res.status === 401 && token && !skipSessionExpiredRedirect) {
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
