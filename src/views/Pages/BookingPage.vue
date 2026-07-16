<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loader2, CalendarX } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingStats from '@/components/bookings/BookingStats.vue'

import type { Booking, BookingPeriod, BookingStatus } from '@/types'
import {
  listBookings,
  isBookingInPeriod,
  formatPrice,
  formatDayLabel,
  FIELD_TYPE_LABEL,
  BOOKING_STATUS_LABEL,
} from '@/services/booking'

const currentPageTitle = 'Бронирования'

const bookings = ref<Booking[]>([])
const loading = ref(true)
const error = ref('')
const period = ref<BookingPeriod>('today')

const filteredBookings = computed(() =>
  bookings.value.filter((b) => isBookingInPeriod(b, period.value)),
)

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

const STATUS_CLASS: Record<BookingStatus, string> = {
  confirmed: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  pending: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
  cancelled: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500',
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    bookings.value = await listBookings()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить бронирования'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="space-y-6">
      <!-- Day / week / month summary -->
      <BookingStats v-model="period" :bookings="bookings" />

      <!-- Bookings table -->
      <div
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div
          class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6"
        >
          <h3 class="font-medium text-gray-800 dark:text-white/90">
            {{
              period === 'today'
                ? 'Брони на сегодня'
                : period === 'week'
                  ? 'Брони на этой неделе'
                  : 'Брони в этом месяце'
            }}
          </h3>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ filteredBookings.length }}
          </span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <CalendarX class="h-7 w-7 text-error-500" aria-hidden="true" />
          <p class="text-error-600 dark:text-error-400">{{ error }}</p>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!filteredBookings.length"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <CalendarX class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">
            За выбранный период броней нет.
          </p>
        </div>

        <!-- Rows -->
        <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Бронь</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Клиент</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Поле</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Дата и время
                  </p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Сумма</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Статус</p>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="b in filteredBookings"
                :key="b.id"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <!-- Ref -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {{ b.ref }}
                  </span>
                </td>

                <!-- Customer -->
                <td class="px-5 py-4 sm:px-6">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                    >
                      {{ initials(b.customerName) }}
                    </div>
                    <div>
                      <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {{ b.customerName }}
                      </span>
                      <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                        {{ b.customerPhone }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Field -->
                <td class="px-5 py-4 sm:px-6">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                      {{ b.fieldName }}
                    </span>
                    <span
                      v-if="b.fieldType"
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                    >
                      {{ FIELD_TYPE_LABEL[b.fieldType] }}
                    </span>
                  </div>
                </td>

                <!-- Date & time -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="block text-gray-700 text-theme-sm dark:text-gray-300">
                    {{ formatDayLabel(b.date).day }} {{ formatDayLabel(b.date).month }},
                    {{ formatDayLabel(b.date).weekday }}
                  </span>
                  <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {{ b.start }}–{{ b.end }}
                  </span>
                </td>

                <!-- Total -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {{ formatPrice(b.total) }}
                  </span>
                </td>

                <!-- Status -->
                <td class="px-5 py-4 sm:px-6">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                    :class="STATUS_CLASS[b.status]"
                  >
                    {{ BOOKING_STATUS_LABEL[b.status] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
