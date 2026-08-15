<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

import Modal from '@/components/ui/Modal.vue'
import type { Booking } from '@/types'
import { formatPrice } from '@/services/booking'

const props = defineProps<{ booking: Booking }>()
defineEmits<{ close: [] }>()

// Разбивка оплат. Значения в Booking уже числа (см. mapBooking), пустые = 0.
const rows = computed(() => [
  { label: 'Бот (удаленная оплата)', value: props.booking.paidBot },
  { label: 'Kaspi QR', value: props.booking.paidKaspiQr },
  { label: 'Наличные', value: props.booking.paidCash },
  { label: 'Аванс', value: props.booking.paidAvans },
])

const remaining = computed(() => props.booking.total - props.booking.paidTotal)
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

        <dl class="space-y-2.5">
          <div
            v-for="r in rows"
            :key="r.label"
            class="flex items-center justify-between text-sm"
          >
            <dt class="text-gray-600 dark:text-gray-400">{{ r.label }}</dt>
            <dd class="font-medium text-gray-800 dark:text-white/90">{{ formatPrice(r.value) }}</dd>
          </div>

          <div
            class="mt-1 flex items-center justify-between border-t border-gray-200 pt-3 text-sm dark:border-gray-800"
          >
            <dt class="font-semibold text-gray-700 dark:text-gray-300">Оплачено</dt>
            <dd class="font-semibold text-success-600 dark:text-success-500">
              {{ formatPrice(booking.paidTotal) }}
            </dd>
          </div>
          <div class="flex items-center justify-between text-sm">
            <dt class="text-gray-600 dark:text-gray-400">Остаток</dt>
            <dd class="font-medium text-warning-600 dark:text-warning-400">
              {{ formatPrice(remaining) }}
            </dd>
          </div>
          <div class="flex items-center justify-between text-sm">
            <dt class="text-gray-600 dark:text-gray-400">Итого</dt>
            <dd class="font-medium text-gray-800 dark:text-white/90">
              {{ formatPrice(booking.total) }}
            </dd>
          </div>
        </dl>
      </div>
    </template>
  </Modal>
</template>
