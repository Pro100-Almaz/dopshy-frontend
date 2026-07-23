import type { HistoryChannel, HistoryPage, ParsedSource, SourceKind } from '@/types'
import { apiFetch } from './api'

// Параметры выборки истории. Пустые значения не попадают в query-строку.
export interface HistoryQuery {
  page?: number
  page_size?: number
  channel?: HistoryChannel // whatsapp | manager
  source?: string // точный источник, напр. 'manager:a1b2c3'
  // Диапазон дат (YYYY-MM-DD). Если задан хотя бы start — используем range-эндпоинт.
  start_date?: string
  end_date?: string
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/**
 * История действий, новые сверху. Использует основной эндпоинт с фильтрами
 * ?source / ?channel; при заданном диапазоне дат — /history/range/{start}/{end}.
 */
export async function listHistory(q: HistoryQuery = {}): Promise<HistoryPage> {
  const { page, page_size, channel, source, start_date, end_date } = q

  if (start_date) {
    const start = start_date
    const end = end_date || start_date
    const qs = buildQs({ page, page_size, channel, source })
    return apiFetch<HistoryPage>(
      `/manager/history/range/${encodeURIComponent(start)}/${encodeURIComponent(end)}${qs}`,
    )
  }

  const qs = buildQs({ page, page_size, channel, source })
  return apiFetch<HistoryPage>(`/manager/history${qs}`)
}

const KNOWN_KINDS = new Set<SourceKind>(['manager', 'chatbot', 'landing', 'account'])

/**
 * Разбирает источник вида '<тип>:<значение>'. Если тип известен (manager,
 * chatbot, landing, account) и значение непустое — возвращает его и правую часть
 * как label. Иначе (нет ':' или тип неизвестен) — kind 'other' и вся строка.
 */
export function parseSource(source: string): ParsedSource {
  const raw = (source ?? '').trim()
  const idx = raw.indexOf(':')
  if (idx > 0) {
    const kind = raw.slice(0, idx) as SourceKind
    const value = raw.slice(idx + 1).trim()
    if (KNOWN_KINDS.has(kind) && value) return { kind, label: value }
  }
  return { kind: 'other', label: raw }
}

/**
 * Оформление бейджа по типу источника: человекочитаемая метка типа (для
 * подсказки/доступности) и классы фона/текста. Иконки задаются в компонентах.
 */
export const SOURCE_META: Record<SourceKind, { typeLabel: string; badgeClass: string }> = {
  manager: {
    typeLabel: 'Менеджер',
    badgeClass: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
  },
  chatbot: {
    typeLabel: 'Бот',
    badgeClass: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  },
  landing: {
    typeLabel: 'Лендинг',
    badgeClass: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  },
  account: {
    typeLabel: 'Аккаунт',
    badgeClass: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400',
  },
  other: {
    typeLabel: 'Источник',
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  },
}

const DT_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** ISO datetime → «19.07.2026, 09:21» (исходная строка при некорректной дате). */
export function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return DT_FMT.format(d)
}
