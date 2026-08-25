<script setup lang="ts">
import type { Slot } from '@/types'
import { formatPrice } from '@/services/booking'

defineProps<{
  slots: Slot[]
  selectedIds: string[]
}>()

const emit = defineEmits<{ toggle: [slot: Slot] }>()
</script>

<template>
  <div>
    <!-- Legend -->
    <div class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm border border-gray-300 bg-white" /> Свободно
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-success-600" /> Выбрано
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-gray-100" /> Занято
      </span>
    </div>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-1 lg:grid-cols-3">
      <div v-for="i in 3" :key="i">
        <button
          v-for="slot in slots"
          :key="slot.id"
          type="button"
          :disabled="slot.status !== 'available' && !selectedIds.includes(slot.id)"
          :aria-pressed="selectedIds.includes(slot.id)"
          class="mb-2 w-full flex flex-col items-center justify-center rounded-md border px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600"
          :class="
            selectedIds.includes(slot.id)
              ? 'border-success-600 bg-success-600 text-white'
              : slot.status === 'available'
                ? 'border-gray-300 bg-white text-gray-700 hover:border-success-400'
                : 'cursor-not-allowed border-transparent bg-gray-100 text-gray-400'
          "
          @click="emit('toggle', slot)"
        >
          <span
            class="font-bebas text-lg leading-none tracking-wide"
            :class="{ 'line-through': slot.status === 'booked' }"
            >{{ slot.start }}</span
          >
          <span
            class="mt-1 text-sm font-semibold leading-none tracking-normal"
            :class="selectedIds.includes(slot.id) ? 'text-white/80' : 'text-gray-500'"
          >
            {{ slot.status === 'booked' ? 'занято' : formatPrice(slot.price) }}
          </span>
        </button>
      </div>
    </div>

    <div class="grid gap-2.5 sm:grid-cols-1 lg:grid-cols-1">

    </div>
  </div>
</template>
