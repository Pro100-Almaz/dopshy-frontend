/**
 * Единый слой данных академии для всех видов спорта.
 *
 * ТЗ §6.2: «Бір кодбаза — SPORT_TYPE айнымалысы арқылы конфигурацияланады» —
 * одна кодовая база, вид спорта задаётся параметром. Раньше футбол и бокс были
 * двумя почти идентичными сервисами (по ~200 строк) и шестью почти
 * идентичными страницами; любая правка в одном виде спорта не доезжала до
 * второго. Здесь один сервис и один набор страниц на оба направления.
 *
 * Мутации намеренно идут на общий `/manager/academy_*`, а чтение — на
 * `/{sport}/*`: только там бэкенд фильтрует группы по `group_type` и собирает
 * учеников из пробных.
 */
import { apiFetch } from './api'

// ── Виды спорта ─────────────────────────────────────────────────────

export type SportKey = 'football' | 'boxing'

export interface SportConfig {
  /** Ключ вида спорта — он же сегмент URL и префикс API. */
  key: SportKey
  /** Название направления: «Футбольная академия». */
  title: string
  /** Короткая подпись для переключателя и заголовков: «Футбол». */
  label: string
  /** Родительный падеж для фраз вида «группы футбола». */
  genitive: string
  /** `group_type` в ответе бэкенда — на случай клиентской фильтрации. */
  groupType: string
}

export const SPORTS: Record<SportKey, SportConfig> = {
  football: {
    key: 'football',
    title: 'Футбольная академия',
    label: 'Футбол',
    genitive: 'футбола',
    groupType: 'football',
  },
  boxing: {
    key: 'boxing',
    title: 'Академия бокса',
    label: 'Бокс',
    genitive: 'бокса',
    groupType: 'boxing',
  },
}

export const SPORT_KEYS = Object.keys(SPORTS) as SportKey[]

export function isSportKey(value: unknown): value is SportKey {
  return typeof value === 'string' && value in SPORTS
}

/** Вид спорта из параметра маршрута; футбол — значение по умолчанию. */
export function resolveSport(value: unknown): SportKey {
  return isSportKey(value) ? value : 'football'
}

// ── Модели ──────────────────────────────────────────────────────────

/**
 * Одна строка расписания: бэкенд отдаёт по строке на каждый тренировочный
 * день, поэтому группа с двумя днями приходит двумя строками с одинаковым
 * `group_id`. Поля из ТЗ §4.1 (`age_min`, `age_max`, `shift`, `is_active`)
 * бэкенд отдаёт не всегда — интерфейс показывает их только когда они пришли.
 */
export interface AcademyGroup {
  id: string
  group_id: number
  group_type: string
  group_name: string
  max_cap: number | null
  curr_cap: number | null
  training_day: string
  training_day_value: number | null
  training_day_label: string
  start_time: string
  end_time: string
  // Необязательные поля из ТЗ §4.1 — приходят, если бэкенд их отдаёт.
  age_min?: number | null
  age_max?: number | null
  shift?: string | null
  is_active?: boolean | null
}

export interface AcademyStudent {
  id: string
  name: string
  age: number | null
  birthdate: string
  parent_phone: string
  total_trials: number
  assigned_group: string
  assigned_group_id: string | number | null
  assigned_group_name: string | null
  subscribed: boolean
}

export interface AcademyTrial {
  id: string
  trial_id: number
  group_id: string
  assigned_group_id: string | number | null
  assigned_group_name: string | null
  child_name: string
  child_age: number | null
  birthdate: string
  language: string
  phone: string
  trial_day: string
  start_time: string
  end_time: string
  state: string
  state_label: string
  notes: string
  attended: boolean
  subscribed: boolean
  user: AcademyStudent | null
  // Необязательные поля из ТЗ §4.2 — приходят, если бэкенд их отдаёт.
  created_at?: string | null
  timestamp?: string | null
  shift?: string | null
  school_time?: string | null
}

/**
 * PATCH /manager/academy_groups/{id} принимает только эти поля. Время —
 * без указания дня, то есть правка применяется к группе целиком: интерфейс
 * обязан говорить об этом прямо, а не делать вид, что меняет один день.
 */
export interface UpdateGroupPayload {
  group_name?: string
  max_cap?: number
  start_time?: string
  end_time?: string
}

// ── Разбор ответов ──────────────────────────────────────────────────

const MANAGER_API_KEY = import.meta.env.VITE_MANAGER_API_KEY || ''

const academyHeaders: Record<string, string> = MANAGER_API_KEY
  ? { 'X-API-Key': MANAGER_API_KEY }
  : {}

/**
 * Академические ручки живут за менеджерским API-ключом и на 401 не должны
 * выкидывать менеджера из сессии — иначе истёкший ключ выглядит как
 * разлогин.
 */
const academyRequest = {
  skipSessionExpiredRedirect: true,
  headers: academyHeaders,
} as const

function subscribedQuery(subscribed?: boolean): string {
  return subscribed === undefined ? '' : `?subscribed=${subscribed ? 'true' : 'false'}`
}

/** Снимает конверт `{ ok, data }`; `ok: false` превращает в ошибку с текстом бэкенда. */
function unwrap(data: unknown): unknown {
  if (data && typeof data === 'object' && 'ok' in data) {
    const envelope = data as { ok?: unknown; data?: unknown; detail?: unknown; message?: unknown }
    if (envelope.ok === false) {
      const detail = typeof envelope.detail === 'string' ? envelope.detail : undefined
      const message = typeof envelope.message === 'string' ? envelope.message : undefined
      throw new Error(detail || message || 'Запрос к API академии не удался')
    }
  }

  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: unknown }).data
  }
  return data
}

function listFrom<T>(data: unknown, keys: string[]): T[] {
  const payload = unwrap(data)
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[]
    }
  }
  return []
}

function entityFrom<T>(data: unknown, keys: string[]): T {
  const payload = unwrap(data)
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of keys) {
      if (record[key] && typeof record[key] === 'object') return record[key] as T
    }
  }
  return payload as T
}

// ── Чтение ──────────────────────────────────────────────────────────

export async function listGroups(sport: SportKey): Promise<AcademyGroup[]> {
  const data = await apiFetch<unknown>(`/${sport}/groups`, academyRequest)
  return listFrom<AcademyGroup>(data, ['groups', 'results', 'items'])
}

export async function listTrials(sport: SportKey, subscribed?: boolean): Promise<AcademyTrial[]> {
  const data = await apiFetch<unknown>(
    `/${sport}/trials${subscribedQuery(subscribed)}`,
    academyRequest,
  )
  return listFrom<AcademyTrial>(data, ['trials', 'results', 'items'])
}

export async function listStudents(
  sport: SportKey,
  subscribed?: boolean,
): Promise<AcademyStudent[]> {
  const data = await apiFetch<unknown>(
    `/${sport}/students${subscribedQuery(subscribed)}`,
    academyRequest,
  )
  return listFrom<AcademyStudent>(data, ['students', 'results', 'items'])
}

// ── Мутации ─────────────────────────────────────────────────────────

/**
 * Отметка «пришёл / не пришёл» после пробного (ТЗ §2.3). Именно эта отметка
 * запускает у бота сообщение родителю, поэтому интерфейс обязан показывать,
 * что именно уйдёт в WhatsApp.
 */
export async function setTrialAttended(
  sport: SportKey,
  trialId: number,
  attended: boolean,
): Promise<AcademyTrial> {
  const data = await apiFetch<unknown>(`/${sport}/trials/${trialId}/attended`, {
    ...academyRequest,
    method: 'PATCH',
    body: JSON.stringify({ attended }),
  })
  return entityFrom<AcademyTrial>(data, ['trial'])
}

export async function setTrialSubscribed(
  sport: SportKey,
  trialId: number,
  subscribed: boolean,
): Promise<AcademyTrial> {
  const data = await apiFetch<unknown>(`/${sport}/trials/${trialId}/subscribed`, {
    ...academyRequest,
    method: 'PATCH',
    body: JSON.stringify({ subscribed }),
  })
  return entityFrom<AcademyTrial>(data, ['trial'])
}

export async function setStudentSubscribed(
  sport: SportKey,
  studentId: string,
  subscribed: boolean,
): Promise<AcademyStudent> {
  const data = await apiFetch<unknown>(
    `/${sport}/students/${encodeURIComponent(studentId)}/subscribed`,
    {
      ...academyRequest,
      method: 'PATCH',
      body: JSON.stringify({ subscribed }),
    },
  )
  return entityFrom<AcademyStudent>(data, ['student'])
}

/** Правка группы — общая менеджерская ручка, вид спорта не важен. */
export function updateGroup(
  groupId: string,
  payload: UpdateGroupPayload,
): Promise<{ ok: boolean; data: { group_id: number } }> {
  return apiFetch<{ ok: boolean; data: { group_id: number } }>(
    `/manager/academy_groups/${encodeURIComponent(groupId)}`,
    {
      ...academyRequest,
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

// ── Форматирование ──────────────────────────────────────────────────

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** Дата в виде «11 апр. 2018 г.»; пустое значение — прочерк. */
export function formatDate(value: string): string {
  if (!value) return '—'

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return dateFormat.format(parsed)

  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return isoDate || value
}

/** «+7 700 123 45 67» из любого вида записи; непонятное отдаём как есть. */
export function formatPhone(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }
  return raw || '—'
}

export function phoneDigits(raw: string): string {
  return (raw ?? '').replace(/\D/g, '')
}

export function initials(name: string): string {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

/** Язык переписки родителя: «KZ» / «RU» (бэкенд пишет по-разному). */
export function normalizeLanguage(value: string): 'KZ' | 'RU' | null {
  const upper = (value || '').trim().toUpperCase()
  if (upper.startsWith('KZ') || upper.startsWith('KK')) return 'KZ'
  if (upper.startsWith('RU')) return 'RU'
  return null
}

/** Смена из ТЗ §2.2 в человеческую подпись; неизвестное значение — как есть. */
export function shiftLabel(value?: string | null): string | null {
  if (!value) return null
  const raw = value.trim().toLowerCase()
  if (/таң|утр|morning/.test(raw)) return 'Утро'
  if (/түс|обед|после|after/.test(raw)) return 'После обеда'
  if (/кез|люб|any/.test(raw)) return 'Любая'
  return value
}
