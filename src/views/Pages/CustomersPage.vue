<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loader2, Users, Search } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BotToggle from '@/components/customers/BotToggle.vue'

import type { BotStatus, Customer } from '@/types'
import { listCustomers } from '@/services/customer'
import { formatDateTime } from '@/services/booking'

const currentPageTitle = 'Клиентская база'

const customers = ref<Customer[]>([])
const loading = ref(true)
const error = ref('')
const toast = ref('')
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter(
    (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, '')),
  )
})

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// Подтверждённый бэкендом статус — синхронизируем строку клиента.
function onChange(customer: Customer, status: BotStatus) {
  customer.paused = status.paused
  customer.paused_reason = status.paused_reason ?? null
}

function onError(message: string) {
  toast.value = message
  window.setTimeout(() => (toast.value = ''), 4000)
}

onMounted(async () => {
  loading.value = true
  try {
    customers.value = await listCustomers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить клиентов'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="space-y-6">
      <div
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div
          class="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div>
            <h3 class="font-medium text-gray-800 dark:text-white/90">Клиенты</h3>
            <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Управляйте ботом-ассистентом по каждому клиенту
            </p>
          </div>
          <div class="relative w-full sm:w-64">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="query"
              type="search"
              placeholder="Поиск по имени или телефону"
              class="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <p class="text-error-600 dark:text-error-500">{{ error }}</p>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!filtered.length"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">
            {{ query ? 'Клиенты не найдены.' : 'Клиентов пока нет.' }}
          </p>
        </div>

        <!-- Rows -->
        <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Клиент</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Броней</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Последняя бронь
                  </p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Бот</p>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="c in filtered"
                :key="c.phone"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <!-- Customer -->
                <td class="px-5 py-4 sm:px-6">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                    >
                      {{ initials(c.name) }}
                    </div>
                    <div>
                      <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {{ c.name }}
                      </span>
                      <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                        {{ c.displayPhone }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Bookings count -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                    {{ c.bookingsCount }}
                  </span>
                </td>

                <!-- Last booking -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {{ formatDateTime(c.lastBookingAt) }}
                  </span>
                </td>

                <!-- Bot toggle -->
                <td class="px-5 py-4 sm:px-6">
                  <BotToggle
                    :phone="c.phone"
                    :paused="c.paused"
                    :paused-reason="c.paused_reason"
                    @change="(s) => onChange(c, s)"
                    @error="onError"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Toast for toggle errors (optimistic update already reverted) -->
    <div
      v-if="toast"
      class="fixed bottom-6 right-6 z-999999 rounded-xl border border-error-200 bg-white px-4 py-3 text-theme-sm text-error-700 shadow-theme-lg dark:border-error-500/30 dark:bg-gray-900 dark:text-error-400"
      role="alert"
    >
      {{ toast }}
    </div>
  </AdminLayout>
</template>
