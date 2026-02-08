<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Последние платежи</h3>
      <button class="text-sm font-medium text-[#10B981] hover:text-[#059669]">Все платежи</button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[480px]">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Клиент</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Тип</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Сумма</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Статус</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
          <tr v-for="p in payments" :key="p.id" class="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
            <td class="whitespace-nowrap px-6 py-3">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ p.client }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3">
              <span :class="typeBadge(p.type)" class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium">
                {{ typeLabel(p.type) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatAmount(p.amount) }}</span>
            </td>
            <td class="whitespace-nowrap px-6 py-3 text-right">
              <span :class="statusBadge(p.status)" class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium">
                {{ statusLabel(p.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
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
    booking: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    lesson: 'bg-[#10B981]/10 text-[#10B981]',
    membership: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  }
  return map[type] || ''
}

function statusLabel(status: string) {
  const map: Record<string, string> = { paid: 'оплачено', pending: 'ожидание', overdue: 'просрочено' }
  return map[status] || status
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-[#10B981]/10 text-[#10B981]',
    pending: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    overdue: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  }
  return map[status] || ''
}
</script>
