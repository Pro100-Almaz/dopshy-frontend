<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Последние платежи</h3>
      <router-link
        to="/bookings"
        class="text-sm font-medium text-[#10B981] hover:text-[#059669]"
      >
        Все брони
      </router-link>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[480px]">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Клиент</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Сумма</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Оплачено</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Статус</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
          <tr v-for="b in bookings" :key="b.id" class="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
            <td class="whitespace-nowrap px-6 py-3">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ b.customerName || '—' }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatAmount(b.total) }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatAmount(paid(b)) }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span :class="statusBadge(payStatus(b))" class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium">
                {{ statusLabel(payStatus(b)) }}
              </span>
            </td>
          </tr>
          <tr v-if="!bookings.length">
            <td colspan="4" class="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Платежей пока нет
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Booking } from '@/types'

defineProps<{ bookings: Booking[] }>()

type PayStatus = 'paid' | 'partial' | 'unpaid'

function paid(b: Booking): number {
  return Number(b.payment_current ?? 0)
}

function payStatus(b: Booking): PayStatus {
  const p = paid(b)
  if (p <= 0) return 'unpaid'
  if (p >= b.total) return 'paid'
  return 'partial'
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₸'
}

function statusLabel(status: PayStatus) {
  const map: Record<PayStatus, string> = {
    paid: 'оплачено',
    partial: 'частично',
    unpaid: 'не оплачено',
  }
  return map[status]
}

function statusBadge(status: PayStatus) {
  const map: Record<PayStatus, string> = {
    paid: 'bg-[#10B981]/10 text-[#10B981]',
    partial: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    unpaid: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  }
  return map[status]
}
</script>
