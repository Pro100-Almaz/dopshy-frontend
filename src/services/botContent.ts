/**
 * Контент бота: FAQ, цены, Kaspi-ссылка, номер администратора.
 *
 * ТЗ §2.4 и §9 прямо говорят: пока бизнес не заполнил эти ответы, бот не
 * запускается — это единственный список открытых вопросов, который блокирует
 * проект. Собирать его в переписке неудобно, поэтому здесь экран, где всё
 * видно и посчитано.
 *
 * Ручки на бэкенде пока нет. Тогда черновик живёт в браузере менеджера, а
 * готовый JSON отдаётся разработчику одной кнопкой — вместо таблицы в чате.
 * Как только появится `GET/PUT /{sport}/bot-content`, экран начнёт читать и
 * писать на сервер без правок.
 */
import { ApiError, apiFetch } from './api'
import { SPORTS, unwrapAcademyPayload, type SportKey } from './academy'
import { ModuleUnavailableError } from './academyPayments'

export interface FaqItem {
  id: string
  topic: string
  kz: string
  ru: string
  /** Тема из ТЗ — её нельзя удалить, только заполнить. */
  required: boolean
}

export interface BotContent {
  prices: {
    trial: string
    full: string
    discounted: string
  }
  /** Статическая ссылка Kaspi — API у банка нет (ТЗ §6.1). */
  kaspiLink: string
  /** Номер администратора для фолбэка L3 (ТЗ §2.8). */
  adminPhone: string
  /** WhatsApp-номер академии (ТЗ §9 п.6). */
  whatsappNumber: string
  /** Число месяца, когда бот напоминает об оплате (ТЗ §9 п.9). */
  paymentDay: string
  faq: FaqItem[]
}

/** Темы FAQ из ТЗ §2.4; у бокса — свои два пункта про безопасность и уровни. */
const COMMON_TOPICS: [string, string][] = [
  ['trial-price', 'Цена пробного занятия'],
  ['full-price', 'Цена абонемента (полная)'],
  ['discount-price', 'Цена абонемента (со скидкой)'],
  ['age-limits', 'Возрастные ограничения'],
  ['frequency', 'Как часто проходят занятия'],
  ['duration', 'Длительность занятия'],
  ['trial-duration', 'Сколько длится пробное занятие'],
  ['address', 'Адрес и как добраться'],
  ['equipment', 'Форма и снаряжение'],
  ['coaches', 'Кто тренеры'],
]

const SPORT_TOPICS: Record<SportKey, [string, string][]> = {
  football: [['levels', 'Уровни групп']],
  boxing: [
    ['safety', 'Безопасность: не будет ли травм'],
    ['levels', 'Уровни групп: начинающие и опытные'],
  ],
}

export function defaultContent(sport: SportKey): BotContent {
  return {
    prices: { trial: '', full: '', discounted: '' },
    kaspiLink: '',
    adminPhone: '',
    whatsappNumber: '',
    paymentDay: '',
    faq: [...COMMON_TOPICS, ...SPORT_TOPICS[sport]].map(([id, topic]) => ({
      id,
      topic,
      kz: '',
      ru: '',
      required: true,
    })),
  }
}

/** Сколько обязательных полей заполнено — по ТЗ §9 это готовность к запуску. */
export function readiness(content: BotContent): { filled: number; total: number; missing: string[] } {
  const missing: string[] = []

  const scalar: [string, string][] = [
    ['Цена абонемента (полная)', content.prices.full],
    ['Цена абонемента (со скидкой)', content.prices.discounted],
    ['Цена пробного занятия', content.prices.trial],
    ['Kaspi-ссылка', content.kaspiLink],
    ['Номер администратора', content.adminPhone],
    ['WhatsApp-номер академии', content.whatsappNumber],
    ['День оплаты', content.paymentDay],
  ]

  for (const [label, value] of scalar) {
    if (!value.trim()) missing.push(label)
  }

  for (const item of content.faq) {
    if (!item.required) continue
    if (!item.kz.trim()) missing.push(`${item.topic} — казахский ответ`)
    if (!item.ru.trim()) missing.push(`${item.topic} — русский ответ`)
  }

  const total = scalar.length + content.faq.filter((item) => item.required).length * 2
  return { filled: total - missing.length, total, missing }
}

// ── Черновик в браузере ─────────────────────────────────────────────

function draftKey(sport: SportKey): string {
  return `dopsy_bot_content_${sport}`
}

export function loadDraft(sport: SportKey): BotContent | null {
  try {
    const raw = localStorage.getItem(draftKey(sport))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BotContent>
    return mergeWithDefaults(sport, parsed)
  } catch {
    return null
  }
}

export function saveDraft(sport: SportKey, content: BotContent): boolean {
  try {
    localStorage.setItem(draftKey(sport), JSON.stringify(content))
    return true
  } catch {
    return false
  }
}

export function clearDraft(sport: SportKey) {
  try {
    localStorage.removeItem(draftKey(sport))
  } catch {
    /* нечего чистить */
  }
}

/** Черновик мог быть сохранён до появления новой темы — добираем из шаблона. */
function mergeWithDefaults(sport: SportKey, partial: Partial<BotContent>): BotContent {
  const base = defaultContent(sport)
  const byId = new Map((partial.faq ?? []).map((item) => [item.id, item]))

  return {
    prices: { ...base.prices, ...(partial.prices ?? {}) },
    kaspiLink: partial.kaspiLink ?? '',
    adminPhone: partial.adminPhone ?? '',
    whatsappNumber: partial.whatsappNumber ?? '',
    paymentDay: partial.paymentDay ?? '',
    faq: [
      ...base.faq.map((item) => ({ ...item, ...(byId.get(item.id) ?? {}), required: true })),
      // Темы, добавленные менеджером вручную.
      ...(partial.faq ?? []).filter((item) => !base.faq.some((seed) => seed.id === item.id)),
    ],
  }
}

// ── Серверная часть (контракт) ──────────────────────────────────────

const MANAGER_API_KEY = import.meta.env.VITE_MANAGER_API_KEY || ''

const academyHeaders: Record<string, string> = MANAGER_API_KEY
  ? { 'X-API-Key': MANAGER_API_KEY }
  : {}

const request = {
  skipSessionExpiredRedirect: true,
  headers: academyHeaders,
} as const

function asModuleError(endpoint: string, e: unknown): never {
  if (e instanceof ApiError && [404, 405, 501].includes(e.status)) {
    throw new ModuleUnavailableError(endpoint)
  }
  throw e
}

export async function fetchBotContent(sport: SportKey): Promise<BotContent> {
  const endpoint = `/${sport}/bot-content`
  try {
    const data = await apiFetch<unknown>(endpoint, request)
    const payload = unwrapAcademyPayload(data)
    return mergeWithDefaults(sport, (payload ?? {}) as Partial<BotContent>)
  } catch (e) {
    asModuleError(endpoint, e)
  }
}

export async function saveBotContent(sport: SportKey, content: BotContent): Promise<void> {
  const endpoint = `/${sport}/bot-content`
  try {
    await apiFetch<unknown>(endpoint, {
      ...request,
      method: 'PUT',
      body: JSON.stringify(content),
    })
  } catch (e) {
    asModuleError(endpoint, e)
  }
}

/** JSON для передачи разработчику — ровно та структура, что ждёт бот. */
export function toHandoffJson(sport: SportKey, content: BotContent): string {
  return JSON.stringify(
    {
      sport_type: sport,
      academy: SPORTS[sport].title,
      prices: {
        trial: content.prices.trial,
        subscription_full: content.prices.full,
        subscription_discounted: content.prices.discounted,
      },
      kaspi_link: content.kaspiLink,
      admin_phone: content.adminPhone,
      whatsapp_number: content.whatsappNumber,
      payment_day_of_month: content.paymentDay,
      faq: content.faq.map((item) => ({ topic: item.topic, kz: item.kz, ru: item.ru })),
    },
    null,
    2,
  )
}
