const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

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

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `API error ${res.status}`)
  }

  return res.json()
}
