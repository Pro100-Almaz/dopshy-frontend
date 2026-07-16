<template>
  <div
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
  >
    <div class="flex items-center justify-between">
      <div
        class="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
      >
        <component :is="icon" :size="20" :stroke-width="1.75" />
      </div>
      <span
        v-if="trend"
        :class="[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
          trendClasses,
        ]"
      >
        <TrendingUp v-if="trend.direction === 'up'" :size="13" :stroke-width="2.25" />
        <TrendingDown v-else-if="trend.direction === 'down'" :size="13" :stroke-width="2.25" />
        <AlertTriangle v-else :size="13" :stroke-width="2.25" />
        {{ trend.value }}
      </span>
    </div>
    <div class="mt-4">
      <h4 class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
        {{ formattedValue }}
      </h4>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-vue-next'

type Trend = {
  value: string
  direction: 'up' | 'down' | 'alert'
}

const props = defineProps<{
  icon: Component
  label: string
  value: number | string
  suffix?: string
  prefix?: string
  trend?: Trend
}>()

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  const formatted =
    props.value >= 1000
      ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(props.value)
      : String(props.value)
  return `${props.prefix || ''}${formatted}${props.suffix || ''}`
})

const trendClasses = computed(() => {
  switch (props.trend?.direction) {
    case 'up':
      return 'bg-success-50 text-success-700 dark:bg-success-500/[0.12] dark:text-success-400'
    case 'down':
    case 'alert':
      return 'bg-error-50 text-error-600 dark:bg-error-500/[0.12] dark:text-error-400'
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'
  }
})
</script>
