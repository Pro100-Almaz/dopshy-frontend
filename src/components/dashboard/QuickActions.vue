<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <h3 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Быстрые действия</h3>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="action in actions"
        :key="action.label"
        class="flex flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center transition-all duration-150 hover:border-[#10B981]/30 hover:bg-[#10B981]/5 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-[#10B981]/30 dark:hover:bg-[#10B981]/5"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
          <component :is="action.icon" :size="20" />
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
