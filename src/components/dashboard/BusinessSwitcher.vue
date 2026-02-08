<template>
  <div class="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      @click="$emit('update:modelValue', tab.value)"
      :class="[
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
        modelValue === tab.value
          ? 'bg-white text-[#0F172A] shadow-theme-xs dark:bg-gray-700 dark:text-white'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
      ]"
    >
      <component :is="tab.icon" :size="16" />
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
