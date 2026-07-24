<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">Расписание на сегодня</h3>
      <span
        class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
      >
        {{ bookings.length }} броней
      </span>
    </div>

    <div v-if="bookings.length" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="b in bookings" :key="b.id" class="flex items-start gap-4 px-6 py-3.5">
        <div class="w-28 shrink-0">
          <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {{ b.start }} – {{ b.end }}
          </span>
          <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ b.fieldName }}</p>
        </div>
        <p class="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ b.customerName || '—' }}
        </p>
        <span
          :class="bookingStateClass(b.state)"
          class="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        >
          {{ bookingStateLabel(b.state) }}
        </span>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">
        <CalendarX2 :size="22" :stroke-width="1.75" />
      </div>
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">На сегодня броней нет</p>
      <p class="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
        Новые бронирования появятся здесь по мере их создания.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarX2 } from 'lucide-vue-next'
import type { Booking } from '@/types'
import { bookingStateClass, bookingStateLabel } from '@/services/booking'

defineProps<{ bookings: Booking[] }>()
</script>
