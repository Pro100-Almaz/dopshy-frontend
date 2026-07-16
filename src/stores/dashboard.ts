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

  async function fetchDashboard() {
    loading.value = true
    try {
      const bookings = await dashboardService.getBookings()
      const now = new Date()

      summary.value = await dashboardService.getSummary(bookings)

      todayBookings.value = bookings
        .filter((b) => isBookingInPeriod(b, 'today', now))
        .sort((a, b) => a.start.localeCompare(b.start))

      // Последние платежи — самые свежие брони (listBookings уже отсортирован по createdAt).
      recentPayments.value = bookings.slice(0, 6)
    } finally {
      loading.value = false
    }
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
