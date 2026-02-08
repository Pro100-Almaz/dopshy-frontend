<template>
  <div
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
  >
    <div class="flex items-center justify-between">
      <div
        :class="iconBg"
        class="flex h-11 w-11 items-center justify-center rounded-xl"
      >
        <component :is="icon" :size="20" class="text-current" />
      </div>
      <span
        v-if="badge"
        :class="[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          badgeUp
            ? 'bg-[#10B981]/10 text-[#10B981]'
            : 'bg-red-50 text-red-500 dark:bg-red-500/10',
        ]"
      >
        <svg
          v-if="badgeUp"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
          />
        </svg>
        <svg
          v-else
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m19.5 4.5-15 15m0 0h11.25M4.5 19.5V8.25"
          />
        </svg>
        {{ badge }}
      </span>
    </div>
    <div class="mt-4">
      <h4 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ formattedValue }}
      </h4>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

const props = defineProps<{
  icon: Component
  label: string
  value: number | string
  suffix?: string
  prefix?: string
  iconBg?: string
  badge?: string
  badgeUp?: boolean
}>()

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  const formatted =
    props.value >= 1000
      ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(props.value)
      : String(props.value)
  return `${props.prefix || ''}${formatted}${props.suffix || ''}`
})
</script>
