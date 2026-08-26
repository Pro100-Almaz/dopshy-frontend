/**
 * Платежи и чеки академии (ТЗ §2.5–2.7, лист «Төлемдер» из §4.3).
 *
 * Бот принимает чек, читает его через AI и записывает данные; подтверждает
 * платёж человек — это прямо оговорено в ТЗ («соңғы растауды admin жасайды»).
 * Экран подтверждения и есть эта ручная часть.
 *
 * На бэкенде ручек пока нет: в проде живут только `/{sport}/groups|trials|students`.
 * Клиент написан под контракт из `docs/api-contract-academy.md` и честно
 * сообщает, что модуль ждёт бэкенд, вместо того чтобы показывать пустую
 * таблицу как рабочую.
 */
import { ApiError, apiFetch } from './api'
import { unwrapAcademyPayload, type SportKey } from './academy'

/** Ручка не реализована на сервере — экран показывает состояние ожидания. */
export class ModuleUnavailableError extends Error {
  constructor(readonly endpoint: string) {
    super(`Эндпоинт ${endpoint} ещё не реализован на бэкенде`)
    this.name = 'ModuleUnavailableError'
  }
}

/** Результат AI-разбора чека (ТЗ §2.7). */
export type CheckStatus =
  /** Чек распознан полностью. */
  | 'read'
  /** Фото размыто — бот попросил переснять. */
  | 'blurry'
  /** Сумма не совпала с ожидаемой. */
  | 'amount_mismatch'
  /** Формат не распознан — нужна ручная проверка. */
  | 'manual'
  | 'unknown'

export interface AcademyPayment {
  id: string
  payment_id: number
  child_name: string
  parent_phone: string
  /** Скидка у ребёнка (ТЗ: «Бар / Жоқ»). */
  has_discount: boolean
  /** Сумма из чека, тенге. */
  amount: number | null
  sender_bank: string
  receiver_bank: string
  check_number: string
  /** Когда прошёл платёж (из чека). */
  payment_date: string | null
  /** До какого числа ждём следующий платёж (ТЗ §2.6). */
  due_date: string | null
  /** Когда бот записал платёж. */
  created_at: string | null
  check_status: CheckStatus
  /** Абонемент активен — по этому флагу бот шлёт напоминания. */
  is_active: boolean
  /** null — менеджер ещё не смотрел. */
  confirmed: boolean | null
  notes: string
  /** Ссылка на файл чека, если бэкенд его хранит. */
  check_url: string | null
}

const CHECK_STATUS_MAP: Record<string, CheckStatus> = {
  read: 'read',
  ok: 'read',
  оқылды: 'read',
  распознан: 'read',
  blurry: 'blurry',
  бұлдыр: 'blurry',
  размыт: 'blurry',
  amount_mismatch: 'amount_mismatch',
  'тексеру керек': 'amount_mismatch',
  manual: 'manual',
  'қолмен тексеру': 'manual',
}

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  read: 'Чек распознан',
  blurry: 'Фото размыто',
  amount_mismatch: 'Сумма не совпала',
  manual: 'Нужна ручная проверка',
  unknown: 'Статус неизвестен',
}

function normalizeCheckStatus(value: unknown): CheckStatus {
  if (typeof value !== 'string') return 'unknown'
  return CHECK_STATUS_MAP[value.trim().toLowerCase()] ?? 'unknown'
}

/** «Бар»/«Жоқ», «да»/«нет», true/false — всё сводим к булеву. */
function normalizeFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return ['true', '1', 'бар', 'да', 'иә', 'yes'].includes(value.trim().toLowerCase())
  }
  return false
}

/** `Number(null)` = 0, поэтому пустую сумму отличаем до приведения типа. */
function toAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function normalizePayment(row: Record<string, unknown>): AcademyPayment {
  const paymentId = Number(row.payment_id ?? row.id ?? 0)

  return {
    id: String(row.payment_id ?? row.id ?? ''),
    payment_id: Number.isFinite(paymentId) ? paymentId : 0,
    child_name: String(row.child_name ?? row.name ?? ''),
    parent_phone: String(row.parent_phone ?? row.phone ?? ''),
    has_discount: normalizeFlag(row.discount ?? row.has_discount),
    amount: toAmount(row.amount),
    sender_bank: String(row.sender_bank ?? ''),
    receiver_bank: String(row.receiver_bank ?? ''),
    check_number: String(row.check_number ?? ''),
    payment_date: (row.payment_date as string) ?? null,
    due_date: (row.due_date as string) ?? null,
    created_at: (row.created_at as string) ?? (row.timestamp as string) ?? null,
    check_status: normalizeCheckStatus(row.check_status),
    is_active: normalizeFlag(row.is_active),
    confirmed:
      row.confirmed === null || row.confirmed === undefined ? null : normalizeFlag(row.confirmed),
    notes: String(row.notes ?? ''),
    check_url: (row.check_url as string) ?? null,
  }
}

const MANAGER_API_KEY = import.meta.env.VITE_MANAGER_API_KEY || ''

const academyHeaders: Record<string, string> = MANAGER_API_KEY
  ? { 'X-API-Key': MANAGER_API_KEY }
  : {}

const request = {
  skipSessionExpiredRedirect: true,
  headers: academyHeaders,
} as const

/** 404/405/501 — ручки нет; всё остальное — настоящая ошибка. */
function asModuleError(endpoint: string, e: unknown): never {
  if (e instanceof ApiError && [404, 405, 501].includes(e.status)) {
    throw new ModuleUnavailableError(endpoint)
  }
  throw e
}

export async function listPayments(sport: SportKey): Promise<AcademyPayment[]> {
  const endpoint = `/${sport}/payments`
  try {
    const data = await apiFetch<unknown>(endpoint, request)
    const payload = unwrapAcademyPayload(data)
    const rows = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { payments?: unknown }).payments)
        ? ((payload as { payments: unknown[] }).payments)
        : []
    return rows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      .map(normalizePayment)
  } catch (e) {
    asModuleError(endpoint, e)
  }
}

export async function setPaymentConfirmed(
  sport: SportKey,
  paymentId: number,
  confirmed: boolean,
): Promise<void> {
  const endpoint = `/${sport}/payments/${paymentId}/confirmed`
  try {
    await apiFetch<unknown>(endpoint, {
      ...request,
      method: 'PATCH',
      body: JSON.stringify({ confirmed }),
    })
  } catch (e) {
    asModuleError(endpoint, e)
  }
}

export async function updatePayment(
  sport: SportKey,
  paymentId: number,
  payload: { due_date?: string; is_active?: boolean; notes?: string },
): Promise<void> {
  const endpoint = `/${sport}/payments/${paymentId}`
  try {
    await apiFetch<unknown>(endpoint, {
      ...request,
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  } catch (e) {
    asModuleError(endpoint, e)
  }
}

// ── Производные величины ────────────────────────────────────────────

const tenge = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export function formatTenge(amount: number | null): string {
  return amount === null ? '—' : `${tenge.format(amount)} ₸`
}

/** Сколько дней просрочки; 0 и меньше — не просрочено. */
export function overdueDays(dueDate: string | null, now: Date = new Date()): number {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return 0
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000)
}
