<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Field } from '@/types'
import { getManagerWeek, toISO, formatPrice, type WeekSlots } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import { useMediaQuery } from '@/composables/useMediaQuery'
import WeekGrid from './WeekGrid.vue'

const props = defineProps<{ field: Field; open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useBookingStore()

const dialog = ref<HTMLDialogElement | null>(null)
const week = ref<WeekSlots>({ days: [], rows: [] })
const loading = ref(false)
const pageOffset = ref(0) // 0 = текущая страница

// Десктоп (lg+) — неделя целиком; мобильный — 4 дня, чтобы сетка влезала в экран.
const isDesktop = useMediaQuery('(min-width: 1024px)')
const dayCount = computed(() => (isDesktop.value ? 7 : 4))

// Горизонт бронирования — ~4 недели вперёд, независимо от размера страницы.
const HORIZON_DAYS = 28
const maxOffset = computed(() => Math.floor(HORIZON_DAYS / dayCount.value))

function startISO(offset: number): string {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offset * dayCount.value)
  return toISO(base)
}

async function loadWeek() {
  loading.value = true
  try {
    week.value = await getManagerWeek(
      props.field,
      startISO(pageOffset.value),
      new Date(),
      dayCount.value,
    )
  } finally {
    loading.value = false
  }
}

const rangeLabel = computed(() => {
  const d = week.value.days
  if (!d.length) return ''
  const a = d[0].label
  const b = d[d.length - 1].label
  return a.month === b.month
    ? `${a.day}–${b.day} ${a.month}`
    : `${a.day} ${a.month} – ${b.day} ${b.month}`
})

function prevWeek() {
  if (pageOffset.value <= 0) return
  pageOffset.value--
  loadWeek()
}
function nextWeek() {
  if (pageOffset.value >= maxOffset.value) return
  pageOffset.value++
  loadWeek()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      pageOffset.value = 0
      loadWeek()
      dialog.value?.showModal()
    } else {
      dialog.value?.close()
    }
  },
)

// Переход десктоп ↔ мобильный меняет размер страницы — перезагружаем с начала.
watch(dayCount, () => {
  if (!props.open) return
  pageOffset.value = 0
  loadWeek()
})

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
      <div
        class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4"
      >
        <div class="min-w-0 flex-1">
          <h2 id="week-title" class="text-base font-bold text-gray-900 sm:text-lg">
            Расписание
          </h2>
          <p class="mt-0.5 truncate text-sm text-gray-500">{{ field.name }}</p>
        </div>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <div class="flex items-center gap-0.5 rounded-full border border-gray-200 p-0.5 sm:gap-1">
            <button
              type="button"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              :disabled="pageOffset <= 0"
              aria-label="Раньше"
              @click="prevWeek"
            >
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              class="min-w-[5rem] text-center text-xs font-semibold text-gray-700 sm:min-w-[6.5rem] sm:text-sm"
              >{{ rangeLabel }}</span
            >
            <button
              type="button"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
              :disabled="pageOffset >= maxOffset"
              aria-label="Позже"
              @click="nextWeek"
            >
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Закрыть"
            @click="emit('close')"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Body (общий компонент с админской стороной).
           min-h-0 позволяет сетке занять оставшуюся высоту и прокручиваться
           внутри себя — строка с датами остаётся закреплённой сверху. -->
      <div class="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <WeekGrid :week="week" :loading="loading" fill />
      </div>

      <!-- Footer -->
      <div
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-gray-200 px-4 py-3 sm:px-5 sm:py-4"
      >
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
