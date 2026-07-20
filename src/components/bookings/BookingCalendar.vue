<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Loader2, CalendarX, ChevronLeft, ChevronRight } from 'lucide-vue-next'

import type { Booking, Field } from '@/types'
import {
  toISO,
  formatDayLabel,
  formatPrice,
  getManagerFields,
  listFieldBookingsInRange,
  isVisibleBookingState,
  FIELD_TYPE_LABEL,
  BOOKING_STATE_LABEL,
} from '@/services/booking'

const bookings = ref<Booking[]>([])
const loading = ref(false)

// ── Фильтр по полю ──────────────────────────────────
const fields = ref<Field[]>([])
const selectedFieldId = ref('1')

onMounted(async () => {
  try {
    fields.value = await getManagerFields()
  } catch {
    fields.value = []
  }
})

const fieldOptions = computed<{ id: string; name: string; type?: string }[]>(() => {
  if (fields.value.length) {
    return fields.value.map((f) => ({ id: f.id, name: f.name, type: f.type }))
  }
  const map = new Map<string, string>()
  for (const b of bookings.value) {
    if (!map.has(b.fieldId)) map.set(b.fieldId, b.fieldName)
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }))
})

watch(
  fieldOptions,
  (opts) => {
    if (opts.length && !opts.some((o) => o.id === selectedFieldId.value)) {
      selectedFieldId.value = opts.find((o) => o.id === '1')?.id ?? opts[0].id
    }
  },
  { immediate: true },
)

// ── Режим отображения ──────────────────────────────
type CalendarView = 'week' | 'month' | 'year'
const view = ref<CalendarView>('week')
const VIEWS: { key: CalendarView; label: string; disabled?: boolean }[] = [
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
]

// ── Сетка: получасовые интервалы за сутки ──────────
const OPEN_HOUR = 0
const CLOSE_HOUR = 24
const SLOT_MIN = 30
const DAY_MIN = CLOSE_HOUR * 60

const pad = (n: number) => String(n).padStart(2, '0')
function minToTime(m: number): string {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

const rows = computed(() => {
  const out: { startMin: number; label: string }[] = []
  for (let m = OPEN_HOUR * 60; m < DAY_MIN; m += SLOT_MIN) {
    out.push({ startMin: m, label: minToTime(m) })
  }
  return out
})

// ── Навигация по неделям ────────────────────────────
const weekOffset = ref(0) // 0 = текущая неделя

function startOfWeek(base: Date): Date {
  const x = new Date(base)
  x.setHours(0, 0, 0, 0)
  const mondayIndex = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - mondayIndex)
  return x
}

const days = computed(() => {
  const start = startOfWeek(new Date())
  start.setDate(start.getDate() + weekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toISO(d)
    return { iso, label: formatDayLabel(iso) }
  })
})

const rangeLabel = computed(() => {
  const d = days.value
  if (!d.length) return ''
  const a = d[0].label
  const b = d[d.length - 1].label
  return a.month === b.month
    ? `${a.day}–${b.day} ${a.month}`
    : `${a.day} ${a.month} – ${b.day} ${b.month}`
})

function prevWeek() {
  weekOffset.value--
}
function nextWeek() {
  weekOffset.value++
}
function toToday() {
  weekOffset.value = 0
}

// ── Навигация по месяцам ────────────────────────────
const todayIso = toISO(new Date())
const monthIndex = ref(new Date().getMonth()) // 0–11
const monthYear = ref(new Date().getFullYear())

const MONTHS_FULL = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const monthLabel = computed(() => MONTHS_FULL[monthIndex.value] ?? '')

function prevMonth() {
  if (monthIndex.value === 0) {
    monthIndex.value = 11
    monthYear.value--
  } else {
    monthIndex.value--
  }
}
function nextMonth() {
  if (monthIndex.value === 11) {
    monthIndex.value = 0
    monthYear.value++
  } else {
    monthIndex.value++
  }
}
function monthToToday() {
  monthIndex.value = new Date().getMonth()
  monthYear.value = new Date().getFullYear()
}

function goToWeek(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const target = startOfWeek(new Date(y, m - 1, d)).getTime()
  const base = startOfWeek(new Date()).getTime()
  weekOffset.value = Math.round((target - base) / (7 * 86400000))
  view.value = 'week'
}

const yearView = ref(new Date().getFullYear())

interface MiniDay {
  dayNum: number
  inMonth: boolean
  isToday: boolean
}

function buildMonthGrid(year: number, month: number): MiniDay[] {
  const first = new Date(year, month, 1)
  const startIdx = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startIdx)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((startIdx + lastDay) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return { dayNum: d.getDate(), inMonth: d.getMonth() === month, isToday: toISO(d) === todayIso }
  })
}

const yearMonths = computed(() =>
  MONTHS_FULL.map((label, m) => ({ month: m, label, days: buildMonthGrid(yearView.value, m) })),
)

function prevYear() {
  yearView.value--
}
function nextYear() {
  yearView.value++
}
function yearToToday() {
  yearView.value = new Date().getFullYear()
}

function goToMonth(month: number) {
  monthIndex.value = month
  monthYear.value = yearView.value
  view.value = 'month'
}

// ── Брони недели, разложенные на сетку ──────────────

interface PlacedBooking {
  booking: Booking
  dayIso: string
  startMin: number
  endMin: number
  rowStartMin: number 
  midRowMin: number
}

const weekBookings = computed<PlacedBooking[]>(() => {
  const isoSet = new Set(days.value.map((d) => d.iso))
  const placed: PlacedBooking[] = []
  for (const b of bookings.value) {
    if (b.fieldId !== selectedFieldId.value) continue
    if (!isVisibleBookingState(b.state)) continue
    if (!isoSet.has(b.date)) continue
    const startMin = toMinutes(b.start)
    const endMin = Math.max(toMinutes(b.end), startMin + SLOT_MIN)
    // Строки, которые занимает бронь: от верхней (m0) до последней (mL).
    const m0 = Math.floor(startMin / SLOT_MIN) * SLOT_MIN
    const mL = (Math.ceil(Math.min(endMin, DAY_MIN) / SLOT_MIN) - 1) * SLOT_MIN
    const rowCount = (mL - m0) / SLOT_MIN + 1
    placed.push({
      booking: b,
      dayIso: b.date,
      startMin,
      endMin,
      rowStartMin: m0,
      midRowMin: m0 + Math.floor((rowCount - 1) / 2) * SLOT_MIN,
    })
  }
  return placed
})

const hasBookings = computed(() => weekBookings.value.length > 0)

// ── Месяц: ячейки календаря со списком клиентов ─────
interface MonthCell {
  iso: string
  dayNum: number
  inMonth: boolean
  isToday: boolean
  bookings: Booking[]
}

// Брони одного дня (учёт фильтра по полю и скрытых статусов), по времени начала.
function bookingsForDay(iso: string): Booking[] {
  return bookings.value
    .filter(
      (b) =>
        b.fieldId === selectedFieldId.value && isVisibleBookingState(b.state) && b.date === iso,
    )
    .sort((a, b) => a.start.localeCompare(b.start))
}

// Границы месячной сетки (понедельник—воскресенье, с «хвостами» соседних
// месяцев). Только даты — без зависимости от броней, поэтому этим же расчётом
// безопасно пользуется диапазон загрузки (см. visibleRange).
function monthGridBounds(year: number, month: number): { gridStart: Date; cellCount: number } {
  const first = new Date(year, month, 1)
  const startIdx = (first.getDay() + 6) % 7 // сколько дней добрать слева до понедельника
  const gridStart = new Date(year, month, 1 - startIdx)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((startIdx + lastDay) / 7)
  return { gridStart, cellCount: weeks * 7 }
}

function resolvedMonthYear(): number {
  return Number.isFinite(monthYear.value) ? monthYear.value : new Date().getFullYear()
}

const monthDays = computed<MonthCell[]>(() => {
  const year = resolvedMonthYear()
  const month = monthIndex.value
  const { gridStart, cellCount } = monthGridBounds(year, month)

  return Array.from({ length: cellCount }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const iso = toISO(d)
    return {
      iso,
      dayNum: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === todayIso,
      bookings: bookingsForDay(iso),
    }
  })
})

interface CellInfo {
  p: PlacedBooking | null 
  isStart: boolean 
  isMiddle: boolean
  borderBottom: boolean
}

const grid = computed<Map<string, CellInfo[]>>(() => {
  const byDay = new Map<string, CellInfo[]>()
  for (const d of days.value) {
    const cells = rows.value.map((row) => {
      const end = row.startMin + SLOT_MIN
      const p =
        weekBookings.value.find(
          (pb) => pb.dayIso === d.iso && pb.startMin < end && pb.endMin > row.startMin,
        ) ?? null
      const continuesBelow = !!p && p.endMin > end
      return {
        p,
        isStart: !!p && p.rowStartMin === row.startMin,
        isMiddle: !!p && p.midRowMin === row.startMin,
        borderBottom: !continuesBelow,
      }
    })
    byDay.set(d.iso, cells)
  }
  return byDay
})

function cellInfo(dayIso: string, rowIndex: number): CellInfo {
  return (
    grid.value.get(dayIso)?.[rowIndex] ?? {
      p: null,
      isStart: false,
      isMiddle: false,
      borderBottom: true,
    }
  )
}

function stateClass(state: string): string {
  if (state === 'confirmed' || state === 'paid') {
    return 'bg-success-100 text-success-800 dark:bg-success-500/15 dark:text-success-300'
  }
  if (state === 'awaiting_payment') {
    return 'bg-warning-100 text-warning-800 dark:bg-warning-500/15 dark:text-warning-300'
  }
  return 'bg-gray-200 text-gray-700 dark:bg-gray-500/20 dark:text-gray-200'
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `3rem repeat(${days.value.length}, minmax(0, 1fr))`,
}))

// ── Тултип брони (следует за курсором) ──────────────
const hover = ref<Booking | null>(null)
const tipPos = ref({ x: 0, y: 0 })

function showTip(b: Booking, e: MouseEvent) {
  hover.value = b
  tipPos.value = { x: e.clientX, y: e.clientY }
}
function moveTip(e: MouseEvent) {
  tipPos.value = { x: e.clientX, y: e.clientY }
}
function hideTip() {
  hover.value = null
}

// Позиция тултипа: по умолчанию справа-снизу от курсора, но у краёв экрана
// разворачиваем влево/вверх, чтобы карточка не уезжала за пределы окна.
const tipEl = ref<HTMLElement | null>(null)
const tipStyle = computed(() => {
  const GAP = 14
  const w = tipEl.value?.offsetWidth || 240 // w-60
  const h = tipEl.value?.offsetHeight || 180
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { x, y } = tipPos.value

  let left = x + GAP
  if (left + w > vw - GAP) left = x - GAP - w // не влезает справа → слева от курсора
  left = Math.max(GAP, Math.min(left, vw - w - GAP))

  let top = y + GAP
  if (top + h > vh - GAP) top = y - GAP - h // не влезает снизу → над курсором
  top = Math.max(GAP, Math.min(top, vh - h - GAP))

  return { left: `${left}px`, top: `${top}px` }
})

// ── Загрузка броней видимого периода ────────────────
const visibleRange = computed<{ from: string; to: string } | null>(() => {
  if (view.value === 'week') {
    const d = days.value
    return d.length ? { from: d[0].iso, to: d[d.length - 1].iso } : null
  }
  if (view.value === 'month') {
    const { gridStart, cellCount } = monthGridBounds(resolvedMonthYear(), monthIndex.value)
    const gridEnd = new Date(gridStart)
    gridEnd.setDate(gridStart.getDate() + cellCount - 1)
    return { from: toISO(gridStart), to: toISO(gridEnd) }
  }
  return null
})

let rangeReq = 0
async function loadRange(from: string, to: string, fieldId: string) {
  const req = ++rangeReq
  loading.value = true
  try {
    const rows = await listFieldBookingsInRange(fieldId, from, to)
    if (req === rangeReq) bookings.value = rows
  } catch {
    if (req === rangeReq) bookings.value = []
  } finally {
    if (req === rangeReq) loading.value = false
  }
}

// Перезагружаем при смене периода или поля. Год (range === null) не грузит.
watch(
  () => [visibleRange.value?.from, visibleRange.value?.to, selectedFieldId.value] as const,
  ([from, to, fieldId]) => {
    if (from && to && fieldId) loadRange(from, to, fieldId)
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar: режим (неделя/месяц/год) + навигация + легенда -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Переключатель режима -->
      <div
        class="inline-flex items-center gap-1 rounded-full border border-gray-200 p-0.5 dark:border-gray-700"
      >
        <button
          v-for="v in VIEWS"
          :key="v.key"
          type="button"
          :disabled="v.disabled"
          class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          :class="
            view === v.key
              ? 'bg-success-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          "
          :aria-pressed="view === v.key"
          @click="!v.disabled && (view = v.key)"
        >
          {{ v.label }}
        </button>
      </div>

      <!-- Навигация по неделям -->
      <div v-if="view === 'week'" class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          @click="toToday"
        >
          Сегодня
        </button>
        <div
          class="flex items-center gap-1 rounded-full border border-gray-200 p-0.5 dark:border-gray-700"
        >
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Предыдущая неделя"
            @click="prevWeek"
          >
            <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            class="min-w-[7rem] text-center text-sm font-semibold text-gray-700 dark:text-gray-300"
            >{{ rangeLabel }}</span
          >
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Следующая неделя"
            @click="nextWeek"
          >
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Навигация по месяцам -->
      <div v-else-if="view === 'month'" class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          @click="monthToToday"
        >
          Сегодня
        </button>
        <div
          class="flex items-center gap-1 rounded-full border border-gray-200 p-0.5 dark:border-gray-700"
        >
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Предыдущий месяц"
            @click="prevMonth"
          >
            <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            class="min-w-[6rem] text-center text-sm font-semibold text-gray-700 dark:text-gray-300"
            >{{ monthLabel }}</span
          >
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Следующий месяц"
            @click="nextMonth"
          >
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <input
          v-model.number="monthYear"
          type="number"
          min="2000"
          max="2100"
          aria-label="Год"
          class="h-9 w-20 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/20 dark:border-gray-700 dark:text-gray-300"
        />
      </div>

      <!-- Навигация по годам -->
      <div v-else-if="view === 'year'" class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          @click="yearToToday"
        >
          Сегодня
        </button>
        <div
          class="flex items-center gap-1 rounded-full border border-gray-200 p-0.5 dark:border-gray-700"
        >
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Предыдущий год"
            @click="prevYear"
          >
            <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            class="min-w-[4rem] text-center text-sm font-semibold text-gray-700 dark:text-gray-300"
            >{{ yearView }}</span
          >
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Следующий год"
            @click="nextYear"
          >
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Фильтр по полю -->
    <div v-if="view !== 'year'" class="flex flex-wrap items-center gap-2">
      <span class="mr-1 text-sm font-medium text-gray-500 dark:text-gray-400">Поле:</span>
      <button
        v-for="f in fieldOptions"
        :key="f.id"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          f.id === selectedFieldId
            ? 'border-success-600 bg-success-600 text-white'
            : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
        "
        :aria-pressed="f.id === selectedFieldId"
        @click="selectedFieldId = f.id"
      >
        {{ f.name }}
        <span
          v-if="f.type"
          class="ml-1 text-xs"
          :class="f.id === selectedFieldId ? 'text-white/70' : 'text-gray-400'"
        >
          {{ FIELD_TYPE_LABEL[f.type] ?? f.type }}
        </span>
      </button>
    </div>

    <!-- Легенда статусов -->
    <div
      v-if="view !== 'year'"
      class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400"
    >
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-success-500" aria-hidden="true" />
        Подтверждено
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-warning-400" aria-hidden="true" />
        Ожидает оплаты
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-gray-400 dark:bg-gray-500" aria-hidden="true" />
        Черновик
      </span>
    </div>

    <!-- Недельная сетка -->
    <div
      class="custom-scrollbar relative max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800"
    >
      <div
        v-if="loading && view !== 'year'"
        class="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-gray-900/70"
      >
        <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
        <span class="sr-only">Загрузка расписания…</span>
      </div>

      <!-- Неделя -->
      <template v-if="view === 'week'">
        <!-- Пусто -->
        <div
          v-if="!hasBookings && !loading"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <CalendarX class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">На этой неделе броней нет.</p>
        </div>

        <div v-else class="grid min-w-[44rem] text-center" :style="gridStyle">
        <!-- Header row -->
        <div
          class="sticky left-0 top-0 z-20 border-b border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        />
        <div
          v-for="d in days"
          :key="d.iso"
          class="sticky top-0 z-10 border-b border-gray-200 bg-white px-1 py-2 dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="text-[11px] uppercase text-gray-500">{{ d.label.weekday }}</div>
          <div class="text-base font-bold leading-none text-gray-900 dark:text-white/90">
            {{ d.label.day }}
          </div>
        </div>

        <!-- Time rows -->
        <template v-for="(row, ri) in rows" :key="row.startMin">
          <div
            class="sticky left-0 z-10 flex items-center justify-center border-b border-r border-gray-200 bg-white text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900"
          >
            {{ row.label }}
          </div>
          <div
            v-for="d in days"
            :key="`${d.iso}-${row.startMin}`"
            class="flex h-11 items-center justify-center overflow-hidden border-r border-gray-100 px-1 text-[10px] font-medium leading-none dark:border-gray-800"
            :class="[
              cellInfo(d.iso, ri).p ? stateClass(cellInfo(d.iso, ri).p!.booking.state) : '',
              cellInfo(d.iso, ri).borderBottom ? 'border-b border-gray-100 dark:border-gray-800' : '',
              cellInfo(d.iso, ri).p ? 'cursor-help' : '',
              cellInfo(d.iso, ri).p && cellInfo(d.iso, ri).isStart ? 'rounded-t-md' : '',
              cellInfo(d.iso, ri).p && cellInfo(d.iso, ri).borderBottom ? 'rounded-b-md' : '',
            ]"
            @mouseenter="cellInfo(d.iso, ri).p && showTip(cellInfo(d.iso, ri).p!.booking, $event)"
            @mousemove="cellInfo(d.iso, ri).p && moveTip($event)"
            @mouseleave="hideTip"
          >
            <span v-if="cellInfo(d.iso, ri).isMiddle" class="truncate text-sm font-semibold">
              {{ cellInfo(d.iso, ri).p!.booking.customerName || cellInfo(d.iso, ri).p!.booking.customerPhone }}
            </span>
          </div>
        </template>
        </div>
      </template>

      <!-- Месяц: сетка дней со списком клиентов -->
      <div v-else-if="view === 'month'" class="grid min-w-[44rem] grid-cols-7">
        <div
          v-for="wd in WEEKDAYS"
          :key="wd"
          class="sticky top-0 z-10 border-b border-r border-gray-200 bg-white py-2 text-center text-[11px] font-medium uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900"
        >
          {{ wd }}
        </div>
        <div
          v-for="c in monthDays"
          :key="c.iso"
          role="button"
          tabindex="0"
          class="min-h-[7rem] cursor-pointer border-b border-r border-gray-100 p-1.5 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-600 dark:border-gray-800 dark:hover:bg-white/[0.03]"
          :class="c.inMonth ? '' : 'bg-gray-50 dark:bg-white/[0.02]'"
          :aria-label="`Открыть неделю с ${c.dayNum} ${monthLabel}`"
          @click="goToWeek(c.iso)"
          @keydown.enter="goToWeek(c.iso)"
          @keydown.space.prevent="goToWeek(c.iso)"
        >
          <div class="mb-1 flex justify-end">
            <span
              class="grid h-6 min-w-[1.5rem] place-items-center rounded-full px-1 text-xs font-semibold"
              :class="
                c.isToday
                  ? 'bg-success-600 text-white'
                  : c.inMonth
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-400'
              "
            >
              {{ c.dayNum }}
            </span>
          </div>
          <div class="space-y-0.5">
            <div
              v-for="b in c.bookings.slice(0, 4)"
              :key="b.id"
              class="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
              :class="stateClass(b.state)"
              @mouseenter="showTip(b, $event)"
              @mousemove="moveTip($event)"
              @mouseleave="hideTip"
            >
              {{ b.customerName || b.customerPhone }}
            </div>
            <div
              v-if="c.bookings.length > 4"
              class="px-1 text-[10px] text-gray-500 dark:text-gray-400"
            >
              +{{ c.bookings.length - 4 }} ещё
            </div>
          </div>
        </div>
      </div>

      <!-- Год: 12 мини-календарей, клик по месяцу открывает его -->
      <div
        v-else
        class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <button
          v-for="mm in yearMonths"
          :key="mm.month"
          type="button"
          class="group rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-success-300 hover:bg-success-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600 dark:border-gray-800 dark:hover:border-success-500/40 dark:hover:bg-success-500/[0.06]"
          :aria-label="`Открыть ${mm.label} ${yearView}`"
          @click="goToMonth(mm.month)"
        >
          <div
            class="mb-2 text-sm font-semibold capitalize text-gray-800 group-hover:text-success-700 dark:text-white/90 dark:group-hover:text-success-400"
          >
            {{ mm.label }}
          </div>
          <div class="grid grid-cols-7 gap-y-1 text-center">
            <span
              v-for="wd in WEEKDAYS"
              :key="wd"
              class="text-xs font-medium text-gray-400 dark:text-gray-500"
            >
              {{ wd.charAt(0) }}
            </span>
            <span
              v-for="(day, i) in mm.days"
              :key="i"
              class="mx-auto grid h-6 w-6 place-items-center rounded-full text-xs tabular-nums"
              :class="[
                day.isToday
                  ? 'bg-success-600 font-semibold text-white'
                  : day.inMonth
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-gray-300 dark:text-gray-700',
              ]"
            >
              {{ day.dayNum }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Тултип брони -->
  <Teleport to="body">
    <div
      v-if="hover"
      ref="tipEl"
      class="pointer-events-none fixed z-[999] w-60 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl dark:border-gray-700 dark:bg-gray-900"
      :style="tipStyle"
    >
      <p class="text-sm font-semibold text-gray-900 dark:text-white/90">
        {{ hover.customerName }}
      </p>
      <p class="text-xs text-gray-500">{{ hover.customerPhone }}</p>

      <dl class="mt-2 space-y-1 text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Поле</dt>
          <dd class="text-gray-700 dark:text-gray-300">{{ hover.fieldName }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Время</dt>
          <dd class="text-gray-700 dark:text-gray-300">{{ hover.start }}–{{ hover.end }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Сумма</dt>
          <dd class="text-gray-700 dark:text-gray-300">{{ formatPrice(hover.total) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-gray-500">Статус</dt>
          <dd>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="stateClass(hover.state)"
            >
              {{ BOOKING_STATE_LABEL[hover.state as keyof typeof BOOKING_STATE_LABEL] ?? hover.state }}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  </Teleport>
</template>
