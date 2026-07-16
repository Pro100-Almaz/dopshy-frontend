<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <h3 class="mb-4 text-lg font-bold text-gray-900 dark:text-white">Быстрые действия</h3>
    <div class="grid grid-cols-2 gap-3">
      <!-- Активное действие: новое бронирование -->
      <router-link
        to="/field-slots"
        class="group flex flex-col items-center gap-2.5 rounded-xl border border-success-300 bg-success-50 p-4 text-center transition-colors duration-150 hover:border-success-400 hover:bg-success-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-success-500/40 dark:bg-success-500/[0.08] dark:hover:bg-success-500/15 dark:focus-visible:ring-offset-gray-900"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-success-600 text-white">
          <CalendarPlus :size="20" :stroke-width="1.75" />
        </div>
        <span class="text-xs font-semibold text-success-700 dark:text-success-400">Новое бронирование</span>
      </router-link>

      <!-- Недоступные действия -->
      <button
        v-for="action in disabledActions"
        :key="action.label"
        type="button"
        disabled
        class="flex cursor-not-allowed flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center opacity-60 dark:border-gray-800 dark:bg-gray-800/60"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
          <component :is="action.icon" :size="20" :stroke-width="1.75" />
        </div>
        <span class="text-xs font-semibold text-gray-400 dark:text-gray-500">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarPlus, BookPlus, Wallet, UserPlus } from 'lucide-vue-next'

const disabledActions = [
  { label: 'Добавить занятие', icon: BookPlus },
  { label: 'Принять платёж', icon: Wallet },
  { label: 'Назначить смену', icon: UserPlus },
]
</script>
