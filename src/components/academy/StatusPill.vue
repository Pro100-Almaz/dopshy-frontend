<script setup lang="ts">
/**
 * Статусная плашка. Один словарь тонов на все экраны академии: цвет означает
 * состояние, а не украшение (DESIGN.md: красный и янтарный — только статус).
 * Контраст каждого тона проверен на AA для мелкого текста.
 */
import { computed } from 'vue'

export type PillTone = 'pitch' | 'warning' | 'danger' | 'neutral' | 'info'

const props = withDefaults(
  defineProps<{
    tone?: PillTone
    /** Точка слева — для «живых» состояний вроде «идёт сейчас». */
    dot?: boolean
    size?: 'sm' | 'md'
  }>(),
  { tone: 'neutral', dot: false, size: 'sm' },
)

const TONES: Record<PillTone, { pill: string; dot: string }> = {
  pitch: {
    pill: 'bg-pitch-50 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300',
    dot: 'bg-pitch-500',
  },
  warning: {
    pill: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300',
    dot: 'bg-warning-500',
  },
  danger: {
    pill: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300',
    dot: 'bg-error-500',
  },
  neutral: {
    pill: 'bg-gray-100 text-gray-700 dark:bg-white/[0.07] dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  info: {
    pill: 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-300',
    dot: 'bg-blue-light-500',
  },
}

const toneClass = computed(() => TONES[props.tone])
const sizeClass = computed(() =>
  props.size === 'md' ? 'px-2.5 py-1 text-theme-sm' : 'px-2 py-0.5 text-theme-xs',
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-medium"
    :class="[toneClass.pill, sizeClass]"
  >
    <span
      v-if="dot"
      class="h-1.5 w-1.5 shrink-0 rounded-full"
      :class="toneClass.dot"
      aria-hidden="true"
    ></span>
    <slot />
  </span>
</template>
