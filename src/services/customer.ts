import type { BotEnabledStatus, BotStatus, BotToggleResult, Contact, ContactPage } from '@/types'
import { apiFetch } from './api'

/**
 * Приводит телефон к международному формату без «+» — только цифры.
 * Нужно лишь для телефонов из пользовательского ввода; телефоны из
 * /contacts уже нормализованы бэкендом — их используем как есть.
 */
export function normalizePhone(raw: string): string {
  return (raw ?? '').replace(/\D/g, '')
}

/** Сегмент пути для телефона: URL-кодируем (на будущее — цифрам кодирование не нужно). */
function phonePath(phone: string): string {
  return encodeURIComponent(phone)
}

export interface ContactsQuery {
  page?: number
  page_size?: number
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** Все WhatsApp-контакты со встроенным статусом бота, отсортированы по активности. */
export function listContacts(): Promise<Contact[]>
export function listContacts(q: ContactsQuery): Promise<ContactPage>
export function listContacts(q?: ContactsQuery): Promise<Contact[] | ContactPage> {
  const qs = q ? buildQs({ page: q.page, page_size: q.page_size }) : ''
  return apiFetch<Contact[] | ContactPage>(`/bot-status/contacts${qs}`)
}

// ── Статус / переключение бота ──────────────────────────────────────
export function getBotStatus(phone: string): Promise<BotStatus> {
  return apiFetch<BotStatus>(`/bot-status/${phonePath(phone)}`)
}

/** Выключить бота (пауза) — диалог берёт на себя менеджер. */
export function pauseBot(phone: string): Promise<BotToggleResult> {
  return apiFetch<BotToggleResult>(`/bot-status/${phonePath(phone)}/pause`, {
    method: 'POST',
  })
}

/** Включить бота обратно. */
export function resumeBot(phone: string): Promise<BotToggleResult> {
  return apiFetch<BotToggleResult>(`/bot-status/${phonePath(phone)}/resume`, {
    method: 'POST',
  })
}

// GLobal bot switch
export function getBotEnabled(): Promise<BotEnabledStatus> {
  return apiFetch<BotEnabledStatus>('/bot-status/enabled_status')
}

export function setBotEnabled(enabled: boolean): Promise<BotEnabledStatus> {
  return apiFetch<BotEnabledStatus>('/bot-status/enabled_status', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}

// ── Относительное время для колонки «активность» ────────────────────
const RU_UNITS: [limit: number, div: number, one: string, few: string, many: string][] = [
  [60, 1, 'секунду', 'секунды', 'секунд'],
  [3600, 60, 'минуту', 'минуты', 'минут'],
  [86400, 3600, 'час', 'часа', 'часов'],
  [2592000, 86400, 'день', 'дня', 'дней'],
  [31536000, 2592000, 'месяц', 'месяца', 'месяцев'],
  [Infinity, 31536000, 'год', 'года', 'лет'],
]

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** ISO datetime → «5 минут назад» (пустая строка при некорректной дате). */
export function relativeTime(iso: string, now: Date = new Date()): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000))
  if (seconds < 45) return 'только что'
  for (const [limit, div, one, few, many] of RU_UNITS) {
    if (seconds < limit) {
      const value = Math.max(1, Math.round(seconds / div))
      return `${value} ${pluralRu(value, one, few, many)} назад`
    }
  }
  return iso
}
