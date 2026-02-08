<template>
  <AdminLayout>
    <div>
      <!-- Header section -->
      <div class="mb-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Панель управления
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              С возвращением, {{ authStore.user?.name?.split(' ')[0] || 'Админ' }}. Вот что происходит на вашей арене.
            </p>
          </div>
          <BusinessSwitcher v-model="dashStore.activeTab" :tabs="businessTabs" />
        </div>
      </div>

      <!-- Football dashboard -->
      <div v-if="dashStore.activeTab === 'football'">
        <!-- KPI cards -->
        <div
          v-if="dashStore.summary"
          class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          <KpiCard
            :icon="CalendarDays"
            label="Бронирования сегодня"
            :value="dashStore.summary.todayBookings"
            icon-bg="bg-[#10B981]/10 text-[#10B981]"
            badge="+3"
            :badge-up="true"
          />
          <KpiCard
            :icon="Percent"
            label="Загруженность"
            :value="dashStore.summary.occupancyPercent"
            suffix="%"
            icon-bg="bg-blue-50 text-blue-500 dark:bg-blue-500/10"
            badge="+5%"
            :badge-up="true"
          />
          <KpiCard
            :icon="Wallet"
            label="Неоплаченные"
            :value="dashStore.summary.unpaidPayments"
            suffix=" ₸"
            icon-bg="bg-red-50 text-red-500 dark:bg-red-500/10"
            badge="6 просроч."
            :badge-up="false"
          />
          <KpiCard
            :icon="GraduationCap"
            label="Активные ученики"
            :value="dashStore.summary.activeStudents"
            icon-bg="bg-purple-50 text-purple-500 dark:bg-purple-500/10"
            badge="+2"
            :badge-up="true"
          />
          <KpiCard
            :icon="HardHat"
            label="На смене"
            :value="dashStore.summary.onShiftWorkers"
            icon-bg="bg-amber-50 text-amber-500 dark:bg-amber-500/10"
          />
        </div>

        <!-- Row: Schedule + Quick Actions -->
        <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <TodaySchedule :slots="dashStore.todaySchedule" />
          </div>
          <QuickActions />
        </div>

        <!-- Row: Payments + Lessons -->
        <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentPayments :payments="dashStore.recentPayments" />
          <UpcomingLessons :lessons="dashStore.upcomingLessons" />
        </div>

        <!-- Workers -->
        <WorkersOnShift :workers="dashStore.workersOnShift" />
      </div>

      <!-- Boxing placeholder -->
      <div v-else>
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-20 text-center dark:border-gray-700 dark:bg-gray-800/50"
        >
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10B981]/10">
            <Swords :size="32" class="text-[#10B981]" />
          </div>
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Модуль бокса
          </h3>
          <p class="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Модуль управления боксом скоро будет доступен. Здесь вы сможете
            управлять бойцами, расписаниями тренировок и бронированием ринга.
          </p>
          <span
            class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-3 py-1 text-xs font-semibold text-[#10B981]"
          >
            <Clock :size="12" />
            Скоро
          </span>
        </div>
      </div>

      <!-- Loading overlay -->
      <div
        v-if="dashStore.loading"
        class="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-gray-900/50"
      >
        <Loader2 :size="32" class="animate-spin text-[#10B981]" />
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, markRaw } from 'vue'
import {
  CalendarDays,
  Percent,
  Wallet,
  GraduationCap,
  HardHat,
  Swords,
  Clock,
  Loader2,
  CircleDot,
} from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import BusinessSwitcher from '@/components/dashboard/BusinessSwitcher.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TodaySchedule from '@/components/dashboard/TodaySchedule.vue'
import RecentPayments from '@/components/dashboard/RecentPayments.vue'
import UpcomingLessons from '@/components/dashboard/UpcomingLessons.vue'
import WorkersOnShift from '@/components/dashboard/WorkersOnShift.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const authStore = useAuthStore()
const dashStore = useDashboardStore()

const businessTabs = [
  { value: 'football', label: 'Футбол', icon: markRaw(CircleDot) },
  { value: 'boxing', label: 'Бокс', icon: markRaw(Swords) },
]

onMounted(() => {
  dashStore.fetchDashboard()
})
</script>
