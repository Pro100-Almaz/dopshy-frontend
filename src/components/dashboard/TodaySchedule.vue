<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">Расписание на сегодня</h3>
      <span
        class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
      >
        {{ slots.length }} слотов
      </span>
    </div>

    <div v-if="slots.length" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="slot in slots" :key="slot.id" class="flex items-start gap-4 px-6 py-3.5">
        <div class="w-28 shrink-0">
          <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ slot.time }}</span>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ slot.field }}</p>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{{ slot.title }}</p>
          <div class="mt-1.5 flex items-center gap-2">
            <span :class="typeBadge(slot.type)" class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {{ slot.type === 'booking' ? 'Бронь' : 'Занятие' }}
            </span>
          </div>
        </div>
        <span :class="statusClasses(slot.status)" class="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {{ statusLabel(slot.status) }}
        </span>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">
        <CalendarX2 :size="22" :stroke-width="1.75" />
      </div>
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Слотов на сегодня нет</p>
      <p class="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
        Новые бронирования и занятия появятся здесь по мере их создания.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarX2 } from 'lucide-vue-next'
import type { ScheduleSlot } from '@/types'

defineProps<{ slots: ScheduleSlot[] }>()

function typeBadge(type: string) {
  return type === 'booking'
    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400'
    : 'bg-success-50 text-success-700 dark:bg-success-500/[0.12] dark:text-success-400'
}

function statusClasses(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-success-50 text-success-700 dark:bg-success-500/[0.12] dark:text-success-400',
    in_progress: 'bg-warning-50 text-warning-700 dark:bg-warning-500/[0.12] dark:text-warning-400',
    completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-error-50 text-error-600 dark:bg-error-500/[0.12] dark:text-error-400',
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
