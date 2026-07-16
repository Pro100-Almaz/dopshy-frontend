<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">Последние платежи</h3>
      <button
        type="button"
        class="rounded-md text-sm font-semibold text-success-600 transition-colors hover:text-success-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500 focus-visible:ring-offset-2 dark:text-success-400 dark:focus-visible:ring-offset-gray-900"
      >
        Все платежи
      </button>
    </div>

    <div v-if="payments.length" class="overflow-x-auto">
      <table class="w-full min-w-[480px]">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Клиент</th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Тип</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Сумма</th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Статус</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-for="p in payments" :key="p.id" class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
            <td class="whitespace-nowrap px-6 py-3">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ p.client }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3">
              <span :class="typeBadge(p.type)" class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {{ typeLabel(p.type) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ formatAmount(p.amount) }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span :class="statusBadge(p.status)" class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {{ statusLabel(p.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500">
        <Receipt :size="22" :stroke-width="1.75" />
      </div>
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Платежей пока нет</p>
      <p class="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
        Как только клиенты внесут оплату, транзакции появятся здесь.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Receipt } from 'lucide-vue-next'
import type { Payment } from '@/types'

defineProps<{ payments: Payment[] }>()

function formatAmount(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₸'
}

function typeLabel(type: string) {
  const map: Record<string, string> = { booking: 'бронь', lesson: 'занятие', membership: 'абонемент' }
  return map[type] || type
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    booking: 'bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400',
    lesson: 'bg-success-50 text-success-700 dark:bg-success-500/[0.12] dark:text-success-400',
    membership: 'bg-purple-50 text-purple-600 dark:bg-purple-500/[0.12] dark:text-purple-400',
  }
  return map[type] || ''
}

function statusLabel(status: string) {
  const map: Record<string, string> = { paid: 'оплачено', pending: 'ожидание', overdue: 'просрочено' }
  return map[status] || status
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-success-50 text-success-700 dark:bg-success-500/[0.12] dark:text-success-400',
    pending: 'bg-warning-50 text-warning-700 dark:bg-warning-500/[0.12] dark:text-warning-400',
    overdue: 'bg-error-50 text-error-600 dark:bg-error-500/[0.12] dark:text-error-400',
  }
  return map[status] || ''
}
</script>
