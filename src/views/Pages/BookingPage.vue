<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { Loader2, CalendarX, Pencil, ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingStats from '@/components/bookings/BookingStats.vue'
import BookingCalendar from '@/components/bookings/BookingCalendar.vue'
import BookingEditModal from '@/components/bookings/BookingEditModal.vue'
import PaymentBreakdownModal from '@/components/bookings/PaymentBreakdownModal.vue'

import type { Booking, BookingPeriod } from '@/types'
import {
  listBookings,
  listBookingsInRange,
  periodRange,
  isBookingInPeriod,
  formatPrice,
  formatDayLabel,
  formatDateTime,
  FIELD_TYPE_LABEL,
  bookingStateLabel,
  bookingStateClass,
} from '@/services/booking'

const currentPageTitle = 'Бронирования'

const period = ref<BookingPeriod>('today')

// Календарь / список — переключатель наверху страницы.
type ViewMode = 'calendar' | 'list'
const viewMode = ref<ViewMode>('calendar')

// Полный список — питает карточки-сводки и таблицу за всё время (GET /bookings).
const allBookings = ref<Booking[]>([])
// Текущая страница таблицы (range-эндпоинт для today/week/month, GET /bookings для all_time).
const tableBookings = ref<Booking[]>([])

const statsLoading = ref(true)
const tableLoading = ref(true)

// Поиск по id / имени клиента / телефону. Обрабатывается бэкендом — применяется
// ко всем периодам и сбрасывает пагинацию на первую страницу.
const search = ref('')

// Пагинация — для всех периодов. Бэкенд отдаёт по PAGE_SIZE броней на страницу;
// неполная страница = последняя.
const PAGE_SIZE = 20
const page = ref(1)
const atEnd = ref(false) // достигнута последняя страница (следующая вернула пусто)

const hasPrev = computed(() => page.value > 1)
// Следующая страница есть только когда текущая заполнена целиком (== PAGE_SIZE).
// `atEnd` страхует случай, когда всего броней ровно кратно PAGE_SIZE.
const hasNext = computed(() => tableBookings.value.length >= PAGE_SIZE && !atEnd.value)

// Совпадение брони с поисковым запросом (id / имя / телефон) — тот же набор полей,
// что ищет бэкенд. Нужен, чтобы счётчик в шапке оставался корректным при поиске.
function matchesSearch(b: Booking, q: string): boolean {
  if (!q) return true
  const term = q.toLowerCase()
  const digits = q.replace(/\D/g, '')
  const idHit = b.id.toLowerCase().includes(term)
  const nameHit = b.customerName.toLowerCase().includes(term)
  const phoneHit = digits.length > 0 && b.customerPhone.replace(/\D/g, '').includes(digits)
  return idHit || nameHit || phoneHit
}

// Общее число броней для текущего фильтра (не только текущей страницы). Считаем по
// полному списку `allBookings`, отфильтрованному по периоду и — при наличии — поиску.
const periodTotal = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allBookings.value.filter((b) => isBookingInPeriod(b, period.value) && matchesSearch(b, q))
    .length
})

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
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

// Монотонный токен запроса: поиск (с дебаунсом) и клики пагинации оба зовут goToPage,
// поэтому медленный ранний ответ мог перезаписать свежий. Применяем только последний.
let reqSeq = 0

// Загружает страницу `target` для текущего периода: range-эндпоинт для today/week/month,
// полный список (GET /bookings) для all_time. Пустая страница за пределами первой —
// конец пагинации, на неё не переключаемся.
async function goToPage(target: number) {
  if (target < 1) return
  const myReq = ++reqSeq
  tableLoading.value = true
  try {
    const range = periodRange(period.value)
    const q = search.value.trim() || undefined

    const rows = range
      ? await listBookingsInRange(range.from, range.to, target, q)
      : await listBookings(target, q)
    // Устарел — пришёл более новый запрос, его результат уже актуальнее.
    if (myReq !== reqSeq) return
    if (rows.length === 0 && target > 1) {
      atEnd.value = true
      return
    }
    tableBookings.value = rows
    page.value = target
    atEnd.value = false
  } finally {
    // Гасим индикатор только для актуального запроса, иначе мигание на гонках.
    if (myReq === reqSeq) tableLoading.value = false
  }
}

function changePeriod(next: BookingPeriod) {
  if (next === period.value) return
  period.value = next
  page.value = 1
  atEnd.value = false
  goToPage(1)
}

// Поиск с дебаунсом — каждый ввод сбрасывает на первую страницу и перезапрашивает.
let searchTimer: number | undefined
watch(search, () => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
    atEnd.value = false
    goToPage(1)
  }, 350)
})

onUnmounted(() => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
})

function prevPage() {
  if (hasPrev.value) goToPage(page.value - 1)
}
function nextPage() {
  if (hasNext.value) goToPage(page.value + 1)
}

function showList() {
  viewMode.value = 'list'
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

// ── Живое обновление таблицы ────────────────────────
// Реального времени пока нет — тихо опрашиваем бэкенд каждые 5 секунд. Обновляем
// сводки и текущую страницу таблицы только при реальном изменении данных, не трогая
// индикаторы загрузки — поэтому для пользователя незаметно. Живёт, пока открыта страница.
const POLL_MS = 5000
let pollId: ReturnType<typeof setInterval> | null = null
let silentInFlight = false

// Дешёвое структурное сравнение — списки детерминированы (отсортированы бэкендом/маппером).
function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

async function pollBookings() {
  if (document.hidden) return
  if (viewMode.value !== 'list') return // календарь грузит данные сам
  // Не двигаем строки под пользователем во время редактирования/просмотра оплат
  // и не мешаем первичной/навигационной загрузке.
  if (editing.value || paymentDetail.value) return
  if (statsLoading.value || tableLoading.value) return
  if (silentInFlight) return

  silentInFlight = true
  try {
    // Сводки (полный список).
    const nextAll = await listBookings()
    if (changed(allBookings.value, nextAll)) allBookings.value = nextAll

    // Текущая страница таблицы — тем же запросом, что и goToPage, включая поиск.
    const range = periodRange(period.value)
    const q = search.value.trim() || undefined
    const rows = range
      ? await listBookingsInRange(range.from, range.to, page.value, q)
      : await listBookings(page.value, q)
    // Пустую страницу за пределами первой игнорируем, чтобы не сбить пагинацию.
    if (!(rows.length === 0 && page.value > 1) && changed(tableBookings.value, rows)) {
      tableBookings.value = rows
    }
  } catch {
    /* временный сбой сети — оставляем текущие данные, следующий тик повторит */
  } finally {
    silentInFlight = false
  }
}

function onVisibility() {
  // Вернулись на вкладку — сразу обновляемся, чтобы не показывать устаревшее.
  if (!document.hidden) pollBookings()
}

onMounted(() => {
  loadAll()
  goToPage(1) // первая страница текущего периода (по умолчанию — сегодня)

  pollId = setInterval(pollBookings, POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  if (pollId) clearInterval(pollId)
  document.removeEventListener('visibilitychange', onVisibility)
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
          class="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div class="flex items-center gap-3">
            <h3 class="font-medium text-gray-800 dark:text-white/90">
              {{
                period === 'today'
                  ? 'Брони на сегодня'
                  : period === 'week'
                    ? 'Брони на этой неделе'
                    : period === 'month'
                      ? 'Брони в этом месяце'
                      : 'Брони'
              }}
            </h3>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ periodTotal }}
            </span>
          </div>
          <div class="relative w-full sm:w-72">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="search"
              type="search"
              placeholder="Поиск по номеру, имени или телефону"
              class="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
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
            {{
              search.trim() ? 'По запросу ничего не найдено.' : 'За выбранный период броней нет.'
            }}
          </p>
        </div>

        <!-- Rows (table — large screens) -->
        <div v-else class="hidden max-w-full overflow-x-auto custom-scrollbar lg:block">
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
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Добавлено в
                  </p>
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
                      <span
                        class="block font-medium text-gray-800 text-theme-sm dark:text-white/90"
                      >
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
                  <span
                    class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-warning-50 rounded-full px-2 py-0.5 dark:bg-warning-500/15 dark:hover:bg-warning-500/20"
                  >
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
                    :class="bookingStateClass(b.state)"
                  >
                    {{ bookingStateLabel(b.state) }}
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

        <!-- Rows (cards — small screens) -->
        <ul
          v-if="!tableLoading && tableBookings.length"
          class="divide-y divide-gray-200 dark:divide-gray-700 lg:hidden"
        >
          <li v-for="b in tableBookings" :key="b.id" class="px-5 py-4">
            <!-- Header: ref + status + edit -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ b.id }}
                </span>
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                  :class="bookingStateClass(b.state)"
                >
                  {{ bookingStateLabel(b.state) }}
                </span>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
                :aria-label="`Редактировать бронь ${b.ref}`"
                @click="openEdit(b)"
              >
                <Pencil class="h-4 w-4" />
              </button>
            </div>

            <!-- Customer -->
            <div class="mt-3 flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
              >
                {{ initials(b.customerName) }}
              </div>
              <div class="min-w-0">
                <span
                  class="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90"
                >
                  {{ b.customerName }}
                </span>
                <span class="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
                  {{ b.customerPhone }}
                </span>
              </div>
            </div>

            <!-- Field / source / date-time -->
            <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-theme-sm">
              <div>
                <dt class="text-gray-500 text-theme-xs dark:text-gray-400">Поле</dt>
                <dd class="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span class="text-gray-700 dark:text-gray-300">{{ b.fieldName }}</span>
                  <span
                    v-if="b.fieldType"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                  >
                    {{ FIELD_TYPE_LABEL[b.fieldType] }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-gray-500 text-theme-xs dark:text-gray-400">Источник</dt>
                <dd class="mt-0.5 text-gray-700 dark:text-gray-300">{{ b.source }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-gray-500 text-theme-xs dark:text-gray-400">Дата и время</dt>
                <dd class="mt-0.5 text-gray-700 dark:text-gray-300">
                  {{ formatDayLabel(b.date).day }} {{ formatDayLabel(b.date).month }},
                  {{ formatDayLabel(b.date).weekday }} · {{ b.start }}–{{ b.end }}
                </dd>
              </div>
            </dl>

            <!-- Payments -->
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-success-200 rounded-full px-2 py-0.5 hover:bg-success-400 dark:bg-success-500/15 dark:hover:bg-success-500/20"
                :aria-label="`Показать оплаты брони ${b.ref}`"
                @click="paymentDetail = b"
              >
                Оплачено: {{ formatPrice(b.paidTotal) }}
              </button>
              <span
                class="font-medium text-gray-800 text-theme-sm dark:text-white/90 bg-warning-50 rounded-full px-2 py-0.5 dark:bg-warning-500/15"
              >
                Остаток: {{ formatPrice(b.total - b.paidTotal) }}
              </span>
              <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                Сумма: {{ formatPrice(b.total) }}
              </span>
            </div>
          </li>
        </ul>

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

    <BookingEditModal v-if="editing" :booking="editing" @close="editing = null" @saved="onSaved" />

    <PaymentBreakdownModal
      v-if="paymentDetail"
      :booking="paymentDetail"
      @close="paymentDetail = null"
    />
  </AdminLayout>
</template>
