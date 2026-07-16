<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">Сотрудники на смене</h3>
      <span
        class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
      >
        {{ activeCount }} на месте
      </span>
    </div>

    <div
      v-if="workers.length"
      class="grid grid-cols-1 gap-px overflow-hidden rounded-b-2xl bg-gray-100 sm:grid-cols-2 lg:grid-cols-4 dark:bg-gray-800"
    >
      <div v-for="w in workers" :key="w.id" class="flex items-center gap-3 bg-white px-5 py-4 dark:bg-gray-900">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {{ initials(w.name) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ w.name }}</p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ w.role }}</p>
        </div>
        <span
          :class="statusBadge(w.status)"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2 text-xs font-semibold"
        >
          <span :class="['h-1.5 w-1.5 rounded-full', statusDot(w.status)]"></span>
          {{ statusTitle(w.status) }}
        </span>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">
        <Users :size="22" :stroke-width="1.75" />
      </div>
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Никого нет на смене</p>
      <p class="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
        Отметьте сотрудников на смене, чтобы видеть их здесь.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Users } from 'lucide-vue-next'
import type { Worker } from '@/types'

const props = defineProps<{ workers: Worker[] }>()

const activeCount = computed(() => props.workers.filter((w) => w.status === 'active').length)

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function statusDot(status: string) {
  if (status === 'active') return 'bg-success-500'
  if (status === 'break') return 'bg-warning-500'
  return 'bg-gray-400 dark:bg-gray-500'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-success-50 text-success-700 dark:bg-success-500/[0.12] dark:text-success-400',
    break: 'bg-warning-50 text-warning-700 dark:bg-warning-500/[0.12] dark:text-warning-400',
    off: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[status] || map.off
}

function statusTitle(status: string) {
  const map: Record<string, string> = { active: 'На месте', break: 'Перерыв', off: 'Не на смене' }
  return map[status] || status
}
</script>
