<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loader2, CalendarX, Pencil } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingStats from '@/components/bookings/BookingStats.vue'
import BookingEditModal from '@/components/bookings/BookingEditModal.vue'

import type { Booking, BookingPeriod, BookingStatus } from '@/types'
import {
  listBookings,
  isBookingInPeriod,
  formatPrice,
  formatDayLabel,
  formatDateTime,
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

const editing = ref<Booking | null>(null)

async function refresh() {
  bookings.value = await listBookings()
}

function openEdit(booking: Booking) {
  editing.value = booking
}

async function onSaved() {
  editing.value = null
  await refresh()
}

onMounted(async () => {
  loading.value = true
  try {
    await refresh()
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
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Источник</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Добавлено в</p>
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
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Оплачено</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Остаток</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Сумма</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Статус</p>
                </th>
                <th class="px-5 py-3 text-right sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    <span class="sr-only">Действия</span>
                  </p>
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
                    {{ b.id }}
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

                <!-- Source -->
                <td class="px-5 py-4 sm:px-6">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                      {{ b.source }}
                    </span>
                    <span
                      v-if="b.fieldType"
                      class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                    >
                      {{ FIELD_TYPE_LABEL[b.fieldType] }}
                    </span>
                  </div>
                </td>

                <!-- Created at -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {{ formatDateTime(b.createdAt) }}
                  </span>
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

                <!-- Paid -->
                <td class="px-5 py-4 sm:px-6">
                  <button class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-success-200 rounded-full px-2 py-0.5 hover:bg-success-400 dark:bg-success-500/15 dark:hover:bg-success-500/20">
                    {{ formatPrice(Number(b.payment_current))}}
                  </button>
                </td>

                <!-- Rest -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-warning-50 rounded-full px-2 py-0.5 dark:bg-warning-500/15 dark:hover:bg-warning-500/20">
                    {{ formatPrice(b.total - Number(b.payment_current)) }}
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

                <!-- Actions -->
                <td class="px-5 py-4 text-right sm:px-6">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
                    :aria-label="`Редактировать бронь ${b.ref}`"
                    @click="openEdit(b)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <BookingEditModal
      v-if="editing"
      :booking="editing"
      @close="editing = null"
      @saved="onSaved"
    />
  </AdminLayout>
</template>
