<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Field } from '@/types'
import { getManagerWeek, toISO, formatPrice, type WeekSlots } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import WeekGrid from './WeekGrid.vue'

const props = defineProps<{ field: Field; open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useBookingStore()

const dialog = ref<HTMLDialogElement | null>(null)
const week = ref<WeekSlots>({ days: [], rows: [] })
const loading = ref(false)
const weekOffset = ref(0) // 0 = текущая неделя

const MAX_WEEKS = 4

function startISO(offset: number): string {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offset * 7)
  return toISO(base)
}

async function loadWeek() {
  loading.value = true
  try {
    week.value = await getManagerWeek(props.field, startISO(weekOffset.value))
  } finally {
    loading.value = false
  }
}

const rangeLabel = computed(() => {
  const d = week.value.days
  if (d.length < 7) return ''
  const a = d[0].label
  const b = d[6].label
  return a.month === b.month
    ? `${a.day}–${b.day} ${a.month}`
    : `${a.day} ${a.month} – ${b.day} ${b.month}`
})

function prevWeek() {
  if (weekOffset.value <= 0) return
  weekOffset.value--
  loadWeek()
}
function nextWeek() {
  if (weekOffset.value >= MAX_WEEKS) return
  weekOffset.value++
  loadWeek()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      weekOffset.value = 0
      loadWeek()
      dialog.value?.showModal()
    } else {
      dialog.value?.close()
    }
  },
)

// Esc / backdrop close → keep parent state in sync
function onDialogClose() {
  if (props.open) emit('close')
}
function onBackdropClick(e: MouseEvent) {
  if (e.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="week-dialog m-auto w-[min(64rem,94vw)] max-h-[90vh] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
    aria-labelledby="week-title"
    @close="onDialogClose"
    @click="onBackdropClick"
  >
    <div class="flex max-h-[90vh] flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div class="min-w-0">
          <h2 id="week-title" class="text-lg font-bold text-gray-900">
            Расписание на неделю
          </h2>
          <p class="mt-1 truncate text-sm text-gray-500">{{ field.name }}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 rounded-full border border-gray-200 p-0.5">
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              :disabled="weekOffset <= 0"
              aria-label="Предыдущая неделя"
              @click="prevWeek"
            >
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            </button>
            <span class="min-w-[6.5rem] text-center text-sm font-semibold text-gray-700">{{ rangeLabel }}</span>
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              :disabled="weekOffset >= MAX_WEEKS"
              aria-label="Следующая неделя"
              @click="nextWeek"
            >
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Закрыть"
            @click="emit('close')"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Body (общий компонент с админской стороной) -->
      <div class="flex-1 overflow-auto p-4">
        <WeekGrid :week="week" :loading="loading" />
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">
        <div class="flex items-center gap-4">
          <div>
            <p class="text-xs text-gray-500">Выбрано {{ store.count }} · итого</p>
            <p class="text-xl font-bold text-gray-900">{{ formatPrice(store.total) }}</p>
          </div>
          <button
            v-if="store.count > 0"
            type="button"
            class="text-sm font-semibold text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
            @click="store.clearSlots"
          >
            Очистить
          </button>
        </div>
        <button
          type="button"
          :disabled="store.count === 0"
          class="rounded-full bg-success-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          @click="emit('close')"
        >
          Готово
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.week-dialog::backdrop {
  background: color-mix(in srgb, var(--color-gray-900) 55%, transparent);
  backdrop-filter: blur(2px);
}
.week-dialog[open] {
  animation: week-dialog-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes week-dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
@media (prefers-reduced-motion: reduce) {
  .week-dialog[open] {
    animation: none;
  }
}
</style>
