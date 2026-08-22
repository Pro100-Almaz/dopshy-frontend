<script setup lang="ts">
/**
 * Ребёнок в строке списка: инициалы, имя, возраст и дата рождения.
 * Одинаковый вид в пробных, учениках и составе группы — иначе один и тот же
 * человек выглядит по-разному на трёх экранах.
 */
import { computed } from 'vue'

import { formatDate, initials } from '@/services/academy'
import { pluralize } from '@/utils/plural'

const props = withDefaults(
  defineProps<{
    name: string
    age?: number | null
    birthdate?: string
    /** Дополнительная строка вместо возраста — например, группа. */
    meta?: string
  }>(),
  { age: null, birthdate: '', meta: '' },
)

const ageLabel = computed(() =>
  props.age === null || props.age === undefined
    ? ''
    : pluralize(props.age, 'год', 'года', 'лет'),
)

const secondary = computed(() => {
  if (props.meta) return props.meta
  const parts = [ageLabel.value]
  const birth = props.birthdate ? formatDate(props.birthdate) : ''
  if (birth && birth !== '—') parts.push(birth)
  return parts.filter(Boolean).join(' · ')
})
</script>

<template>
  <div class="flex items-start gap-3">
    <span
      class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pitch-50 text-theme-xs font-bold text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300"
      aria-hidden="true"
    >
      {{ initials(name) || '—' }}
    </span>
    <span class="min-w-0">
      <span class="block truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
        {{ name || 'Без имени' }}
      </span>
      <span v-if="secondary" class="mt-0.5 block text-theme-xs text-gray-600 dark:text-gray-400">
        {{ secondary }}
      </span>
    </span>
  </div>
</template>
