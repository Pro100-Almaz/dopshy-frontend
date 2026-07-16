<template>
  <div
    role="tablist"
    aria-label="Выбор направления"
    class="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      @click="$emit('update:modelValue', tab.value)"
      :class="[
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-800',
        modelValue === tab.value
          ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-700 dark:text-white'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
      ]"
    >
      <component :is="tab.icon" :size="16" :stroke-width="2" />
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  modelValue: string
  tabs: { value: string; label: string; icon: Component }[]
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
