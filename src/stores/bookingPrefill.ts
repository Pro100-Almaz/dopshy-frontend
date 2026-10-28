import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LocationQuery, RouteLocationNormalizedLoaded, Router } from 'vue-router'
import { ApiError } from '@/services/api'
import { getPrefill, type BookingPrefill } from '@/services/booking'

// Токен из ссылки бота: URL-safe, 16–128 символов.
const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/

type Status = 'idle' | 'loading' | 'ready' | 'invalid' | 'error'

/**
 * Предзаполнение брони из ссылки бота (/arena?p=<token>#booking).
 * Токен и данные живут только в памяти; токен и маска телефона не логируются.
 */
export const useBookingPrefillStore = defineStore('bookingPrefill', () => {
  const token = ref<string | null>(null)
  const data = ref<BookingPrefill | null>(null)
  const status = ref<Status>('idle')
  // Пользователь ввёл свой номер вместо подставленного.
  const phoneEdited = ref(false)
  let started = false

  // Токен уходит с брони только пока предзаполнение действительно.
  const tokenForSubmit = computed(() => (status.value === 'ready' ? token.value : null))

  async function init(route: RouteLocationNormalizedLoaded, router: Router) {
    if (started) return
    const raw = route.query.p
    const p = Array.isArray(raw) ? raw[0] : raw
    if (typeof p !== 'string' || !TOKEN_RE.test(p)) return
    started = true

    // Токен не должен оставаться в адресной строке и истории.
    const query: LocationQuery = { ...route.query }
    delete query.p
    router.replace({ query, hash: route.hash }).catch(() => {})

    token.value = p
    status.value = 'loading'
    try {
      data.value = await getPrefill(p)
      status.value = 'ready'
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 410)) {
        status.value = 'invalid'
      } else {
        status.value = 'error'
        console.warn('booking prefill unavailable')
      }
      token.value = null
    }
  }

  /** После успешной брони токен повторно не используем. */
  function consume() {
    token.value = null
    data.value = null
    status.value = 'idle'
    phoneEdited.value = false
  }

  return { token, data, status, phoneEdited, tokenForSubmit, init, consume }
})
