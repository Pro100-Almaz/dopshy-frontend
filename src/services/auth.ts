import type { User, UserRole } from '@/types'
import { apiFetch } from './api'

interface LoginPayload {
  email: string
  password: string
}

interface LoginResponse {
  user: User
  token: string
}

/** Shape returned by the backend's POST /api/auth/signin (camelCase-aliased). */
interface AuthorizedAccount {
  token: string
  username: string
  email: string
  role: string
  isVerified: boolean
  isActive: boolean
  isLoggedIn: boolean
  createdAt: string
  updatedAt: string | null
}

interface SigninResponse {
  id: number
  authorizedAccount: AuthorizedAccount
}

async function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms))
}

export const authService = {
  /** POST /auth/signin */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    if (!payload.email || !payload.password) {
      throw new Error('Email и пароль обязательны')
    }
    // Only send the fields the backend expects — extra props (role, remember)
    // are frontend-only and must not leak into the request body.
    const data = await apiFetch<SigninResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    })

    localStorage.setItem('dopsy_token', JSON.stringify(data.authorizedAccount.token))

    // Backend returns { id, authorizedAccount }; adapt it to { user, token }.
    const account = data.authorizedAccount
    return {
      token: account.token,
      user: {
        id: String(data.id),
        name: account.username,
        email: account.email,
        role: account.role as UserRole,
      },
    }
  },

  /** POST /auth/forgot-password — stub */
  async forgotPassword(email: string): Promise<{ message: string }> {
    await delay()
    return { message: `Ссылка для сброса отправлена на ${email}` }
  },

  /** POST /auth/reset-password — stub */
  async resetPassword(_token: string, _password: string): Promise<{ message: string }> {
    await delay()
    return { message: 'Пароль успешно сброшен' }
  },
}
