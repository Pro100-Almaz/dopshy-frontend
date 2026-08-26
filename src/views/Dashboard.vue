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

      <div>
        <!-- Loading skeleton -->
        <div v-if="isLoading">
          <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div
              v-for="n in 4"
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
            <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                v-if="canArena"
                :icon="CalendarDays"
                label="Бронирования сегодня"
                :value="dashStore.summary.todayBookings"
              />
              <KpiCard
                v-if="canArena"
                :icon="Percent"
                label="Загруженность"
                :value="dashStore.summary.occupancyPercent"
                suffix="%"
              />
              <KpiCard
                v-if="canArena"
                :icon="Wallet"
                label="Неоплаченные"
                :value="dashStore.summary.unpaidBookings"
                :trend="
                  dashStore.summary.unpaidBookings
                    ? { value: 'к оплате', direction: 'alert' }
                    : undefined
                "
              />
              <KpiCard
                v-if="canAcademy"
                :icon="GraduationCap"
                label="Ученики с абонементом"
                :value="dashStore.summary.activeStudents"
              />
            </div>

            <!-- Row: Schedule + Quick Actions -->
            <div v-if="canArena" class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="lg:col-span-2">
                <TodaySchedule :bookings="dashStore.todayBookings" />
              </div>
              <QuickActions />
            </div>

            <!-- Payments -->
            <RecentPayments v-if="canArena" :bookings="dashStore.recentPayments" />
          </div>
        </Transition>
      </div>

      <!-- Академия: реальные числа по обоим направлениям -->
      <section v-if="canAcademy" class="mt-6">
        <div class="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Академия</h2>
            <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              Занятия, пробные и абонементы по направлениям.
            </p>
          </div>
        </div>

        <div v-if="digestLoading && !digests.length" class="grid gap-4 sm:grid-cols-2">
          <div
            v-for="n in 2"
            :key="n"
            class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="skeleton h-4 w-32 rounded"></div>
            <div class="skeleton mt-4 h-8 w-full rounded"></div>
          </div>
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2">
          <router-link
            v-for="digest in digests"
            :key="digest.sport"
            :to="`/${digest.sport}`"
            class="focus-ring rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-pitch-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-pitch-500/40"
          >
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ digest.title }}</h3>
              <ArrowRight class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            </div>

            <p v-if="digest.failed" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Данные направления сейчас недоступны.
            </p>

            <dl v-else class="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <dt class="text-xs text-gray-600 dark:text-gray-400">Занятий сегодня</dt>
                <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {{ digest.lessonsToday }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-gray-600 dark:text-gray-400">Пробных сегодня</dt>
                <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {{ digest.trialsToday }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-gray-600 dark:text-gray-400">Ждут отметки</dt>
                <dd
                  class="text-xl font-bold tabular-nums"
                  :class="
                    digest.unmarked
                      ? 'text-warning-700 dark:text-warning-400'
                      : 'text-gray-900 dark:text-white'
                  "
                >
                  {{ digest.unmarked }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-gray-600 dark:text-gray-400">С абонементом</dt>
                <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {{ digest.subscribed }}
                </dd>
              </div>
            </dl>
          </router-link>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { ArrowRight, CalendarDays, GraduationCap, Percent, Wallet } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import TodaySchedule from '@/components/dashboard/TodaySchedule.vue'
import RecentPayments from '@/components/dashboard/RecentPayments.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useAcademyDigest } from '@/composables/useAcademyDigest'
import { hasPermission, permittedAcademySports } from '@/services/rbac'

defineOptions({
  name: 'DashboardPage',
})

const authStore = useAuthStore()
const dashStore = useDashboardStore()
const { digests, loading: digestLoading, load: loadDigests } = useAcademyDigest()

const isLoading = computed(() => dashStore.loading && !dashStore.summary)
const canArena = computed(() => hasPermission(authStore.role, 'arena'))
const canAcademy = computed(() => hasPermission(authStore.role, 'academy'))


// ── Живое обновление ────────────────────────────────
// Реального времени пока нет — опрашиваем бэкенд каждые 5 секунд. Обновление
// тихое (без скелетона) и применяется только при изменении данных, поэтому
// для пользователя незаметно. Поллинг живёт только пока открыта эта страница.
const POLL_MS = 5000
let pollId: ReturnType<typeof setInterval> | null = null

function poll() {
  // Не грузим впустую, когда вкладка в фоне.
  if (document.hidden) return
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
  // Академия — вне поллинга: список пробных бэкенд собирает обходом групп.
  if (canAcademy.value) loadDigests(permittedAcademySports(authStore.role))
  pollId = setInterval(poll, POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  if (pollId) clearInterval(pollId)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
