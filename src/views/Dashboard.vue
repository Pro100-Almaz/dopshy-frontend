<template>
  <AdminLayout>
    <div>
      <!-- Header section -->
      <div class="mb-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-balance text-gray-900 dark:text-white">
              Панель управления
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              С возвращением, {{ authStore.user?.name?.split(' ')[0] || 'Админ' }}. Вот что происходит на вашей арене.
            </p>
          </div>
        </div>
      </div>

      <!-- Football dashboard -->
      <div v-if="dashStore.activeTab === 'football'">
        <!-- Loading skeleton -->
        <div v-if="isLoading">
          <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div
              v-for="n in 5"
              :key="n"
              class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div class="skeleton h-11 w-11 rounded-xl"></div>
              <div class="skeleton mt-4 h-7 w-16 rounded-md"></div>
              <div class="skeleton mt-2 h-3.5 w-24 rounded-md"></div>
            </div>
          </div>
          <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div
              class="h-80 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:col-span-2"
            >
              <div class="skeleton m-6 h-5 w-48 rounded-md"></div>
            </div>
            <div class="h-80 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div class="skeleton m-6 h-5 w-36 rounded-md"></div>
            </div>
          </div>
        </div>

        <!-- Loaded content -->
        <Transition name="fade" mode="out-in">
          <div v-if="!isLoading && dashStore.summary" key="content">
            <!-- KPI cards -->
            <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard
                :icon="CalendarDays"
                label="Бронирования сегодня"
                :value="dashStore.summary.todayBookings"
                :trend="{ value: '+3', direction: 'up' }"
              />
              <KpiCard
                :icon="Percent"
                label="Загруженность"
                :value="dashStore.summary.occupancyPercent"
                suffix="%"
                :trend="{ value: '+5%', direction: 'up' }"
              />
              <KpiCard
                :icon="Wallet"
                label="Неоплаченные"
                :value="dashStore.summary.unpaidBookings"
                :trend="{ value: 'к оплате', direction: 'alert' }"
              />
              <KpiCard
                :icon="GraduationCap"
                label="Активные ученики"
                :value="dashStore.summary.activeStudents"
                :trend="{ value: '+2', direction: 'up' }"
              />
              <KpiCard
                :icon="HardHat"
                label="На смене"
                :value="dashStore.summary.onShiftWorkers"
              />
            </div>

            <!-- Row: Schedule + Quick Actions -->
            <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="lg:col-span-2">
                <TodaySchedule :bookings="dashStore.todayBookings" />
              </div>
              <QuickActions />
            </div>

            <!-- Payments -->
            <RecentPayments :bookings="dashStore.recentPayments" />
          </div>
        </Transition>
      </div>

      <!-- Boxing placeholder -->
      <div v-else>
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center dark:border-gray-700 dark:bg-gray-900"
        >
          <div
            class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
          >
            <Swords :size="30" :stroke-width="1.75" />
          </div>
          <h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">Модуль бокса</h3>
          <p class="max-w-sm text-sm leading-relaxed text-pretty text-gray-500 dark:text-gray-400">
            Модуль управления боксом скоро будет доступен. Здесь вы сможете
            управлять бойцами, расписаниями тренировок и бронированием ринга.
          </p>
          <span
            class="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
          >
            <Clock :size="13" :stroke-width="2" />
            Скоро
          </span>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, markRaw } from 'vue'
import {
  CalendarDays,
  Percent,
  Wallet,
  GraduationCap,
  HardHat,
  Swords,
  Clock,
  CircleDot,
} from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import BusinessSwitcher from '@/components/dashboard/BusinessSwitcher.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TodaySchedule from '@/components/dashboard/TodaySchedule.vue'
import RecentPayments from '@/components/dashboard/RecentPayments.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const authStore = useAuthStore()
const dashStore = useDashboardStore()

const isLoading = computed(() => dashStore.loading && !dashStore.summary)


// ── Живое обновление ────────────────────────────────
// Реального времени пока нет — опрашиваем бэкенд каждые 5 секунд. Обновление
// тихое (без скелетона) и применяется только при изменении данных, поэтому
// для пользователя незаметно. Поллинг живёт только пока открыта эта страница.
const POLL_MS = 5000
let pollId: ReturnType<typeof setInterval> | null = null

function poll() {
  // Не грузим впустую, когда вкладка в фоне (или открыт заглушка-модуль бокса).
  if (document.hidden || dashStore.activeTab !== 'football') return
  dashStore.fetchDashboard({ silent: true }).catch(() => {
    /* временный сбой сети — оставляем последние данные, следующий тик повторит */
  })
}

function onVisibility() {
  // Вернулись на вкладку — сразу обновляемся, чтобы не показывать устаревшее.
  if (!document.hidden) poll()
}

onMounted(() => {
  dashStore.fetchDashboard()
  pollId = setInterval(poll, POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  if (pollId) clearInterval(pollId)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
