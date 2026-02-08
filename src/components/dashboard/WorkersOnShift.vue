<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Сотрудники на смене</h3>
      <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ workers.length }} на месте</span>
    </div>
    <div class="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2 lg:grid-cols-4 dark:bg-gray-800">
      <div v-for="w in workers" :key="w.id" class="flex items-center gap-3 bg-white px-5 py-4 dark:bg-gray-900">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {{ initials(w.name) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ w.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ w.role }}</p>
        </div>
        <span
          :class="['h-2.5 w-2.5 shrink-0 rounded-full', statusDot(w.status)]"
          :title="statusTitle(w.status)"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Worker } from '@/types'

defineProps<{ workers: Worker[] }>()

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function statusDot(status: string) {
  if (status === 'active') return 'bg-[#10B981]'
  if (status === 'break') return 'bg-amber-400'
  return 'bg-gray-300 dark:bg-gray-600'
}

function statusTitle(status: string) {
  const map: Record<string, string> = { active: 'На месте', break: 'Перерыв', off: 'Не на смене' }
  return map[status] || status
}
</script>
