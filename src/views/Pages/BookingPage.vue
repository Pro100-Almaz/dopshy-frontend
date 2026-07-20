<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loader2, CalendarX, Pencil, ChevronLeft, ChevronRight } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingStats from '@/components/bookings/BookingStats.vue'
import BookingCalendar from '@/components/bookings/BookingCalendar.vue'
import BookingEditModal from '@/components/bookings/BookingEditModal.vue'
import PaymentBreakdownModal from '@/components/bookings/PaymentBreakdownModal.vue'

import type { Booking, BookingPeriod, BookingStatus } from '@/types'
import {
  listBookings,
  listBookingsInRange,
  periodRange,
  formatPrice,
  formatDayLabel,
  formatDateTime,
  FIELD_TYPE_LABEL,
  BOOKING_STATUS_LABEL,
} from '@/services/booking'

const currentPageTitle = 'Бронирования'

const period = ref<BookingPeriod>('today')

// Полный список — питает карточки-сводки и таблицу за всё время (GET /bookings).
const allBookings = ref<Booking[]>([])
// Текущая страница таблицы (range-эндпоинт для today/week/month, GET /bookings для all_time).
const tableBookings = ref<Booking[]>([])

const statsLoading = ref(true)
const tableLoading = ref(true)

// Пагинация — для всех периодов. Бэкенд отдаёт по PAGE_SIZE броней на страницу;
// неполная страница = последняя.
const PAGE_SIZE = 20
const page = ref(1)
const atEnd = ref(false) // достигнута последняя страница (следующая вернула пусто)

const hasPrev = computed(() => page.value > 1)
// Следующая страница есть только когда текущая заполнена целиком (== PAGE_SIZE).
// `atEnd` страхует случай, когда всего броней ровно кратно PAGE_SIZE.
const hasNext = computed(() => tableBookings.value.length >= PAGE_SIZE && !atEnd.value)

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
const paymentDetail = ref<Booking | null>(null)

// Полный список для сводок и вкладки «За всё время».
async function loadAll() {
  statsLoading.value = true
  try {
    allBookings.value = await listBookings()
  } finally {
    statsLoading.value = false
  }
}

// Загружает страницу `target` для текущего периода: range-эндпоинт для today/week/month,
// полный список (GET /bookings) для all_time. Пустая страница за пределами первой —
// конец пагинации, на неё не переключаемся.
async function goToPage(target: number) {
  if (target < 1) return
  tableLoading.value = true
  try {
    const range = periodRange(period.value)
    const rows = range
      ? await listBookingsInRange(range.from, range.to, target)
      : await listBookings(target)
    if (rows.length === 0 && target > 1) {
      atEnd.value = true
      return
    }
    tableBookings.value = rows
    page.value = target
    atEnd.value = false
  } finally {
    tableLoading.value = false
  }
}

function changePeriod(next: BookingPeriod) {
  if (next === period.value) return
  period.value = next
  page.value = 1
  atEnd.value = false
  goToPage(1)
}

function prevPage() {
  if (hasPrev.value) goToPage(page.value - 1)
}
function nextPage() {
  if (hasNext.value) goToPage(page.value + 1)
}

function openEdit(booking: Booking) {
  editing.value = booking
}

// После сохранения обновляем сводки и текущее представление таблицы.
async function onSaved() {
  editing.value = null
  await loadAll()
  await goToPage(page.value)
}

onMounted(() => {
  loadAll()
  goToPage(1) // первая страница текущего периода (по умолчанию — сегодня)
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <!-- Переключатель: календарь / список -->
    <div class="mb-6 flex">
      <div
        class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <button
          type="button"
          class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
          :class="
            viewMode === 'calendar'
              ? 'bg-success-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          "
          :aria-pressed="viewMode === 'calendar'"
          @click="viewMode = 'calendar'"
        >
          Посмотреть через календарь
        </button>
        <button
          type="button"
          class="rounded-full px-4 py-2 text-sm font-medium transition-colors"
          :class="
            viewMode === 'list'
              ? 'bg-success-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          "
          :aria-pressed="viewMode === 'list'"
          @click="showList"
        >
          Показать списком
        </button>
      </div>
    </div>

    <!-- Календарь (грузит брони видимого периода самостоятельно) -->
    <BookingCalendar v-if="viewMode === 'calendar'" />

    <!-- Список -->
    <div v-else class="space-y-6">
      <!-- Day / week / month summary -->
      <BookingStats
        :model-value="period"
        :bookings="allBookings"
        @update:model-value="changePeriod"
      />

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
                  : period === 'month'
                    ? 'Брони в этом месяце'
                    : 'Все брони'
            }}
          </h3>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ tableBookings.length }}
          </span>
        </div>

        <!-- Loading -->
        <div v-if="tableLoading" class="flex min-h-[240px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!tableBookings.length"
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
                v-for="b in tableBookings"
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
                  <button
                    type="button"
                    class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-success-200 rounded-full px-2 py-0.5 hover:bg-success-400 dark:bg-success-500/15 dark:hover:bg-success-500/20"
                    :aria-label="`Показать оплаты брони ${b.ref}`"
                    @click="paymentDetail = b"
                  >
                    {{ formatPrice(b.paidTotal) }}
                  </button>
                </td>

                <!-- Rest -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-warning-50 rounded-full px-2 py-0.5 dark:bg-warning-500/15 dark:hover:bg-warning-500/20">
                    {{ formatPrice(b.total - b.paidTotal) }}
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

        <!-- Pagination (today / week / month) -->
        <div
          v-if="!tableLoading && (hasPrev || hasNext)"
          class="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Страница
            <span class="font-semibold text-gray-700 dark:text-gray-300">{{ page }}</span>
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
              :disabled="!hasPrev"
              @click="prevPage"
            >
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
              Назад
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
              :disabled="!hasNext"
              @click="nextPage"
            >
              Вперёд
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <BookingEditModal
      v-if="editing"
      :booking="editing"
      @close="editing = null"
      @saved="onSaved"
    />

    <PaymentBreakdownModal
      v-if="paymentDetail"
      :booking="paymentDetail"
      @close="paymentDetail = null"
    />
  </AdminLayout>
</template>
