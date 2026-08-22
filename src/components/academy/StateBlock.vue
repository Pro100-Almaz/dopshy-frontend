<script setup lang="ts">
/**
 * Загрузка / ошибка / пустота для списков академии.
 *
 * Раньше каждая страница повторяла три почти одинаковых блока, и все три
 * показывали крутилку в центре таблицы. Здесь скелетон повторяет форму
 * будущего контента (product-регистр: skeleton, а не spinner), ошибка даёт
 * кнопку повтора, а пустое состояние объясняет, откуда берутся данные.
 */
import { RefreshCw } from 'lucide-vue-next'
import { buttonSecondary, buttonSize } from './ui'

withDefaults(
  defineProps<{
    state: 'loading' | 'error' | 'empty' | 'ready'
    error?: string
    /** Сколько строк-заглушек рисовать при загрузке. */
    rows?: number
    /** Заголовок пустого состояния. */
    emptyTitle?: string
    /** Пояснение: что сделать или откуда придут данные. */
    emptyHint?: string
  }>(),
  { rows: 5, error: '', emptyTitle: 'Пока ничего нет', emptyHint: '' },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="state === 'loading'" class="px-5 py-4 sm:px-6" aria-busy="true">
    <span class="sr-only">Загружаем данные</span>
    <div
      v-for="row in rows"
      :key="row"
      class="flex items-center gap-4 border-b border-gray-100 py-3.5 last:border-0 dark:border-gray-800/70"
    >
      <div class="skeleton h-9 w-9 shrink-0 rounded-full"></div>
      <div class="min-w-0 flex-1 space-y-2">
        <div class="skeleton h-3.5 rounded" :style="{ width: `${38 + ((row * 13) % 26)}%` }"></div>
        <div class="skeleton h-3 rounded" :style="{ width: `${22 + ((row * 9) % 18)}%` }"></div>
      </div>
      <div class="skeleton hidden h-7 w-24 rounded-lg sm:block"></div>
    </div>
  </div>

  <div
    v-else-if="state === 'error'"
    class="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    role="alert"
  >
    <p class="max-w-md text-theme-sm text-error-700 dark:text-error-400">
      {{ error || 'Не удалось загрузить данные.' }}
    </p>
    <button type="button" :class="[buttonSecondary, buttonSize.sm]" @click="$emit('retry')">
      <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
      Повторить
    </button>
  </div>

  <div
    v-else-if="state === 'empty'"
    class="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-10 text-center"
  >
    <span
      class="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
    >
      <slot name="icon" />
    </span>
    <p class="text-theme-sm font-medium text-gray-900 dark:text-white">{{ emptyTitle }}</p>
    <p v-if="emptyHint" class="max-w-sm text-theme-xs text-gray-600 dark:text-gray-400">
      {{ emptyHint }}
    </p>
    <slot name="action" />
  </div>

  <slot v-else />
</template>
