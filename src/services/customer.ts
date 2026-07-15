import type { BookingApi, BotStatus, Customer, PausedReason } from '@/types'
import { apiFetch } from './api'

/**
 * Приводит телефон к международному формату без «+» — только цифры.
 * Именно этот вид ожидает бэкенд в пути /bot-status/:phone.
 */
export function normalizePhone(raw: string): string {
  return (raw ?? '').replace(/\D/g, '')
}

/** Сегмент пути для телефона: нормализуем и URL-кодируем (на всякий случай). */
function phonePath(phone: string): string {
  return encodeURIComponent(normalizePhone(phone))
}

// ── Статус бота ─────────────────────────────────────────────────────
export function getBotStatus(phone: string): Promise<BotStatus> {
  return apiFetch<BotStatus>(`/bot-status/${phonePath(phone)}`)
}

/** Выключить бота (пауза) — диалог берёт на себя менеджер. */
export function pauseBot(phone: string): Promise<BotStatus> {
  return apiFetch<BotStatus>(`/bot-status/${phonePath(phone)}/pause`, {
    method: 'POST',
  })
}

/** Включить бота обратно. */
export function resumeBot(phone: string): Promise<BotStatus> {
  return apiFetch<BotStatus>(`/bot-status/${phonePath(phone)}/resume`, {
    method: 'POST',
  })
}

// ── Список клиентов ─────────────────────────────────────────────────
// Отдельного эндпоинта клиентской базы пока нет, поэтому собираем клиентов
// из броней (уникальные по телефону) и обогащаем статусом бота.
function foldCustomers(rows: BookingApi[]): Map<string, Customer> {
  const byPhone = new Map<string, Customer>()
  for (const r of rows) {
    const key = normalizePhone(r.phone)
    if (!key) continue
    const existing = byPhone.get(key)
    if (existing) {
      existing.bookingsCount += 1
      // Держим самое свежее имя и дату последней брони.
      if (r.created_at > existing.lastBookingAt) {
        existing.lastBookingAt = r.created_at
        if (r.customer_name) existing.name = r.customer_name
      }
    } else {
      byPhone.set(key, {
        phone: key,
        displayPhone: r.phone,
        name: r.customer_name || key,
        bookingsCount: 1,
        lastBookingAt: r.created_at,
        paused: false,
        paused_reason: null as PausedReason,
      })
    }
  }
  return byPhone
}

/**
 * Клиенты для панели менеджера: собраны из броней, статус бота подтянут
 * параллельно через /bot-status/:phone. Если статус недоступен — считаем,
 * что бот активен (paused: false), чтобы страница не падала.
 */
export async function listCustomers(): Promise<Customer[]> {
  const rows = await apiFetch<BookingApi[]>('/bookings')
  const customers = [...foldCustomers(rows).values()]

  await Promise.all(
    customers.map(async (c) => {
      try {
        const status = await getBotStatus(c.phone)
        c.paused = status.paused
        c.paused_reason = status.paused_reason ?? null
      } catch {
        // Статус недоступен — оставляем дефолт (бот активен).
      }
    }),
  )

  return customers.sort((a, b) => b.lastBookingAt.localeCompare(a.lastBookingAt))
}
