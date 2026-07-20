import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardSummary, Booking } from '@/types'
import { dashboardService } from '@/services/dashboard'
import { isBookingInPeriod } from '@/services/booking'

export const useDashboardStore = defineStore('dashboard', () => {
  const activeTab = ref<'football' | 'boxing'>('football')
  const summary = ref<DashboardSummary | null>(null)
  const todayBookings = ref<Booking[]>([])
  const recentPayments = ref<Booking[]>([])
  const loading = ref(false)

  // Одновременно держим только один запрос: тихий поллинг не должен наслаиваться
  // на первичную загрузку (или на предыдущий незавершённый тик).
  let inFlight: Promise<void> | null = null

  // Дешёвое структурное сравнение — данные детерминированы (отсортированы),
  // поэтому сериализация даёт стабильный ключ. Присваиваем ref только при
  // реальном изменении, чтобы не дёргать ре-рендер/анимации без нужды.
  function changed(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) !== JSON.stringify(b)
  }

  /**
   * Загружает данные панели. `silent` — фоновое обновление (поллинг): не трогает
   * `loading` (без скелетона) и обновляет refs только при изменении данных.
   */
  async function fetchDashboard({ silent = false }: { silent?: boolean } = {}) {
    if (inFlight) return inFlight
    if (!silent) loading.value = true

    inFlight = (async () => {
      try {
        const bookings = await dashboardService.getBookings()
        const now = new Date()

        const nextSummary = await dashboardService.getSummary(bookings)
        const nextToday = bookings
          .filter((b) => isBookingInPeriod(b, 'today', now))
          .sort((a, b) => a.start.localeCompare(b.start))
        // Последние платежи — самые свежие брони (listBookings отсортирован по createdAt).
        const nextRecent = bookings.slice(0, 6)

        if (changed(summary.value, nextSummary)) summary.value = nextSummary
        if (changed(todayBookings.value, nextToday)) todayBookings.value = nextToday
        if (changed(recentPayments.value, nextRecent)) recentPayments.value = nextRecent
      } finally {
        if (!silent) loading.value = false
        inFlight = null
      }
    })()

    return inFlight
  }

  return {
    activeTab,
    summary,
    todayBookings,
    recentPayments,
    loading,
    fetchDashboard,
  }
})
