<script setup lang="ts">
import { X } from 'lucide-vue-next'

import Modal from '@/components/ui/Modal.vue'
import PaymentSummary from '@/components/bookings/PaymentSummary.vue'
import type { Booking } from '@/types'

defineProps<{ booking: Booking }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Modal :fullScreenBackdrop="true" @close="$emit('close')">
    <template #body>
      <div
        class="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <button
          class="absolute right-5 top-5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white/90"
          aria-label="Закрыть"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>

        <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Оплаты</h3>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">{{ booking.ref }}</p>

        <PaymentSummary :booking="booking" />
      </div>
    </template>
  </Modal>
</template>
