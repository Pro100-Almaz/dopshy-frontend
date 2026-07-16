<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loader2, Users, Search, MessageCircle, CalendarCheck } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BotToggle from '@/components/customers/BotToggle.vue'

import type { BotStatus, Contact } from '@/types'
import { listContacts, relativeTime } from '@/services/customer'

const currentPageTitle = 'Клиентская база'

// Держим экран свежим: авто-пауза меняется на бэкенде без действий фронта.
const POLL_MS = 25000

const contacts = ref<Contact[]>([])
const loading = ref(true)
const error = ref('')
const toast = ref('')
const query = ref('')

type FilterKey = 'all' | 'texted' | 'booking' | 'paused'
const filter = ref<FilterKey>('all')
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'texted', label: 'Писали в WhatsApp' },
  { key: 'booking', label: 'С бронью' },
  { key: 'paused', label: 'Бот на паузе' },
]

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  return contacts.value.filter((c) => {
    if (filter.value === 'texted' && !c.texted) return false
    if (filter.value === 'booking' && !c.has_booking) return false
    if (filter.value === 'paused' && !c.paused) return false
    if (!q) return true
    const nameHit = c.name.toLowerCase().includes(q)
    const phoneHit = digits.length > 0 && c.phone.includes(digits)
    return nameHit || phoneHit
  })
})

function displayName(c: Contact): string {
  return c.name.trim() || c.phone
}

function initials(c: Contact): string {
  const name = c.name.trim()
  if (!name) return c.phone.slice(-2)
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// Согласованный с бэкендом статус — синхронизируем строку контакта.
function onChange(contact: Contact, status: BotStatus) {
  contact.paused = status.paused
  contact.paused_reason = status.paused_reason ?? null
}

function onError(message: string) {
  toast.value = message
  window.setTimeout(() => (toast.value = ''), 4000)
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    contacts.value = await listContacts()
    error.value = ''
  } catch (e) {
    // Фоновое обновление не должно затирать уже показанный список ошибкой.
    if (!silent) error.value = e instanceof Error ? e.message : 'Не удалось загрузить контакты'
  } finally {
    if (!silent) loading.value = false
  }
}

let pollId: number | undefined
function refreshOnFocus() {
  load(true)
}

onMounted(() => {
  load()
  pollId = window.setInterval(() => load(true), POLL_MS)
  window.addEventListener('focus', refreshOnFocus)
})

onUnmounted(() => {
  if (pollId !== undefined) window.clearInterval(pollId)
  window.removeEventListener('focus', refreshOnFocus)
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
              Управляйте ботом-ассистентом по каждому контакту
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

        <!-- Filters -->
        <div
          class="flex flex-wrap gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800 sm:px-6"
        >
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="rounded-full px-3 py-1.5 text-theme-xs font-medium transition-colors"
            :class="
              filter === f.key
                ? 'bg-success-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
            "
            @click="filter = f.key"
          >
            {{ f.label }}
          </button>
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
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            @click="load()"
          >
            Повторить
          </button>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!filtered.length"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">
            {{ contacts.length ? 'Контакты не найдены.' : 'Клиентов пока нет.' }}
          </p>
        </div>

        <!-- Rows -->
        <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Контакт</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Метки</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Активность
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
                <!-- Contact -->
                <td class="px-5 py-4 sm:px-6">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                    >
                      {{ initials(c) }}
                    </div>
                    <div>
                      <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {{ displayName(c) }}
                      </span>
                      <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                        {{ c.phone }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Badges -->
                <td class="px-5 py-4 sm:px-6">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      v-if="c.texted"
                      class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                    >
                      <MessageCircle class="h-3 w-3" /> WhatsApp
                    </span>
                    <span
                      v-if="c.has_booking"
                      class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                    >
                      <CalendarCheck class="h-3 w-3" /> Бронь
                    </span>
                    <span v-if="!c.texted && !c.has_booking" class="text-theme-xs text-gray-400">
                      —
                    </span>
                  </div>
                </td>

                <!-- Last activity -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {{ relativeTime(c.last_activity) }}
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
