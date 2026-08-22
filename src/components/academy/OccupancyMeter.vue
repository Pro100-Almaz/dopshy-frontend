<script setup lang="ts">
/**
 * Заполненность группы. Оператору важно не «сколько записано», а «сколько
 * осталось мест» — по этому и раскрашено: зелёная полоса, пока место есть,
 * янтарная, когда группа набрана.
 */
import { computed } from 'vue'

import { pluralize } from '@/utils/plural'

const props = withDefaults(
  defineProps<{
    current: number | null
    max: number | null
    /** Показывать подпись «3 из 12 · 9 мест» рядом с полосой. */
    caption?: boolean
    size?: 'sm' | 'md'
  }>(),
  { caption: true, size: 'md' },
)

const current = computed(() => Math.max(0, props.current ?? 0))
const hasLimit = computed(() => typeof props.max === 'number' && props.max > 0)
const ratio = computed(() =>
  hasLimit.value ? Math.min(1, current.value / (props.max as number)) : 0,
)
const free = computed(() => (hasLimit.value ? Math.max(0, (props.max as number) - current.value) : null))
const isFull = computed(() => hasLimit.value && free.value === 0)

const freeLabel = computed(() => {
  if (!hasLimit.value) return 'без лимита'
  if (free.value === 0) return 'мест нет'
  return pluralize(free.value as number, 'место', 'места', 'мест')
})
</script>

<template>
  <div class="min-w-0">
    <div
      class="w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
      :class="size === 'sm' ? 'h-1' : 'h-1.5'"
      role="img"
      :aria-label="
        hasLimit
          ? `Записано ${current} из ${max}, свободно ${freeLabel}`
          : `Записано ${current}, лимит не задан`
      "
    >
      <div
        class="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
        :class="isFull ? 'bg-warning-500' : 'bg-pitch-500'"
        :style="{ width: `${hasLimit ? Math.max(ratio * 100, current > 0 ? 4 : 0) : 0}%` }"
      ></div>
    </div>

    <p
      v-if="caption"
      class="mt-1.5 flex items-center gap-1.5 text-theme-xs tabular-nums text-gray-600 dark:text-gray-400"
    >
      <span class="font-semibold text-gray-900 dark:text-white">{{ current }}</span>
      <span v-if="hasLimit">из {{ max }}</span>
      <span aria-hidden="true">·</span>
      <span :class="isFull ? 'font-medium text-warning-700 dark:text-warning-400' : ''">
        {{ freeLabel }}
      </span>
    </p>
  </div>
</template>
