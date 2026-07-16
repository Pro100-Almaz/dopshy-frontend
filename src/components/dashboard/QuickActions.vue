<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <h3 class="mb-4 text-lg font-bold text-gray-900 dark:text-white">Быстрые действия</h3>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="group flex flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center transition-colors duration-150 hover:border-success-300 hover:bg-success-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-success-100 dark:border-gray-800 dark:bg-gray-800/60 dark:hover:border-success-500/40 dark:hover:bg-success-500/[0.08] dark:focus-visible:ring-offset-gray-900"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-success-600 shadow-theme-xs transition-colors duration-150 group-hover:bg-success-100 dark:bg-gray-900 dark:text-success-400 dark:group-hover:bg-success-500/15"
        >
          <component :is="action.icon" :size="20" :stroke-width="1.75" />
        </div>
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarPlus, BookPlus, Wallet, UserPlus } from 'lucide-vue-next'

const actions = [
  { label: 'Новое бронирование', icon: CalendarPlus },
  { label: 'Добавить занятие', icon: BookPlus },
  { label: 'Принять платёж', icon: Wallet },
  { label: 'Назначить смену', icon: UserPlus },
]
</script>
