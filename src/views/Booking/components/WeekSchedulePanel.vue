<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Field } from '@/types'
import { getManagerWeek, toISO, formatPrice, type WeekSlots } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import { useMediaQuery } from '@/composables/useMediaQuery'
import WeekGrid from './WeekGrid.vue'

const props = defineProps<{ field: Field; large?: boolean; hideBookingDetails?: boolean }>()

const store = useBookingStore()

const week = ref<WeekSlots>({ days: [], rows: [] })
const loading = ref(false)
const pageOffset = ref(0)

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

onMounted(loadWeek)

// Переход десктоп ↔ мобильный меняет размер страницы — перезагружаем с начала.
watch(dayCount, () => {
  pageOffset.value = 0
  loadWeek()
})
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm">
    <div
      class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4"
    >
      <div class="min-w-0 flex-1">
        <h3 class="text-base font-bold text-gray-900 sm:text-lg">Расписание</h3>
        <p class="mt-0.5 truncate text-sm text-gray-500">{{ field.name }}</p>
      </div>
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
    </div>

    <div class="p-3 sm:p-4">
      <WeekGrid
        :week="week"
        :loading="loading"
        :large="large"
        :hide-booking-details="hideBookingDetails"
      />
    </div>

    <div
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-gray-200 px-4 py-3 sm:px-5 sm:py-4"
    >
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
  </div>
</template>
