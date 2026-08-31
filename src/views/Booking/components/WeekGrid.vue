<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Loader2, Check, Repeat } from 'lucide-vue-next'
import type { Slot, SlotBooking, SlotInterval } from '@/types'
import { formatPrice, type WeekSlots } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'
import RepeatModal from './RepeatModal.vue'

const props = defineProps<{
  week: WeekSlots
  loading?: boolean
  fill?: boolean
  allowRepeat?: boolean
  large?: boolean
  hideBookingDetails?: boolean
  hideSlotPrices?: boolean
}>()

const store = useBookingStore()
const auth = useAuthStore()

// Данные чужой брони (имя, телефон, заметка, сумма, статус) — только для сотрудников.
// Клиенту на публичной странице занятый слот виден обезличенно: «ЗАНЯТО».
const canSeeBookingDetails = computed(() => auth.isStaff && !props.hideBookingDetails)
const BOOKED_LABEL = 'ЗАНЯТО'

function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Роль каждой видимой ячейки в повторе — считаем один раз на неделю.
const repeatStates = computed(() => {
  const m: Record<string, 'source' | 'occurrence' | null> = {}
  if (!props.allowRepeat) return m
  for (const row of props.week.rows) {
    for (const cell of row.cells) {
      m[cell.id] = store.cellRepeatState(cell.fieldId, cell.date, cell.start, cell.end)
    }
  }
  return m
})

// ── Повтор: sticky-модалка по правому клику на интервале ──
const repeatOpen = ref(false)
const repeatInterval = ref<SlotInterval | null>(null)
const repeatAnchor = ref({ x: 0, y: 0 })

function intervalAt(cell: Slot): SlotInterval | null {
  const cs = toMin(cell.start)
  const ce = toMin(cell.end)
  return (
    store.intervals.find(
      (iv) =>
        iv.fieldId === cell.fieldId &&
        iv.date === cell.date &&
        toMin(iv.start) <= cs &&
        toMin(iv.end) >= ce,
    ) ?? null
  )
}

// Открыть модалку повтора для интервала под ячейкой у точки (x, y).
function openRepeat(cell: Slot, x: number, y: number) {
  if (!props.allowRepeat) return
  const iv = intervalAt(cell)
  if (!iv) return // не по выбранному интервалу — игнорируем
  repeatInterval.value = iv
  repeatAnchor.value = { x, y }
  repeatOpen.value = true
}

// Десктоп: правый клик по интервалу.
function onContext(cell: Slot, e: MouseEvent) {
  if (!props.allowRepeat) return
  e.preventDefault()
  openRepeat(cell, e.clientX, e.clientY)
}

// ── Мобильные: долгое нажатие (press-and-hold) = аналог правого клика ──
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE = 10 // px — сдвиг больше = это скролл, отменяем удержание
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressStart = { x: 0, y: 0 }
// Долгое нажатие открыло модалку — гасим последующий «фантомный» click.
let longPressFired = false

function clearPress() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function onTouchStart(cell: Slot, e: TouchEvent) {
  if (!props.allowRepeat) return
  if (!intervalAt(cell)) return // удержание имеет смысл только на выбранном интервале
  const t = e.touches[0]
  if (!t) return
  pressStart = { x: t.clientX, y: t.clientY }
  longPressFired = false
  clearPress()
  pressTimer = setTimeout(() => {
    longPressFired = true
    openRepeat(cell, pressStart.x, pressStart.y)
  }, LONG_PRESS_MS)
}

function onTouchMove(e: TouchEvent) {
  if (!pressTimer) return
  const t = e.touches[0]
  if (!t) return
  if (
    Math.abs(t.clientX - pressStart.x) > MOVE_TOLERANCE ||
    Math.abs(t.clientY - pressStart.y) > MOVE_TOLERANCE
  ) {
    clearPress() // палец поехал — это скролл, а не удержание
  }
}

function onTouchEnd() {
  clearPress()
}

onUnmounted(clearPress)

// Колонки тянутся под контейнер (minmax(0,1fr)) — сетка не выходит за экран
// ни на 7 днях (десктоп), ни на 4 (мобильный). Первая колонка — шкала часов.
const gridStyle = computed(() => ({
  gridTemplateColumns: `${props.large ? '5.25rem' : '3rem'} repeat(${props.week.days.length || 7}, minmax(0, 1fr))`,
}))

const BOOKING_STATE_LABEL: Record<string, string> = {
  awaiting_payment: 'Ожидает оплаты',
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  paid: 'Оплачено',
  completed: 'Завершено',
  cancelled: 'Отменено',
}

function priceFull(v: number): string {
  return `${Math.round(v)}₸`
}

function priceShort(v: number): string {
  return `${Math.round(v / 1000)}K`
}

function onCell(cell: Slot) {
  // После долгого нажатия браузер шлёт click — гасим его, чтобы не переключить слот.
  if (longPressFired) {
    longPressFired = false
    return
  }
  // Производные вхождения повтора неизменяемы — клик игнорируем.
  if (repeatStates.value[cell.id] === 'occurrence' && !store.isSelected(cell.id)) return
  if (cell.status === 'available' || store.isSelected(cell.id)) store.toggleSlot(cell)
}

// ── Тултип занятого слота (следует за курсором) ──
const hoverBooking = ref<SlotBooking | null>(null)
const tipPos = ref({ x: 0, y: 0 })

function showBooking(booking: SlotBooking, e: MouseEvent) {
  if (!canSeeBookingDetails.value) return // клиенту чужую бронь не раскрываем
  hoverBooking.value = booking
  tipPos.value = { x: e.clientX, y: e.clientY }
}
function moveTip(e: MouseEvent) {
  tipPos.value = { x: e.clientX, y: e.clientY }
}
function hideBooking() {
  hoverBooking.value = null
}
</script>

<template>
  <!-- Ограниченная по высоте прокручиваемая область — строка с датами `sticky top-0`
       остаётся видимой при вертикальном скролле таблицы. `fill` растягивает сетку
       под родителя (модалка), иначе ограничиваем высоту вьюпортом (страница). -->
  <div
    class="relative overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800"
    :class="fill ? 'h-full' : 'max-h-[70vh]'"
  >
    <div
      v-if="loading"
      class="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-gray-900/70"
    >
      <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
      <span class="sr-only">Загрузка расписания…</span>
    </div>

    <div class="grid text-center" :style="gridStyle">
      <!-- Header row -->
      <div
        class="sticky left-0 top-0 z-20 border-b border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      />
      <div
        v-for="d in week.days"
        :key="d.iso"
        class="sticky top-0 z-10 border-b border-gray-200 bg-white px-1 py-2 dark:border-gray-800 dark:bg-gray-900"
      >
        <div
          class="uppercase text-gray-500"
          :class="large ? 'text-[11px] sm:text-base' : 'text-[8px] sm:text-[11px]'"
        >
          {{ d.label.weekday }}
        </div>
        <div
          class="font-bold leading-none text-gray-900 dark:text-white/90"
          :class="large ? 'text-lg sm:text-2xl' : 'text-[11px] sm:text-base'"
        >
          {{ d.label.day }}
        </div>
      </div>

      <!-- Hour rows -->
      <template v-for="row in week.rows" :key="row.startMin">
        <div
          class="sticky left-0 z-10 flex items-center justify-center border-b border-r border-gray-200 bg-white font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900"
          :class="large ? 'text-[13px] sm:text-lg' : 'text-[9px] sm:text-xs'"
        >
          {{ row.label }}
        </div>
        <button
          v-for="(cell, ci) in row.cells"
          :key="cell.id"
          type="button"
          :aria-disabled="
            (cell.status !== 'available' && !store.isSelected(cell.id)) ||
            repeatStates[cell.id] === 'occurrence'
          "
          :aria-pressed="store.isSelected(cell.id)"
          :aria-label="`${week.days[ci].label.weekday} ${week.days[ci].label.day}, ${row.label} — ${
            cell.status === 'booked'
              ? `занято${
                  canSeeBookingDetails && cell.booking?.phone ? `: ${cell.booking.phone}` : ''
                }`
              : repeatStates[cell.id] === 'occurrence'
                ? 'повтор'
                : hideSlotPrices
                  ? 'доступно'
                  : formatPrice(cell.price)
          }`"
          class="sched-cell select-none border-b border-r border-gray-100 leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-600 dark:border-gray-800"
          :class="[
            large ? 'h-14 text-sm sm:text-xl' : 'h-11 text-[8px] sm:text-[11px]',
            store.isSelected(cell.id)
              ? 'bg-success-600 font-semibold text-white'
              : cell.status === 'booked'
                ? `${
                    canSeeBookingDetails ? 'cursor-help' : 'cursor-not-allowed'
                  } bg-gray-100 font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500`
                : repeatStates[cell.id] === 'occurrence'
                  ? 'repeat-occ cursor-not-allowed font-semibold text-success-700 dark:text-success-300'
                  : cell.status === 'available'
                    ? 'bg-white text-gray-600 hover:bg-success-50 hover:text-success-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-success-600/10'
                    : 'cursor-not-allowed bg-gray-50 text-transparent dark:bg-gray-900/50',
          ]"
          @click="onCell(cell)"
          @contextmenu="onContext(cell, $event)"
          @touchstart="onTouchStart(cell, $event)"
          @touchmove="onTouchMove($event)"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
          @mouseenter="cell.booking && showBooking(cell.booking, $event)"
          @mousemove="cell.booking && moveTip($event)"
          @mouseleave="hideBooking"
        >
          <Repeat
            v-if="repeatStates[cell.id] === 'source' && store.isSelected(cell.id)"
            class="mx-auto"
            :class="large ? 'h-6 w-6' : 'h-4 w-4'"
            aria-hidden="true"
          />
          <Check
            v-else-if="store.isSelected(cell.id)"
            class="mx-auto"
            :class="large ? 'h-6 w-6' : 'h-4 w-4'"
            aria-hidden="true"
          />
          <Repeat
            v-else-if="repeatStates[cell.id] === 'occurrence'"
            class="mx-auto opacity-80"
            :class="large ? 'h-5 w-5' : 'h-3.5 w-3.5'"
            aria-hidden="true"
          />
          <span
            v-else-if="cell.status === 'available' && !hideSlotPrices"
            class="font-semibold tracking-normal"
            :class="large ? 'text-[11px] sm:text-base' : 'text-[7px] sm:text-[10px]'"
          >
            <span class="sm:hidden">{{ priceShort(cell.price) }}</span>
            <span class="hidden sm:inline">{{ priceFull(cell.price) }}</span>
          </span>
          <span
            v-else-if="cell.status === 'booked'"
            class="block truncate px-1 font-medium"
            :class="large ? 'text-[11px] sm:text-base' : 'text-[7px] sm:text-[10px]'"
            >{{ BOOKED_LABEL
            }}</span
          >
        </button>
      </template>
    </div>
  </div>

  <!-- Booking tooltip -->
  <Teleport to="body">
    <div
      v-if="hoverBooking"
      class="pointer-events-none fixed z-[999] w-60 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl dark:border-gray-700 dark:bg-gray-900"
      :style="{ left: `${tipPos.x + 14}px`, top: `${tipPos.y + 14}px` }"
    >
      <p class="text-sm font-semibold text-gray-900 dark:text-white/90">
        {{ hoverBooking.phone || 'Занято' }}
      </p>
      <p class="text-xs text-gray-500">{{ hoverBooking.phone }}</p>

      <dl class="mt-2 space-y-1 text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Время</dt>
          <dd class="text-gray-700 dark:text-gray-300">
            {{ hoverBooking.start }}–{{ hoverBooking.end }}
          </dd>
        </div>
        <div v-if="hoverBooking.total != null" class="flex justify-between gap-4">
          <dt class="text-gray-500">Сумма</dt>
          <dd class="text-gray-700 dark:text-gray-300">{{ formatPrice(hoverBooking.total) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Статус</dt>
          <dd class="text-gray-700 dark:text-gray-300">
            {{ BOOKING_STATE_LABEL[hoverBooking.state] ?? hoverBooking.state }}
          </dd>
        </div>
      </dl>

      <p
        v-if="hoverBooking.notes"
        class="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-800"
      >
        {{ hoverBooking.notes }}
      </p>
    </div>
  </Teleport>

  <RepeatModal
    v-if="allowRepeat"
    :open="repeatOpen"
    :interval="repeatInterval"
    :anchor="repeatAnchor"
    @close="repeatOpen = false"
  />
</template>

<style scoped>
/* Долгое нажатие на мобильных не должно вызывать системное меню/выделение текста. */
.sched-cell {
  -webkit-touch-callout: none;
}

/* Неизменяемое производное вхождение повтора — диагональная зелёная штриховка. */
.repeat-occ {
  background-image: repeating-linear-gradient(
    45deg,
    color-mix(in srgb, var(--color-success-500) 24%, transparent),
    color-mix(in srgb, var(--color-success-500) 24%, transparent) 6px,
    color-mix(in srgb, var(--color-success-500) 9%, transparent) 6px,
    color-mix(in srgb, var(--color-success-500) 9%, transparent) 12px
  );
}
</style>
