import type { User } from '@/types'
import { apiFetch } from '@/services/api'

interface LoginPayload {
  email: string
  password: string
}

/** Envelope returned by every backend endpoint. */
interface ApiResponse<T> {
  ok: boolean
  data: T | null
  message: string
}

/** Shape of the user object the backend returns in `data`. */
interface ApiUser {
  id: number | string
  email: string
  phone_number?: string | null
  first_name?: string | null
  last_name?: string | null
  is_active?: boolean
  updated_at?: string
}

function mapUser(u: ApiUser): User {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return {
    id: String(u.id),
    name: name || u.email,
    email: u.email,
    phone: u.phone_number ?? undefined,
  }
}

export const authService = {
  /** POST /auth/login */
  async login(payload: LoginPayload): Promise<{ user: User }> {
    const res = await apiFetch<ApiResponse<ApiUser>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    })
    if (!res.ok || !res.data) {
      throw new Error(res.message || 'Неверный email или пароль')
    }
    return { user: mapUser(res.data) }
  },

  /** POST /auth/forgot-password */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await apiFetch<ApiResponse<unknown>>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      throw new Error(res.message || 'Не удалось отправить ссылку')
    }
    return { message: res.message || `Ссылка для сброса отправлена на ${email}` }
  },

  /** POST /auth/reset-password */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const res = await apiFetch<ApiResponse<unknown>>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
    if (!res.ok) {
      throw new Error(res.message || 'Не удалось сбросить пароль')
    }
    return { message: res.message || 'Пароль успешно сброшен' }
  },
}
