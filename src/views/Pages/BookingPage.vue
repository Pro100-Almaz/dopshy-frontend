<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import {
  Loader2,
  CalendarX,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Search,
  Save,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingStats from '@/components/bookings/BookingStats.vue'
import BookingCalendar from '@/components/bookings/BookingCalendar.vue'
import BookingEditModal from '@/components/bookings/BookingEditModal.vue'
import Modal from '@/components/ui/Modal.vue'
import ModalBackButton from '@/components/ui/ModalBackButton.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

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

// «1 бронь», «2 брони», «5 броней».
function bookingsCountLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'бронь'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'брони'
        : 'броней'
  return `${n} ${word}`
}

function fullDateLabel(iso: string): string {
  const d = formatDayLabel(iso)
  return `${d.day} ${d.month}, ${d.weekday}`
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

// ── Телефон: в строке только время и клиент, остальное — в модалке деталей ──
// Модалки складываются стопкой: детали → редактирование / подтверждение.
// «Назад» закрывает только верхнюю, X — все сразу.
const isMobile = useMediaQuery('(max-width: 767px)')
const detailBooking = ref<Booking | null>(null)

function openDetails(booking: Booking) {
  if (isMobile.value) detailBooking.value = booking
}
function closeAll() {
  editing.value = null
  confirmInlineEdits.value = false
  detailBooking.value = null
}
watch(isMobile, (mobile) => {
  if (!mobile) detailBooking.value = null
})
// Детали показывают свежие данные: список перечитывается после сохранений и опроса.
watch(allBookings, (rows) => {
  const open = detailBooking.value
  if (open) detailBooking.value = rows.find((b) => b.id === open.id) ?? open
})
// Варианты статуса в деталях: служебный/неизвестный текущий статус тоже в списке, чтобы он отображался.
const detailStatusOptions = computed<string[]>(() => {
  const open = detailBooking.value
  if (!open) return []
  const current = String(inlineValue(open, 'state'))
  const original = open.state
  const extra = [original, current].filter(
    (st, i, arr) => !STATUS_OPTIONS.includes(st as BookingState) && arr.indexOf(st) === i,
  )
  return [...extra, ...STATUS_OPTIONS]
})

const detailHasPendingEdit = computed(
  () => !!detailBooking.value && !!inlineEdits.value[detailBooking.value.id],
)

// После сохранения обновляем сводки и текущее представление таблицы.
// Если редактирование открыто из деталей, возвращаемся к ним (они обновятся сами).
async function onSaved() {
  editing.value = null
  await loadAll()
  await goToPage(page.value)
}

function discardDetailEdit() {
  const open = detailBooking.value
  if (!open) return
  const next = { ...inlineEdits.value }
  delete next[open.id]
  inlineEdits.value = next
  inlineEditError.value = ''
}

async function onEditBack(changed: boolean) {
  editing.value = null
  if (changed) await onSaved()
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
    <BookingCalendar v-if="viewMode === 'calendar'" @edit="openEdit" />

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
              class="flex flex-col gap-0.5 border-b border-success-700/20 bg-success-600 px-4 py-3 dark:border-success-500/20 dark:bg-success-500/15 sm:px-5"
            >
              <h4 class="font-semibold text-white text-theme-sm">
                {{ fullDateLabel(dateGroup.date) }}
              </h4>
              <p class="text-theme-xs text-white/85 dark:text-success-200">
                {{
                  bookingsCountLabel(
                    dateGroup.fields.reduce((sum, field) => sum + field.bookings.length, 0),
                  )
                }}
              </p>
            </div>

            <div class="divide-y divide-gray-200 dark:divide-gray-800">
              <section v-for="fieldGroup in dateGroup.fields" :key="fieldGroup.key">
                <div
                  class="flex flex-wrap items-center gap-2 bg-success-50 px-4 py-3 dark:bg-white/[0.04] sm:px-5"
                >
                  <span class="font-medium text-success-800 text-theme-sm dark:text-gray-200">
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
                  <table class="w-full table-fixed md:min-w-[76rem] md:table-auto">
                    <thead>
                      <tr
                        class="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
                      >
                        <th class="w-24 px-4 py-2.5 text-left sm:px-5 md:w-28">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Время
                          </p>
                        </th>
                        <th class="px-4 py-2.5 text-left sm:px-5">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Клиент
                          </p>
                        </th>
                        <th class="hidden w-28 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Договор
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Сумма
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Скидка
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Удалённо
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Наличные
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            QR
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Предоплата
                          </p>
                        </th>
                        <th class="hidden w-32 px-4 py-2.5 text-left sm:px-5 md:table-cell">
                          <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                            Статус
                          </p>
                        </th>
                        <th class="hidden w-16 px-4 py-2.5 text-right sm:px-5 md:table-cell">
                          <span class="sr-only">Действия</span>
                        </th>
                        <th class="w-10 md:hidden"><span class="sr-only">Подробнее</span></th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                      <tr
                        v-for="b in fieldGroup.bookings"
                        :key="b.id"
                        class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] max-md:cursor-pointer max-md:active:bg-gray-100 dark:max-md:active:bg-white/5"
                        :class="
                          inlineEdits[b.id] && 'max-md:bg-warning-50 dark:max-md:bg-warning-500/10'
                        "
                        :tabindex="isMobile ? 0 : undefined"
                        :aria-label="
                          isMobile
                            ? `${b.start}–${b.end}, ${b.customerName} — подробнее`
                            : undefined
                        "
                        @click="openDetails(b)"
                        @keydown.enter="openDetails(b)"
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
                          <div class="flex min-w-0 items-center gap-3">
                            <div class="min-w-0">
                              <span
                                class="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90 md:max-w-[15rem]"
                              >
                                {{ b.customerName }}
                              </span>
                              <span
                                class="hidden text-gray-500 text-theme-xs dark:text-gray-400 md:block"
                              >
                                {{ b.customerPhone }}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
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

                        <!-- Брони по договору: деньги ведутся на договоре, а не на брони. -->
                        <template v-if="b.hasContract">
                          <td
                            v-for="n in 6"
                            :key="n"
                            class="hidden px-4 py-4 align-top text-gray-400 sm:px-5 md:table-cell"
                          >
                            —
                          </td>
                        </template>
                        <template v-else>
                          <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
                            <span
                              class="font-medium text-gray-800 text-theme-sm dark:text-white/90"
                            >
                              {{ formatPrice(b.total) }}
                            </span>
                          </td>

                          <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
                            <span
                              v-if="b.discountAmount"
                              class="font-medium text-success-700 text-theme-sm"
                              >− {{ formatPrice(b.discountAmount) }}</span
                            >
                            <span v-else class="text-gray-400">—</span>
                          </td>

                          <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
                            <span
                              class="font-medium text-gray-700 text-theme-sm dark:text-gray-300"
                            >
                              {{ formatPrice(b.paidBot) }}
                            </span>
                          </td>

                          <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
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

                          <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
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

                          <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
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
                        </template>

                        <td class="hidden px-4 py-4 align-top sm:px-5 md:table-cell">
                          <select
                            class="h-9 w-36 rounded-lg border border-transparent px-2.5 text-theme-xs font-medium shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                            :class="inlineStatusClass(b)"
                            :value="inlineValue(b, 'state')"
                            @change="
                              setInlineValue(b, 'state', ($event.target as HTMLSelectElement).value)
                            "
                          >
                            <option
                              class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
                              v-if="
                                !STATUS_OPTIONS.includes(
                                  String(inlineValue(b, 'state')) as BookingState,
                                )
                              "
                              :value="inlineValue(b, 'state')"
                            >
                              {{ bookingStateLabel(String(inlineValue(b, 'state'))) }}
                            </option>
                            <option
                              v-for="status in STATUS_OPTIONS"
                              :key="status"
                              :value="status"
                              class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
                            >
                              {{ BOOKING_STATE_LABEL[status] }}
                            </option>
                          </select>
                        </td>

                        <td class="hidden px-4 py-4 text-right align-top sm:px-5 md:table-cell">
                          <button
                            type="button"
                            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white/90"
                            :aria-label="`Редактировать бронь ${b.ref}`"
                            @click="openEdit(b)"
                          >
                            <Pencil class="h-4 w-4" />
                          </button>
                        </td>
                        <td class="py-4 pr-3 text-right align-top md:hidden">
                          <ChevronRight class="ml-auto h-5 w-5 text-gray-400" aria-hidden="true" />
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

    <!-- Телефон: детали брони (в строке только время и клиент). Поверх неё открываются
         редактирование и подтверждение — со стрелкой «Назад». -->
    <Modal v-if="detailBooking" :fullScreenBackdrop="true" @close="closeAll">
      <template #body>
        <div
          class="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-label="`Бронь ${detailBooking.ref}`"
        >
          <div
            class="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5 dark:border-gray-800 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ detailBooking.start }}–{{ detailBooking.end }}
              </h2>
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                {{ fullDateLabel(detailBooking.date) }} · {{ detailBooking.fieldName }}
              </p>
            </div>
            <button
              type="button"
              class="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5"
              aria-label="Закрыть"
              @click="closeAll"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <div class="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
              <p class="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
                {{ detailBooking.customerName }}
              </p>
              <a
                v-if="detailBooking.customerPhone"
                :href="`tel:${detailBooking.customerPhone}`"
                class="text-theme-xs text-success-600 dark:text-success-500"
              >
                {{ detailBooking.customerPhone }}
              </a>
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ detailBooking.ref }}</p>
            </div>

            <dl class="mt-4 divide-y divide-gray-100 text-theme-sm dark:divide-gray-800">
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Договор</dt>
                <dd>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                    :class="
                      detailBooking.hasContract
                        ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'
                    "
                  >
                    {{ detailBooking.hasContract ? 'Да' : 'Нет' }}
                  </span>
                </dd>
              </div>
              <template v-if="!detailBooking.hasContract">
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-gray-500 dark:text-gray-400">Сумма</dt>
                  <dd class="font-semibold text-gray-800 dark:text-white/90">
                    {{ formatPrice(detailBooking.total) }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-gray-500 dark:text-gray-400">Скидка</dt>
                  <dd
                    :class="
                      detailBooking.discountAmount
                        ? 'font-medium text-success-700'
                        : 'text-gray-400'
                    "
                  >
                    {{
                      detailBooking.discountAmount
                        ? `− ${formatPrice(detailBooking.discountAmount)}`
                        : '—'
                    }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-gray-500 dark:text-gray-400">Удалённо</dt>
                  <dd class="text-gray-800 dark:text-white/90">
                    {{ formatPrice(detailBooking.paidBot) }}
                  </dd>
                </div>
              </template>
            </dl>
            <p
              v-if="detailBooking.hasContract"
              class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400"
            >
              Оплата этой брони ведётся по договору.
            </p>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <template v-if="!detailBooking.hasContract">
                <label class="grid gap-1.5">
                  <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >Наличные</span
                  >
                  <input
                    type="number"
                    min="0"
                    :max="MAX_PAYMENT"
                    step="1"
                    inputmode="numeric"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    :value="inlineValue(detailBooking, 'paidCash')"
                    @input="
                      setInlineValue(
                        detailBooking!,
                        'paidCash',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />
                </label>
                <label class="grid gap-1.5">
                  <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">QR</span>
                  <input
                    type="number"
                    min="0"
                    :max="MAX_PAYMENT"
                    step="1"
                    inputmode="numeric"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    :value="inlineValue(detailBooking, 'paidKaspiQr')"
                    @input="
                      setInlineValue(
                        detailBooking!,
                        'paidKaspiQr',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />
                </label>
                <label class="grid gap-1.5">
                  <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >Предоплата</span
                  >
                  <input
                    type="number"
                    min="0"
                    :max="MAX_PAYMENT"
                    step="1"
                    inputmode="numeric"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    :value="inlineValue(detailBooking, 'paidAvans')"
                    @input="
                      setInlineValue(
                        detailBooking!,
                        'paidAvans',
                        ($event.target as HTMLInputElement).value,
                      )
                    "
                  />
                </label>
              </template>
              <label class="grid gap-1.5" :class="detailBooking.hasContract && 'col-span-2'">
                <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >Статус</span
                >
                <select
                  class="h-11 w-full rounded-lg border border-transparent px-3 font-medium shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10"
                  :class="inlineStatusClass(detailBooking)"
                  :value="inlineValue(detailBooking, 'state')"
                  @change="
                    setInlineValue(
                      detailBooking!,
                      'state',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option
                    v-for="status in detailStatusOptions"
                    :key="status"
                    :value="status"
                    class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    {{ bookingStateLabel(status) }}
                  </option>
                </select>
              </label>
            </div>

            <p v-if="inlineEditError" class="mt-3 text-theme-xs text-error-600 dark:text-error-500">
              {{ inlineEditError }}
            </p>
          </div>
          <div class="shrink-0 border-t border-gray-100 px-5 py-4 dark:border-gray-800 grid gap-2">
            <div v-if="detailHasPendingEdit" class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                @click="discardDetailEdit"
              >
                Сбросить
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-semibold text-white hover:bg-success-700"
                @click="openInlineConfirm"
              >
                <Save class="h-4 w-4" aria-hidden="true" />
                Сохранить
              </button>
            </div>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              @click="openEdit(detailBooking)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
              Редактировать
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <BookingEditModal
      v-if="editing"
      :booking="editing"
      :stacked="!!detailBooking"
      @close="closeAll"
      @saved="onSaved"
      @back="onEditBack"
    />

    <Modal v-if="confirmInlineEdits" :fullScreenBackdrop="true" @close="confirmInlineEdits = false">
      <template #body>
        <div
          class="relative flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <button
            type="button"
            class="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white/90"
            aria-label="Закрыть"
            :disabled="savingInlineEdits"
            @click="closeAll"
          >
            <X class="h-5 w-5" />
          </button>

          <div class="mb-1 flex items-center gap-1 pr-8">
            <ModalBackButton
              v-if="detailBooking"
              :disabled="savingInlineEdits"
              @back="confirmInlineEdits = false"
            />
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Подтвердить изменения
            </h3>
          </div>
          <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Вы уверены, что хотите изменить следующие данные?
          </p>

          <div
            class="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 custom-scrollbar"
          >
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
