<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Расписание на сегодня</h3>
      <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ slots.length }} слотов</span>
    </div>
    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="slot in slots" :key="slot.id" class="flex items-start gap-4 px-6 py-3.5">
        <div class="w-28 shrink-0">
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ slot.time }}</span>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ slot.field }}</p>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{{ slot.title }}</p>
          <div class="mt-1 flex items-center gap-2">
            <span :class="typeBadge(slot.type)" class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
              {{ slot.type === 'booking' ? 'Бронь' : 'Занятие' }}
            </span>
          </div>
        </div>
        <span :class="statusClasses(slot.status)" class="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {{ statusLabel(slot.status) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScheduleSlot } from '@/types'

defineProps<{ slots: ScheduleSlot[] }>()

function typeBadge(type: string) {
  return type === 'booking'
    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
    : 'bg-[#10B981]/10 text-[#10B981]'
}

function statusClasses(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-[#10B981]/10 text-[#10B981]',
    in_progress: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  }
  return map[status] || ''
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    confirmed: 'Подтверждён',
    in_progress: 'Идёт',
    completed: 'Завершён',
    cancelled: 'Отменён',
  }
  return map[status] || status
}
</script>
