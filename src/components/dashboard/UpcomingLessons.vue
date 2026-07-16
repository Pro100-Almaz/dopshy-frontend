<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">Ближайшие занятия</h3>
      <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Сегодня</span>
    </div>

    <div v-if="lessons.length" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="lesson in lessons" :key="lesson.id" class="flex items-center gap-4 px-6 py-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success-50 text-sm font-bold tabular-nums text-success-700 dark:bg-success-500/[0.12] dark:text-success-400"
        >
          {{ lesson.time }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ lesson.title }}</p>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ lesson.coach }} &middot; {{ lesson.field }}</p>
        </div>
        <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Users :size="14" :stroke-width="1.75" />
          <span class="text-sm font-medium tabular-nums">{{ lesson.students }}</span>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">
        <GraduationCap :size="22" :stroke-width="1.75" />
      </div>
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Занятий не запланировано</p>
      <p class="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
        Расписание тренировок на сегодня появится здесь.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users, GraduationCap } from 'lucide-vue-next'
import type { Lesson } from '@/types'

defineProps<{ lessons: Lesson[] }>()
</script>
