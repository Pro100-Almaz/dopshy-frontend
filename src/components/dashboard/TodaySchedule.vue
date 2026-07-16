<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Расписание на сегодня</h3>
      <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ bookings.length }} броней</span>
    </div>

    <div v-if="bookings.length" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="b in bookings" :key="b.id" class="flex items-center gap-4 px-6 py-3.5">
        <span class="w-28 shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
          {{ b.start }} – {{ b.end }}
        </span>
        <p class="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ b.customerName || '—' }}
        </p>
        <span
          :class="statusClasses(b.status)"
          class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
        >
          {{ statusLabel(b.status) }}
        </span>
      </div>
    </div>

    <p v-else class="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      На сегодня броней нет
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Booking, BookingStatus } from '@/types'
import { BOOKING_STATUS_LABEL } from '@/services/booking'

defineProps<{ bookings: Booking[] }>()

function statusClasses(status: BookingStatus) {
  const map: Record<BookingStatus, string> = {
    confirmed: 'bg-[#10B981]/10 text-[#10B981]',
    pending: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  }
  return map[status] || ''
}

function statusLabel(status: BookingStatus) {
  return BOOKING_STATUS_LABEL[status] || status
}
</script>
