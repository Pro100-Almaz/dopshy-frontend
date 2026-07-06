import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Field, Slot } from '@/types'

export const useBookingStore = defineStore('booking', () => {
  const field = ref<Field | null>(null)
  const date = ref('')
  const selectedSlots = ref<Slot[]>([])

  const sortedSlots = computed(() =>
    [...selectedSlots.value].sort((a, b) => a.start.localeCompare(b.start)),
  )
  const total = computed(() => selectedSlots.value.reduce((sum, s) => sum + s.price, 0))
  const count = computed(() => selectedSlots.value.length)

  // Switching field or date invalidates the current selection (slots are date-specific).
  function setContext(f: Field, d: string) {
    if (field.value?.id !== f.id || date.value !== d) {
      selectedSlots.value = []
    }
    field.value = f
    date.value = d
  }

  function toggleSlot(slot: Slot) {
    const i = selectedSlots.value.findIndex((s) => s.id === slot.id)
    if (i >= 0) selectedSlots.value.splice(i, 1)
    else selectedSlots.value.push({ ...slot })
  }

  function isSelected(id: string): boolean {
    return selectedSlots.value.some((s) => s.id === id)
  }

  function clear() {
    field.value = null
    date.value = ''
    selectedSlots.value = []
  }

  return {
    field,
    date,
    selectedSlots,
    sortedSlots,
    total,
    count,
    setContext,
    toggleSlot,
    isSelected,
    clear,
  }
})
