<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { Loader2, CalendarX, Pencil, ChevronLeft, ChevronRight, Search, X } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingStats from '@/components/bookings/BookingStats.vue'
import BookingCalendar from '@/components/bookings/BookingCalendar.vue'
import BookingEditModal from '@/components/bookings/BookingEditModal.vue'
import Modal from '@/components/ui/Modal.vue'

import type { Booking, BookingPeriod, BookingState } from '@/types'
import {
  listBookings,
  isBookingInPeriod,
  formatPrice,
  formatDayLabel,
  FIELD_TYPE_LABEL,
  BOOKING_STATE_LABEL,
  bookingStateLabel,
  bookingStateClass,
  updateBooking,
} from '@/services/booking'

const currentPageTitle = 'Бронирования'

const period = ref<BookingPeriod>('today')

// Календарь / список — переключатель наверху страницы.
type ViewMode = 'calendar' | 'list'
const viewMode = ref<ViewMode>('calendar')

// Полный список — питает карточки-сводки и таблицу за всё время (GET /bookings).
const allBookings = ref<Booking[]>([])

const statsLoading = ref(true)
const tableLoading = ref(true)

// Поиск по id / имени клиента / телефону применяется к загруженному списку
// и сбрасывает пагинацию на первую страницу.
const search = ref('')
const fieldFilter = ref('')

// Пагинация списка работает поверх уже загруженного набора, чтобы фильтр поля
// не показывал пустую страницу из-за серверной нарезки без field-параметра.
const PAGE_SIZE = 20
const MAX_PAYMENT = 10_000_000
const page = ref(1)

const hasPrev = computed(() => page.value > 1)

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

function bookingFieldKey(booking: Booking): string {
  return booking.fieldId || booking.fieldName
}

const fieldOptions = computed(() => {
  const fields = new Map<string, { id: string; name: string; type?: Booking['fieldType'] }>()
  for (const booking of allBookings.value) {
    if (!isBookingInPeriod(booking, period.value)) continue
    const id = bookingFieldKey(booking)
    if (!fields.has(id)) fields.set(id, { id, name: booking.fieldName, type: booking.fieldType })
  }
  return [...fields.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const filteredBookings = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allBookings.value.filter((booking) => {
    if (!isBookingInPeriod(booking, period.value) || !matchesSearch(booking, q)) return false
    return Boolean(fieldFilter.value) && bookingFieldKey(booking) === fieldFilter.value
  })
})

const periodTotal = computed(() => filteredBookings.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredBookings.value.length / PAGE_SIZE)))
const hasNext = computed(() => page.value < totalPages.value)
const pageBookings = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredBookings.value.slice(start, start + PAGE_SIZE)
})

interface BookingFieldGroup {
  key: string
  fieldName: string
  fieldType?: Booking['fieldType']
  bookings: Booking[]
}

interface BookingDateGroup {
  date: string
  fields: BookingFieldGroup[]
}

const groupedBookings = computed<BookingDateGroup[]>(() => {
  const byDate = new Map<string, Map<string, BookingFieldGroup>>()
  const sorted = [...pageBookings.value].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date)
    if (dateDiff !== 0) return dateDiff
    const fieldDiff = a.fieldName.localeCompare(b.fieldName, 'ru')
    if (fieldDiff !== 0) return fieldDiff
    return a.start.localeCompare(b.start)
  })

  for (const booking of sorted) {
    let dateGroup = byDate.get(booking.date)
    if (!dateGroup) {
      dateGroup = new Map()
      byDate.set(booking.date, dateGroup)
    }

    const fieldKey = bookingFieldKey(booking)
    let fieldGroup = dateGroup.get(fieldKey)
    if (!fieldGroup) {
      fieldGroup = {
        key: fieldKey,
        fieldName: booking.fieldName,
        fieldType: booking.fieldType,
        bookings: [],
      }
      dateGroup.set(fieldKey, fieldGroup)
    }
    fieldGroup.bookings.push(booking)
  }

  return [...byDate.entries()].map(([date, fields]) => ({
    date,
    fields: [...fields.values()],
  }))
})

function fullDateLabel(iso: string): string {
  const d = formatDayLabel(iso)
  return `${d.day} ${d.month}, ${d.weekday}`
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

const editing = ref<Booking | null>(null)
const confirmInlineEdits = ref(false)
const savingInlineEdits = ref(false)
const inlineEditError = ref('')

const STATUS_OPTIONS: BookingState[] = (Object.keys(BOOKING_STATE_LABEL) as BookingState[]).filter(
  (s) => s !== 'draft',
)

interface InlineEditableValues {
  paidCash: number
  paidKaspiQr: number
  paidAvans: number
  state: string
}

interface InlineBookingEdit {
  id: string
  ref: string
  customerName: string
  fieldKey: string
  fieldName: string
  original: InlineEditableValues
  current: InlineEditableValues
}

type InlineEditableKey = keyof InlineEditableValues

const inlineEdits = ref<Record<string, InlineBookingEdit>>({})

const INLINE_FIELD_LABEL: Record<InlineEditableKey, string> = {
  paidCash: 'Наличные',
  paidKaspiQr: 'QR',
  paidAvans: 'Предоплата',
  state: 'Статус',
}

function inlineBase(booking: Booking): InlineEditableValues {
  return {
    paidCash: booking.paidCash,
    paidKaspiQr: booking.paidKaspiQr,
    paidAvans: booking.paidAvans,
    state: booking.state,
  }
}

function inlineValue(booking: Booking, key: InlineEditableKey): string | number {
  return inlineEdits.value[booking.id]?.current[key] ?? inlineBase(booking)[key]
}

function inlineStatusClass(booking: Booking): string {
  return bookingStateClass(String(inlineValue(booking, 'state')))
}

function normalizePayment(raw: string | number): number {
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

function valuesEqual(a: InlineEditableValues, b: InlineEditableValues): boolean {
  return (
    a.paidCash === b.paidCash &&
    a.paidKaspiQr === b.paidKaspiQr &&
    a.paidAvans === b.paidAvans &&
    a.state === b.state
  )
}

function setInlineValue(booking: Booking, key: InlineEditableKey, raw: string | number) {
  inlineEditError.value = ''
  const existing = inlineEdits.value[booking.id]
  const original = existing?.original ?? inlineBase(booking)
  const current = { ...(existing?.current ?? original) }

  if (key === 'state') current.state = String(raw)
  else current[key] = normalizePayment(raw)

  const next = { ...inlineEdits.value }
  if (valuesEqual(original, current)) {
    delete next[booking.id]
  } else {
    next[booking.id] = {
      id: booking.id,
      ref: booking.ref,
      customerName: booking.customerName,
      fieldKey: bookingFieldKey(booking),
      fieldName: booking.fieldName,
      original,
      current,
    }
  }
  inlineEdits.value = next
}

const pendingInlineEdits = computed(() => Object.values(inlineEdits.value))

const inlineEditChanges = computed(() =>
  pendingInlineEdits.value.map((edit) => ({
    edit,
    changes: (Object.keys(INLINE_FIELD_LABEL) as InlineEditableKey[])
      .filter((key) => edit.original[key] !== edit.current[key])
      .map((key) => ({
        key,
        label: INLINE_FIELD_LABEL[key],
        from:
          key === 'state'
            ? bookingStateLabel(String(edit.original[key]))
            : formatPrice(Number(edit.original[key])),
        to:
          key === 'state'
            ? bookingStateLabel(String(edit.current[key]))
            : formatPrice(Number(edit.current[key])),
      })),
  })),
)

const inlineValidationError = computed(() => {
  for (const edit of pendingInlineEdits.value) {
    const payments = [
      { value: edit.current.paidCash, label: 'Наличные' },
      { value: edit.current.paidKaspiQr, label: 'QR' },
      { value: edit.current.paidAvans, label: 'Предоплата' },
    ]
    const over = payments.find((payment) => payment.value > MAX_PAYMENT)
    if (over) {
      return `${edit.ref}: сумма «${over.label}» не может превышать ${MAX_PAYMENT.toLocaleString('ru-RU')} ₸`
    }
  }
  return ''
})

function openInlineConfirm() {
  inlineEditError.value = inlineValidationError.value
  if (!inlineEditError.value) confirmInlineEdits.value = true
}

function discardInlineEdits() {
  inlineEdits.value = {}
  inlineEditError.value = ''
  confirmInlineEdits.value = false
}

async function saveInlineEdits() {
  inlineEditError.value = inlineValidationError.value
  if (inlineEditError.value) return

  savingInlineEdits.value = true
  try {
    await Promise.all(
      pendingInlineEdits.value.map((edit) =>
        updateBooking(edit.id, {
          paid_cash: edit.current.paidCash,
          paid_kaspi_qr: edit.current.paidKaspiQr,
          paid_avans: edit.current.paidAvans,
          status: edit.current.state as BookingState,
        }),
      ),
    )
    discardInlineEdits()
    await loadAll()
  } catch (e) {
    inlineEditError.value = e instanceof Error ? e.message : 'Не удалось сохранить изменения'
  } finally {
    savingInlineEdits.value = false
  }
}

// Полный список для сводок и вкладки «За всё время».
async function loadAll() {
  statsLoading.value = true
  tableLoading.value = true
  try {
    allBookings.value = await listBookings()
  } finally {
    statsLoading.value = false
    tableLoading.value = false
  }
}

async function goToPage(target: number) {
  if (target < 1) return
  page.value = Math.min(target, totalPages.value)
}

function changePeriod(next: BookingPeriod) {
  if (next === period.value) return
  period.value = next
  page.value = 1
}

watch(search, () => {
  page.value = 1
})

watch(fieldFilter, () => {
  page.value = 1
  inlineEdits.value = {}
  inlineEditError.value = ''
  confirmInlineEdits.value = false
})

watch(
  fieldOptions,
  (options) => {
    if (!options.length) {
      fieldFilter.value = ''
      return
    }

    if (!options.some((field) => field.id === fieldFilter.value)) {
      fieldFilter.value = options[0].id
    }
  },
  { immediate: true },
)

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
  // Не двигаем строки под пользователем во время редактирования
  // и не мешаем первичной/навигационной загрузке.
  if (editing.value) return
  if (statsLoading.value || tableLoading.value) return
  if (silentInFlight) return

  silentInFlight = true
  try {
    const nextAll = await listBookings()
    if (changed(allBookings.value, nextAll)) allBookings.value = nextAll
    if (page.value > totalPages.value) page.value = totalPages.value
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

        <div
          class="flex flex-wrap gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800 sm:px-6"
        >
          <button
            v-for="field in fieldOptions"
            :key="field.id"
            type="button"
            class="rounded-full px-3 py-1.5 text-theme-xs font-medium transition-colors"
            :class="
              fieldFilter === field.id
                ? 'bg-success-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
            "
            @click="fieldFilter = field.id"
          >
            {{ field.name }}
            <span v-if="field.type" class="opacity-80">
              {{ FIELD_TYPE_LABEL[field.type] }}
            </span>
          </button>
        </div>

        <div
          v-if="pendingInlineEdits.length || inlineEditError"
          class="flex flex-col gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p class="text-theme-sm text-gray-600 dark:text-gray-300">
            Изменений: {{ pendingInlineEdits.length }}
          </p>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p v-if="inlineEditError" class="text-theme-xs text-error-600 dark:text-error-500">
              {{ inlineEditError }}
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-2 text-theme-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                @click="discardInlineEdits"
              >
                Сбросить
              </button>
              <button
                type="button"
                class="rounded-lg bg-success-600 px-3 py-2 text-theme-xs font-medium text-white transition-colors hover:bg-success-700 disabled:opacity-60"
                :disabled="!pendingInlineEdits.length"
                @click="openInlineConfirm"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="tableLoading" class="flex min-h-[240px] items-center justify-center">
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
            {{
              search.trim()
                ? 'По выбранным фильтрам броней нет.'
                : 'За выбранный период броней нет.'
            }}
          </p>
        </div>

        <!-- Grouped rows -->
        <div v-else class="space-y-5 bg-gray-50 px-4 py-5 dark:bg-gray-950/20 sm:px-6">
          <section
            v-for="dateGroup in groupedBookings"
            :key="dateGroup.date"
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div
              class="flex flex-col gap-1 border-b border-gray-200 bg-success-500 px-4 py-3 dark:border-green-800 dark:bg-green/[0.02] sm:px-5"
            >
              <h4 class="font-medium text-white text-theme-sm dark:text-white/90">
                {{ fullDateLabel(dateGroup.date) }}
              </h4>
              <p class="text-theme-xs text-white dark:text-gray-400">
                {{ dateGroup.fields.reduce((sum, field) => sum + field.bookings.length, 0) }}
                броней
              </p>
            </div>

            <div class="divide-y divide-gray-200 dark:divide-gray-800">
              <section v-for="fieldGroup in dateGroup.fields" :key="fieldGroup.key">
                <div class="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5 bg-green-200">
                  <span class="font-medium text-gray-700 text-theme-sm dark:text-gray-300">
                    {{ fieldGroup.fieldName }}
                  </span>
                  <span
                    v-if="fieldGroup.fieldType"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                  >
                    {{ FIELD_TYPE_LABEL[fieldGroup.fieldType] }}
                  </span>
                </div>

                <div class="max-w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                  <table class="min-w-[76rem] w-full">
                    <thead>
                      <tr
                        class="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
                      >
                        <th class="w-28 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Время
                          </p>
                        </th>
                        <th class="px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Клиент
                          </p>
                        </th>
                        <th class="w-28 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Договор
                          </p>
                        </th>
                        <th class="w-32 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Сумма
                          </p>
                        </th>
                        <th class="w-32 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Удалённо
                          </p>
                        </th>
                        <th class="w-32 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Наличные
                          </p>
                        </th>
                        <th class="w-32 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            QR
                          </p>
                        </th>
                        <th class="w-32 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Предоплата
                          </p>
                        </th>
                        <th class="w-32 px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Статус
                          </p>
                        </th>
                        <th class="w-16 px-4 py-2.5 text-right sm:px-5">
                          <span class="sr-only">Действия</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                      <tr
                        v-for="b in fieldGroup.bookings"
                        :key="b.id"
                        class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td class="whitespace-nowrap px-4 py-4 align-top sm:px-5">
                          <span
                            class="block font-semibold text-gray-800 text-theme-sm dark:text-white/90"
                          >
                            {{ b.start }}
                          </span>
                          <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                            до {{ b.end }}
                          </span>
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <div class="flex items-center gap-3">
                            <div class="min-w-0">
                              <span
                                class="block max-w-[15rem] truncate font-medium text-gray-800 text-theme-sm dark:text-white/90"
                              >
                                {{ b.customerName }}
                              </span>
                              <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                                {{ b.customerPhone }}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <span
                            class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                            :class="
                              b.hasContract
                                ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'
                            "
                          >
                            {{ b.hasContract ? 'Да' : 'Нет' }}
                          </span>
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {{ formatPrice(b.total) }}
                          </span>
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <span class="font-medium text-gray-700 text-theme-sm dark:text-gray-300">
                            {{ formatPrice(b.paidBot) }}
                          </span>
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <input
                            type="number"
                            min="0"
                            :max="MAX_PAYMENT"
                            step="1"
                            inputmode="numeric"
                            class="h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-2.5 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            :value="inlineValue(b, 'paidCash')"
                            @input="
                              setInlineValue(
                                b,
                                'paidCash',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                          />
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <input
                            type="number"
                            min="0"
                            :max="MAX_PAYMENT"
                            step="1"
                            inputmode="numeric"
                            class="h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-2.5 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            :value="inlineValue(b, 'paidKaspiQr')"
                            @input="
                              setInlineValue(
                                b,
                                'paidKaspiQr',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                          />
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <input
                            type="number"
                            min="0"
                            :max="MAX_PAYMENT"
                            step="1"
                            inputmode="numeric"
                            class="h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-2.5 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            :value="inlineValue(b, 'paidAvans')"
                            @input="
                              setInlineValue(
                                b,
                                'paidAvans',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                          />
                        </td>

                        <td class="px-4 py-4 align-top sm:px-5">
                          <select
                            class="h-9 w-36 rounded-lg border border-transparent px-2.5 text-theme-xs font-medium shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                            :class="inlineStatusClass(b)"
                            :value="inlineValue(b, 'state')"
                            @change="
                              setInlineValue(b, 'state', ($event.target as HTMLSelectElement).value)
                            "
                          >
                            <option
                              v-if="
                                !STATUS_OPTIONS.includes(
                                  String(inlineValue(b, 'state')) as BookingState,
                                )
                              "
                              :value="inlineValue(b, 'state')"
                            >
                              {{ bookingStateLabel(String(inlineValue(b, 'state'))) }}
                            </option>
                            <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">
                              {{ BOOKING_STATE_LABEL[status] }}
                            </option>
                          </select>
                        </td>

                        <td class="px-4 py-4 text-right align-top sm:px-5">
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
              </section>
            </div>
          </section>
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

    <BookingEditModal v-if="editing" :booking="editing" @close="editing = null" @saved="onSaved" />

    <Modal v-if="confirmInlineEdits" :fullScreenBackdrop="true" @close="confirmInlineEdits = false">
      <template #body>
        <div
          class="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <button
            class="absolute right-5 top-5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white/90"
            aria-label="Закрыть"
            :disabled="savingInlineEdits"
            @click="confirmInlineEdits = false"
          >
            <X class="h-5 w-5" />
          </button>

          <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Подтвердить изменения
          </h3>
          <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Вы уверены, что хотите изменить следующие данные?
          </p>

          <div class="max-h-[50vh] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
            <section
              v-for="item in inlineEditChanges"
              :key="item.edit.id"
              class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div class="mb-3">
                <p class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ item.edit.customerName }}
                </p>
                <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ item.edit.ref }} · {{ item.edit.fieldName }}
                </p>
              </div>
              <dl class="space-y-2">
                <div
                  v-for="change in item.changes"
                  :key="change.key"
                  class="flex items-center justify-between gap-4 text-theme-sm"
                >
                  <dt class="text-gray-500 dark:text-gray-400">{{ change.label }}</dt>
                  <dd class="text-right font-medium text-gray-800 dark:text-white/90">
                    {{ change.from }} -> {{ change.to }}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <p v-if="inlineEditError" class="mt-4 text-sm text-error-600 dark:text-error-500">
            {{ inlineEditError }}
          </p>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              :disabled="savingInlineEdits"
              @click="confirmInlineEdits = false"
            >
              Нет
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-success-700 disabled:opacity-60"
              :disabled="savingInlineEdits"
              @click="saveInlineEdits"
            >
              <Loader2 v-if="savingInlineEdits" class="h-4 w-4 animate-spin" />
              Да
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>
