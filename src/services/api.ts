const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // ngrok free tier serves an HTML interstitial for browser-looking
      // requests unless this header is present.
      'ngrok-skip-browser-warning': 'true',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `API error ${res.status}`)
  }

  return res.json()
}
