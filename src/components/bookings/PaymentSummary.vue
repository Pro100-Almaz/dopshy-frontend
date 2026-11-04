<script setup lang="ts">
import { computed } from 'vue'

import type { Booking } from '@/types'
import { formatPrice } from '@/services/booking'

// Разбивка оплат брони — общая для окна «Оплаты» и вкладки «Возврат».
// `refundedTotal` / `paidTotal` можно передать с /refunds (там «Оплачено» —
// фактически полученные деньги), иначе берём из брони.
const props = defineProps<{ booking: Booking; refundedTotal?: number; paidTotal?: number }>()

const rows = computed(() => [
  { label: 'Бот (удаленная оплата)', value: props.booking.paidBot },
  { label: 'Kaspi QR', value: props.booking.paidKaspiQr },
  { label: 'Наличные', value: props.booking.paidCash },
  { label: 'Аванс', value: props.booking.paidAvans },
])

const refunded = computed(() => props.refundedTotal ?? props.booking.refundedTotal ?? 0)
const paid = computed(() => props.paidTotal ?? props.booking.paidTotal)
const remaining = computed(() => props.booking.total - paid.value)
</script>

<template>
  <dl class="space-y-2.5">
    <div v-for="r in rows" :key="r.label" class="flex items-center justify-between text-sm">
      <dt class="text-gray-600 dark:text-gray-400">{{ r.label }}</dt>
      <dd class="font-medium tabular-nums text-gray-800 dark:text-white/90">
        {{ formatPrice(r.value) }}
      </dd>
    </div>

    <div
      class="mt-1 flex items-center justify-between border-t border-gray-200 pt-3 text-sm dark:border-gray-800"
    >
      <dt class="font-semibold text-gray-700 dark:text-gray-300">Оплачено</dt>
      <dd class="font-semibold tabular-nums text-success-600 dark:text-success-500">
        {{ formatPrice(paid) }}
      </dd>
    </div>
    <div v-if="refunded > 0" class="flex items-center justify-between text-sm">
      <dt class="text-gray-600 dark:text-gray-400">Возвращено</dt>
      <dd class="font-medium tabular-nums text-error-600 dark:text-error-500">
        − {{ formatPrice(refunded) }}
      </dd>
    </div>
    <div class="flex items-center justify-between text-sm">
      <dt class="text-gray-600 dark:text-gray-400">Остаток</dt>
      <dd class="font-medium tabular-nums text-warning-600 dark:text-warning-400">
        {{ formatPrice(remaining) }}
      </dd>
    </div>
    <div class="flex items-center justify-between text-sm">
      <dt class="text-gray-600 dark:text-gray-400">Итого</dt>
      <dd class="font-medium tabular-nums text-gray-800 dark:text-white/90">
        {{ formatPrice(booking.total) }}
      </dd>
    </div>
  </dl>
</template>
