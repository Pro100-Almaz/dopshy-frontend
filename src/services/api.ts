import router from '@/router'

const LOCAL_CHANGES = import.meta.env.LOCAL_CHANGES === 'true'
export const API_BASE = LOCAL_CHANGES ? 'http://localhost:8002/api' : 'https://api.dopsy.kz/api'

// Base URL for backend-served media. LOCAL_CHANGES=true points the app at the
// local backend; otherwise the production API/media host is used.
const MEDIA_BASE = LOCAL_CHANGES ? 'http://localhost:8002/media' : 'https://api.dopsy.kz/media'

/** Build a URL for a file stored in the backend media folder, e.g. mediaUrl('img.png'). */
export function mediaUrl(name: string): string {
  return `${MEDIA_BASE}/${name.replace(/^\/+/, '')}`
}

/** Error carrying the HTTP status so callers can branch on it (e.g. 502 → сервис недоступен). */
export class ApiError extends Error {
  status: number
  /** Machine-readable reason from the bot service (e.g. 'SLOT_TAKEN', 'NO_KASPI'), when present. */
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// Бэкенд и бот отвечают по-английски. Известные ответы переводим дословно,
// остальные — общей фразой по HTTP-статусу. Русский текст оставляем как есть.
const RU_ERRORS: Record<string, string> = {
  'insufficient permissions': 'Недостаточно прав для этого действия.',
  'access denied': 'Недостаточно прав для этого действия.',
  unauthorized: 'Требуется вход в систему.',
  'authentication required': 'Требуется вход в систему.',
  'invalid or expired token': 'Сессия истекла. Войдите снова.',
  'account not found': 'Аккаунт не найден.',
  'account is inactive': 'Аккаунт отключён.',
  'only administrators can change regular-customer status':
    'Менять статус постоянного клиента могут только администраторы.',
  'only staff can confirm or decline bookings':
    'Подтверждать и отклонять брони могут только сотрудники.',
  'only staff can assign discounts': 'Назначать скидки могут только сотрудники.',
  'cancellation is only allowed more than 48 hours before the booking start':
    'Отменить бронь можно не позднее чем за 48 часов до начала.',
  'the agent did not answer in time. try again or check the bot service':
    'Агент не ответил вовремя. Попробуйте ещё раз.',
  'student already exists for this phone, name, and group': 'Такой ученик уже есть в этой группе.',
  'user already exists for this phone, name, and group': 'Такой ученик уже есть в этой группе.',
  'assigned_group_id is required for sport-scoped student creation': 'Выберите группу.',
  'group not found': 'Группа не найдена.',
  'payment not found': 'Платёж не найден.',
  'session not found': 'Сессия не найдена.',
  'student not found': 'Ученик не найден.',
  'student or group not found': 'Ученик или группа не найдены.',
  'trial not found': 'Пробное занятие не найдено.',
  'user not found': 'Пользователь не найден.',
  'no fields to update': 'Нет изменений для сохранения.',
  'at least one training day is required': 'Добавьте хотя бы один день тренировки.',
  'duplicate training day/time': 'Это время тренировки уже добавлено.',
  'invalid training day/time': 'Неверный день или время тренировки.',
  'field must be between 1 and 3': 'Номер поля должен быть от 1 до 3.',
}

export function ruError(status: number, message?: string): string {
  if (message && /[А-Яа-яЁё]/.test(message)) return message
  const known = message && RU_ERRORS[message.trim().replace(/\.$/, '').toLowerCase()]
  if (known) return known
  if (status === 400 || status === 422) return 'Проверьте введённые данные.'
  if (status === 401) return 'Требуется вход в систему.'
  if (status === 403) return 'Недостаточно прав для этого действия.'
  if (status === 404) return 'Не найдено.'
  if (status === 409) return 'Конфликт данных: запись уже существует или занята.'
  if (status === 429) return 'Слишком много запросов. Попробуйте позже.'
  if (status >= 500) return 'Сервис временно недоступен. Попробуйте позже.'
  return `Ошибка запроса (код ${status}).`
}

interface ApiFetchOptions extends RequestInit {
  skipSessionExpiredRedirect?: boolean
}

interface ApiBlobResponse {
  blob: Blob
  filename?: string
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
    const code = typeof body.code === 'string' ? body.code : undefined
    throw new ApiError(res.status, ruError(res.status, detail || body.message), code)
  }

  return res.json()
}

function filenameFromDisposition(value: string | null): string | undefined {
  if (!value) return undefined
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8?.[1]) return decodeURIComponent(utf8[1].replace(/"/g, ''))
  const plain = value.match(/filename="?([^";]+)"?/i)
  return plain?.[1]
}

export async function apiFetchBlob(
  endpoint: string,
  options?: ApiFetchOptions,
): Promise<ApiBlobResponse> {
  const token = localStorage.getItem('dopsy_token') || sessionStorage.getItem('dopsy_token')
  const { skipSessionExpiredRedirect, ...fetchOptions } = options ?? {}

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  })

  if (res.status === 401 && token && !skipSessionExpiredRedirect) {
    await handleSessionExpired()
    throw new Error('Сессия истекла. Войдите снова.')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = ''
    try {
      const body = text ? JSON.parse(text) : {}
      const detail = typeof body.detail === 'string' ? body.detail : undefined
      message = detail || body.message || ''
    } catch {
      message = text.slice(0, 200)
    }
    throw new ApiError(res.status, ruError(res.status, message))
  }

  return {
    blob: await res.blob(),
    filename: filenameFromDisposition(res.headers.get('Content-Disposition')),
  }
}
