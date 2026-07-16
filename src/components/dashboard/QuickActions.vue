<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <h3 class="mb-4 text-base font-semibold text-gray-900 dark:text-white">Быстрые действия</h3>
    <div class="grid grid-cols-2 gap-3">
      <!-- Активное действие: новое бронирование -->
      <router-link
        to="/field-slots"
        class="flex flex-col items-center gap-2.5 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-4 text-center transition-all duration-150 hover:border-[#10B981]/50 hover:bg-[#10B981]/10"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981] text-white">
          <CalendarPlus :size="20" />
        </div>
        <span class="text-xs font-semibold text-[#10B981]">Новое бронирование</span>
      </router-link>

      <!-- Недоступные действия -->
      <button
        v-for="action in disabledActions"
        :key="action.label"
        disabled
        class="flex cursor-not-allowed flex-col items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center opacity-60 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
          <component :is="action.icon" :size="20" />
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
