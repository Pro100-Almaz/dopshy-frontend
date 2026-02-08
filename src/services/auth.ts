import type { User, UserRole } from '@/types'

interface LoginPayload {
  email: string
  password: string
  role: UserRole
  remember: boolean
}

interface LoginResponse {
  user: User
  token: string
}

const MOCK_USERS: Record<UserRole, User> = {
  super_admin: {
    id: '1',
    name: 'Алмаз Ержан',
    email: 'admin@dopsyarena.kz',
    role: 'super_admin',
  },
  manager: {
    id: '2',
    name: 'Асель Каримова',
    email: 'manager@dopsyarena.kz',
    role: 'manager',
  },
  coach: {
    id: '3',
    name: 'Арман Тулегенов',
    email: 'coach@dopsyarena.kz',
    role: 'coach',
  },
  accountant: {
    id: '4',
    name: 'Дана Омарова',
    email: 'accountant@dopsyarena.kz',
    role: 'accountant',
  },
  staff: {
    id: '5',
    name: 'Бауыржан Серік',
    email: 'staff@dopsyarena.kz',
    role: 'staff',
  },
}

async function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms))
}

export const authService = {
  /** POST /auth/login — mock */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    await delay()
    if (!payload.email || !payload.password) {
      throw new Error('Email и пароль обязательны')
    }
    const user = MOCK_USERS[payload.role]
    return {
      user: { ...user, email: payload.email },
      token: `mock-jwt-${Date.now()}`,
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
