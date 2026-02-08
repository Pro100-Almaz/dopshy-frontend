import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardSummary, ScheduleSlot, Payment, Lesson, Worker } from '@/types'
import { dashboardService } from '@/services/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const activeTab = ref<'football' | 'boxing'>('football')
  const summary = ref<DashboardSummary | null>(null)
  const todaySchedule = ref<ScheduleSlot[]>([])
  const recentPayments = ref<Payment[]>([])
  const upcomingLessons = ref<Lesson[]>([])
  const workersOnShift = ref<Worker[]>([])
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      const [s, sched, pay, les, work] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTodayBookings(),
        dashboardService.getRecentPayments(),
        dashboardService.getUpcomingLessons(),
        dashboardService.getWorkersOnShift(),
      ])
      summary.value = s
      todaySchedule.value = sched
      recentPayments.value = pay
      upcomingLessons.value = les
      workersOnShift.value = work
    } finally {
      loading.value = false
    }
  }

  return {
    activeTab,
    summary,
    todaySchedule,
    recentPayments,
    upcomingLessons,
    workersOnShift,
    loading,
    fetchDashboard,
  }
})
