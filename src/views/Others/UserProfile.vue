<template>
  <admin-layout>
    <PageBreadcrumb pageTitle="Профиль" />

    <div class="mx-auto max-w-3xl space-y-6">
      <!-- Identity card -->
      <div
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
      >
        <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col items-center gap-4 sm:flex-row sm:text-left">
            <span
              class="flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/10 text-2xl font-bold text-[#10B981]"
            >
              {{ userInitials }}
            </span>
            <div class="text-center sm:text-left">
              <h4 class="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
                {{ user?.name || 'Пользователь' }}
              </h4>
              <div
                class="flex flex-col items-center gap-2 sm:flex-row sm:gap-3"
              >
                <span
                  class="inline-flex rounded-md bg-[#10B981]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#10B981]"
                >
                  {{ roleLabel }}
                </span>
                <div class="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 sm:block"></div>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ user?.email || '—' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Personal information -->
      <div
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
      >
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
            Личная информация
          </h3>
        </div>

        <dl class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Имя</dt>
            <dd class="text-sm font-medium text-gray-800 dark:text-white/90">
              {{ user?.name || '—' }}
            </dd>
          </div>
          <div>
            <dt class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Email</dt>
            <dd class="text-sm font-medium text-gray-800 dark:text-white/90">
              {{ user?.email || '—' }}
            </dd>
          </div>
          <div>
            <dt class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Телефон</dt>
            <dd class="text-sm font-medium text-gray-800 dark:text-white/90">
              {{ user?.phone || 'Не указан' }}
            </dd>
          </div>
          <div>
            <dt class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Роль</dt>
            <dd class="text-sm font-medium text-gray-800 dark:text-white/90">{{ roleLabel }}</dd>
          </div>
          <div>
            <dt class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">ID аккаунта</dt>
            <dd class="text-sm font-medium text-gray-800 dark:text-white/90">
              {{ user?.id || '—' }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Session / security -->
      <div
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
      >
        <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Сессия</h3>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Завершите текущую сессию на этом устройстве.
        </p>
        <button
          @click="handleLogout"
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        >
          <LogOut :size="16" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { LogOut, X } from 'lucide-vue-next'
import AdminLayout from '../../components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import Modal from '../../components/profile/Modal.vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Супер-администратор',
  admin: 'Админ',
  arena_manager: 'Менеджер арены',
  boxing_manager: 'Менеджер бокса',
  football_manager: 'Менеджер футбола',
  manager: 'Менеджер',
  client: 'Клиент',
  coach: 'Тренер',
  accountant: 'Бухгалтер',
  staff: 'Сотрудник',
}

const roleLabel = computed(() => {
  const role = user.value?.role
  return (role && ROLE_LABELS[role]) || 'Пользователь'
})

const userInitials = computed(() => {
  const name = user.value?.name?.trim() || 'A'
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

const isEditOpen = ref(false)
const form = reactive({ name: '', phone: '' })

function handleLogout() {
  authStore.logout()
}
</script>
