<script setup lang="ts">
import { ref } from 'vue'
import { Loader2, Check } from 'lucide-vue-next'
import type { Slot, SlotBooking } from '@/types'
import { formatPrice, type WeekSlots } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'

defineProps<{ week: WeekSlots; loading?: boolean }>()

const store = useBookingStore()

const gridStyle = { gridTemplateColumns: '3.5rem repeat(7, minmax(4.75rem, 1fr))' }

const BOOKING_STATE_LABEL: Record<string, string> = {
  awaiting_payment: 'Ожидает оплаты',
  pending: 'Ожидает',
  confirmed: 'Подтверждено',
  paid: 'Оплачено',
  completed: 'Завершено',
  cancelled: 'Отменено',
}

function priceShort(v: number): string {
  return `${Math.round(v / 1000)}к`
}

function onCell(cell: Slot) {
  if (cell.status === 'available' || store.isSelected(cell.id)) store.toggleSlot(cell)
}

// ── Тултип занятого слота (следует за курсором) ──
const hoverBooking = ref<SlotBooking | null>(null)
const tipPos = ref({ x: 0, y: 0 })

function showBooking(booking: SlotBooking, e: MouseEvent) {
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
  <div class="relative overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800">
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
        <div class="text-[11px] uppercase text-gray-500">{{ d.label.weekday }}</div>
        <div class="text-base font-bold leading-none text-gray-900 dark:text-white/90">
          {{ d.label.day }}
        </div>
      </div>

      <!-- Hour rows -->
      <template v-for="row in week.rows" :key="row.startMin">
        <div
          class="sticky left-0 z-10 flex items-center justify-center border-b border-r border-gray-200 bg-white text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900"
        >
          {{ row.label }}
        </div>
        <button
          v-for="(cell, ci) in row.cells"
          :key="cell.id"
          type="button"
          :aria-disabled="cell.status !== 'available' && !store.isSelected(cell.id)"
          :aria-pressed="store.isSelected(cell.id)"
          :aria-label="`${week.days[ci].label.weekday} ${week.days[ci].label.day}, ${row.label} — ${
            cell.status === 'booked'
              ? `занято${cell.booking ? `, ${cell.booking.customerName}` : ''}`
              : formatPrice(cell.price)
          }`"
          class="h-11 border-b border-r border-gray-100 text-[11px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-600 dark:border-gray-800"
          :class="
            store.isSelected(cell.id)
              ? 'bg-success-600 font-semibold text-white'
              : cell.status === 'available'
                ? 'bg-white text-gray-600 hover:bg-success-50 hover:text-success-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-success-600/10'
                : cell.status === 'booked'
                  ? 'cursor-help bg-gray-100 font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  : 'cursor-not-allowed bg-gray-50 text-transparent dark:bg-gray-900/50'
          "
          @click="onCell(cell)"
          @mouseenter="cell.booking && showBooking(cell.booking, $event)"
          @mousemove="cell.booking && moveTip($event)"
          @mouseleave="hideBooking"
        >
          <Check v-if="store.isSelected(cell.id)" class="mx-auto h-4 w-4" aria-hidden="true" />
          <span v-else-if="cell.status === 'available'">{{ priceShort(cell.price) }}</span>
          <span v-else-if="cell.status === 'booked'" class="text-[10px] uppercase tracking-wide"
            >занято</span
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
        {{ hoverBooking.customerName }}
      </p>
      <p class="text-xs text-gray-500">{{ hoverBooking.phone }}</p>

      <dl class="mt-2 space-y-1 text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-gray-500">Время</dt>
          <dd class="text-gray-700 dark:text-gray-300">
            {{ hoverBooking.start }}–{{ hoverBooking.end }}
          </dd>
        </div>
        <div class="flex justify-between gap-4">
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
</template>
