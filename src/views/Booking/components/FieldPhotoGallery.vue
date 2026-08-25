<script setup lang="ts">
import { Home, Sun } from 'lucide-vue-next'
import type { Field } from '@/types'
import { FIELD_TYPE_LABEL } from '@/services/booking'

defineProps<{
  field: Field
  activePhoto: number
}>()

const emit = defineEmits<{ 'update:activePhoto': [value: number] }>()
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm">
    <div class="relative aspect-[16/10] bg-gray-100">
      <img
        v-if="field.photos[activePhoto]"
        :src="field.photos[activePhoto]"
        :alt="`${field.name} — ${field.surface}`"
        class="h-full w-full object-cover"
      />
      <div v-else class="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
      <div class="absolute left-4 top-4 flex gap-2">
        <span
          class="rounded-full bg-success-600 px-3 py-1 text-xs font-bold leading-none text-white"
        >
          {{ FIELD_TYPE_LABEL[field.type] }}
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm"
        >
          <component :is="field.indoor ? Sun : Home" class="h-3.5 w-3.5" aria-hidden="true" />
          Крытое
        </span>
      </div>
    </div>
  </div>
</template>
