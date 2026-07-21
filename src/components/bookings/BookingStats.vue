<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { CalendarCheck, CalendarRange, CalendarDays } from 'lucide-vue-next'

import type { Booking, BookingPeriod } from '@/types'
import { isBookingInPeriod, formatPrice } from '@/services/booking'

const props = defineProps<{
  bookings: Booking[]
  modelValue: BookingPeriod
}>()

const emit = defineEmits<{ 'update:modelValue': [period: BookingPeriod] }>()

const PERIODS: { key: BookingPeriod; label: string; icon: Component; iconBg: string }[] = [
  { key: 'today', label: 'Сегодня', icon: CalendarCheck, iconBg: 'bg-success-50 text-success-600 dark:bg-success-500/15' },
  { key: 'week', label: 'На этой неделе', icon: CalendarRange, iconBg: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15' },
  { key: 'month', label: 'В этом месяце', icon: CalendarDays, iconBg: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15' },
  { key: 'all_time', label: 'За все время', icon: CalendarDays, iconBg: 'bg-error-50 text-error-600 dark:bg-error-500/15' },
]

const stats = computed(() => {
  const result = {} as Record<BookingPeriod, { count: number; revenue: number }>
  for (const p of PERIODS) {
    // Карточки-сводки учитывают только подтверждённые брони — и в счётчике, и в сумме.
    const items = props.bookings.filter(
      (b) => isBookingInPeriod(b, p.key) && (b.state === 'confirmed' || b.state === 'paid'),
    )
    result[p.key] = {
      count: items.length,
      revenue: items.reduce((sum, b) => sum + b.total, 0),
    }
  }
  return result
})
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
    <button
      v-for="p in PERIODS"
      :key="p.key"
      type="button"
      class="rounded-2xl border bg-white p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600 dark:bg-gray-900"
      :class="
        p.key === modelValue
          ? 'border-success-600 ring-1 ring-success-600'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
      "
      :aria-pressed="p.key === modelValue"
      @click="emit('update:modelValue', p.key)"
    >
      <div class="flex items-center justify-between">
        <div :class="p.iconBg" class="flex h-11 w-11 items-center justify-center rounded-xl">
          <component :is="p.icon" :size="20" class="text-current" />
        </div>
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
          {{ formatPrice(stats[p.key].revenue) }}
        </span>
      </div>

      <div class="mt-4">
        <h4 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ stats[p.key].count }}
        </h4>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ p.label }} подтверждено</p>
      </div>
    </button>
  </div>
</template>
