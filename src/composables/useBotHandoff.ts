/**
 * Передача диалога менеджеру (ТЗ §2.8).
 *
 * Последний уровень фолбэка бота — «напишите админу». Дальше диалог ведёт
 * человек, а бот для этого контакта должен молчать, иначе он перебивает
 * менеджера. Ручка для этого уже есть (`/bot-status/{phone}/pause`), но из
 * экранов академии до неё было не дотянуться.
 *
 * Статусы забираем одним запросом `/bot-status/contacts` на страницу, а не по
 * строке: у списка пробных это разница между одним запросом и сотней.
 */
import { ref } from 'vue'

import { ApiError } from '@/services/api'
import { listContacts, normalizePhone, pauseBot, resumeBot } from '@/services/customer'
import type { PausedReason } from '@/types'
import { setPending, type PendingMap } from '@/utils/pending'

export interface HandoffState {
  paused: boolean
  reason: PausedReason
}

export function useBotHandoff() {
  const byPhone = ref<Record<string, HandoffState>>({})
  const pending = ref<PendingMap<string>>({})
  const error = ref('')

  async function load() {
    try {
      const contacts = await listContacts()
      byPhone.value = contacts.reduce<Record<string, HandoffState>>((acc, contact) => {
        acc[normalizePhone(contact.phone)] = {
          paused: contact.paused,
          reason: contact.paused_reason,
        }
        return acc
      }, {})
    } catch {
      // Сервис бота не ответил (часто 502 — он просто не поднят). Это не ошибка
      // экрана академии: статусов нет, кнопку передачи диалога не показываем.
      byPhone.value = {}
    }
  }

  function stateFor(phone: string): HandoffState | null {
    return byPhone.value[normalizePhone(phone)] ?? null
  }

  function isPending(phone: string): boolean {
    return pending.value[normalizePhone(phone)] === true
  }

  /** Пауза = менеджер забрал диалог; снятие паузы = вернул боту. */
  async function toggle(phone: string) {
    const key = normalizePhone(phone)
    if (!key || pending.value[key]) return

    const current = byPhone.value[key]?.paused ?? false
    pending.value = { ...pending.value, [key]: true }
    error.value = ''

    try {
      const result = current ? await resumeBot(key) : await pauseBot(key)
      byPhone.value = {
        ...byPhone.value,
        [key]: { paused: result.paused, reason: result.paused ? 'manual' : null },
      }
    } catch (e) {
      error.value =
        e instanceof ApiError && e.status === 502
          ? 'Сервис бота недоступен — попробуйте ещё раз'
          : e instanceof Error
            ? e.message
            : 'Не удалось переключить бота'
    } finally {
      pending.value = setPending(pending.value, key, false)
    }
  }

  return { load, stateFor, isPending, toggle, error }
}
