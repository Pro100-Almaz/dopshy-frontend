import type { HistoryChannel, HistoryPage } from '@/types'
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

/** Канал действия по источнику: 'manager:*' → manager, иначе whatsapp. */
export function channelOf(source: string): HistoryChannel {
  return source.startsWith('manager') ? 'manager' : 'whatsapp'
}

/** Человекочитаемая метка источника: 'Бот' / 'Менеджер'. */
export function sourceLabel(source: string): string {
  return channelOf(source) === 'manager' ? 'Менеджер' : 'Бот'
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
