import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Field, Slot } from '@/types'
import { groupSlotsByDate } from '@/services/booking'

export const useBookingStore = defineStore('booking', () => {
  const field = ref<Field | null>(null)
  const selectedSlots = ref<Slot[]>([])

  const sortedSlots = computed(() =>
    [...selectedSlots.value].sort((a, b) =>
      a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
    ),
  )
  const groupedByDate = computed(() => groupSlotsByDate(selectedSlots.value))
  const total = computed(() => selectedSlots.value.reduce((sum, s) => sum + s.price, 0))
  const count = computed(() => selectedSlots.value.length)

  // Switching field invalidates the current selection.
  function setField(f: Field) {
    if (field.value?.id !== f.id) selectedSlots.value = []
    field.value = f
  }

  function toggleSlot(slot: Slot) {
    const i = selectedSlots.value.findIndex((s) => s.id === slot.id)
    if (i >= 0) selectedSlots.value.splice(i, 1)
    else selectedSlots.value.push({ ...slot })
  }

  function isSelected(id: string): boolean {
    return selectedSlots.value.some((s) => s.id === id)
  }

  function clearSlots() {
    selectedSlots.value = []
  }

  function clear() {
    field.value = null
    selectedSlots.value = []
  }

  return {
    field,
    selectedSlots,
    sortedSlots,
    groupedByDate,
    total,
    count,
    setField,
    toggleSlot,
    isSelected,
    clearSlots,
    clear,
  }
})
