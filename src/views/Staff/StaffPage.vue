<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LoaderCircle, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import Modal from '@/components/ui/Modal.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
import {
  buttonDanger,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  input,
  label as labelClass,
  panel,
  panelHeader,
  panelHint,
  panelTitle,
  select,
  td,
  th,
} from '@/components/academy/ui'
import {
  createStaffUser,
  deleteStaffUser,
  listStaffUsers,
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  updateStaffUser,
  type StaffRole,
  type StaffUser,
} from '@/services/staff'

const users = ref<StaffUser[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const formOpen = ref(false)
const formSaving = ref(false)
const formError = ref('')
const editing = ref<StaffUser | null>(null)
const deleting = ref<StaffUser | null>(null)
const deleteSaving = ref(false)

const form = ref({
  username: '',
  email: '',
  password: '',
  role: 'manager' as StaffRole,
  isActive: true,
  isVerified: true,
})

const activeCount = computed(() => users.value.filter((user) => user.isActive).length)

async function load() {
  loading.value = true
  try {
    users.value = await listStaffUsers()
    loadError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить сотрудников'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  editing.value = null
  form.value = {
    username: '',
    email: '',
    password: '',
    role: 'manager',
    isActive: true,
    isVerified: true,
  }
  formError.value = ''
  formOpen.value = true
}

function openEdit(user: StaffUser) {
  editing.value = user
  form.value = {
    username: user.username,
    email: user.email,
    password: '',
    role: user.role,
    isActive: user.isActive,
    isVerified: user.isVerified,
  }
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  if (formSaving.value) return
  formOpen.value = false
}

async function saveForm() {
  if (formSaving.value) return

  const username = form.value.username.trim()
  const email = form.value.email.trim()
  if (!username) {
    formError.value = 'Введите username.'
    return
  }
  if (!email) {
    formError.value = 'Введите email.'
    return
  }
  if (!editing.value && !form.value.password) {
    formError.value = 'Введите пароль.'
    return
  }

  formSaving.value = true
  formError.value = ''
  try {
    const saved = editing.value
      ? await updateStaffUser(editing.value.id, {
          username,
          email,
          password: form.value.password || undefined,
          role: form.value.role,
          is_active: form.value.isActive,
          is_verified: form.value.isVerified,
        })
      : await createStaffUser({
          username,
          email,
          password: form.value.password,
          role: form.value.role,
          is_active: form.value.isActive,
          is_verified: form.value.isVerified,
        })

    users.value = editing.value
      ? users.value.map((user) => (user.id === saved.id ? saved : user))
      : [saved, ...users.value]
    formOpen.value = false
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Не удалось сохранить сотрудника'
  } finally {
    formSaving.value = false
  }
}

function openDelete(user: StaffUser) {
  deleting.value = user
  actionError.value = ''
}

function closeDelete() {
  if (deleteSaving.value) return
  deleting.value = null
}

async function confirmDelete() {
  const user = deleting.value
  if (!user || deleteSaving.value) return

  deleteSaving.value = true
  actionError.value = ''
  try {
    await deleteStaffUser(user.id)
    users.value = users.value.map((item) =>
      item.id === user.id ? { ...item, isActive: false, isLoggedIn: false } : item,
    )
    deleting.value = null
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось деактивировать сотрудника'
  } finally {
    deleteSaving.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Сотрудники" />

    <section :class="panel">
      <div :class="panelHeader">
        <div>
          <h1 :class="panelTitle">Сотрудники</h1>
          <p :class="panelHint">
            Активных: {{ activeCount }} из {{ users.length }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            :class="[buttonSecondary, buttonSize.sm]"
            :disabled="loading"
            @click="load"
          >
            <LoaderCircle
              v-if="loading"
              class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <RefreshCw v-else class="h-3.5 w-3.5" aria-hidden="true" />
            Обновить
          </button>
          <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="openCreate">
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
            Добавить сотрудника
          </button>
        </div>
      </div>

      <p
        v-if="actionError"
        class="border-b border-error-200 bg-error-50 px-5 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300 sm:px-6"
        role="alert"
      >
        {{ actionError }}
      </p>

      <div v-if="loading" class="px-5 py-12 text-center text-theme-sm text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
      <div
        v-else-if="loadError"
        class="px-5 py-12 text-center text-theme-sm text-error-700 dark:text-error-400"
      >
        {{ loadError }}
      </div>
      <div
        v-else-if="!users.length"
        class="px-5 py-12 text-center text-theme-sm text-gray-600 dark:text-gray-400"
      >
        Сотрудников пока нет.
      </div>

      <table v-else class="hidden w-full lg:table">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800">
            <th :class="th">Username</th>
            <th :class="th">Email</th>
            <th :class="th">Роль</th>
            <th :class="th">Статус</th>
            <th :class="[th, 'text-right']">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800/70 dark:hover:bg-white/[0.02]"
          >
            <td :class="td">
              <p class="text-theme-sm font-semibold text-gray-900 dark:text-white">
                {{ user.username }}
              </p>
            </td>
            <td :class="td" class="text-theme-sm text-gray-700 dark:text-gray-300">
              {{ user.email }}
            </td>
            <td :class="td">
              <StatusPill tone="neutral">{{ STAFF_ROLE_LABELS[user.role] }}</StatusPill>
            </td>
            <td :class="td">
              <div class="flex flex-wrap gap-1.5">
                <StatusPill :tone="user.isActive ? 'pitch' : 'warning'">
                  {{ user.isActive ? 'Активен' : 'Отключён' }}
                </StatusPill>
                <StatusPill v-if="user.isVerified" tone="info">Verified</StatusPill>
              </div>
            </td>
            <td :class="td">
              <div class="flex justify-end gap-2">
                <button type="button" :class="[buttonSecondary, buttonSize.sm]" @click="openEdit(user)">
                  <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
                  Изменить
                </button>
                <button
                  type="button"
                  :class="[buttonDanger, buttonSize.sm]"
                  :disabled="!user.isActive"
                  @click="openDelete(user)"
                >
                  <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                  Отключить
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <ul v-if="!loading && !loadError && users.length" class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
        <li v-for="user in users" :key="user.id" class="px-5 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
                {{ user.username }}
              </p>
              <p class="truncate text-theme-xs text-gray-600 dark:text-gray-400">{{ user.email }}</p>
            </div>
            <StatusPill :tone="user.isActive ? 'pitch' : 'warning'">
              {{ user.isActive ? 'Активен' : 'Отключён' }}
            </StatusPill>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" :class="[buttonSecondary, buttonSize.sm]" @click="openEdit(user)">
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
              Изменить
            </button>
            <button
              type="button"
              :class="[buttonDanger, buttonSize.sm]"
              :disabled="!user.isActive"
              @click="openDelete(user)"
            >
              <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
              Отключить
            </button>
          </div>
        </li>
      </ul>
    </section>

    <Modal v-if="formOpen" :fullScreenBackdrop="true" @close="closeForm">
      <template #body>
        <form
          class="relative z-10 mx-4 my-4 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:my-8 sm:p-6"
          novalidate
          @submit.prevent="saveForm"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ editing ? 'Изменить сотрудника' : 'Добавить сотрудника' }}
            </h2>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeForm">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="labelClass" for="staff-username">Username</label>
              <input id="staff-username" v-model="form.username" type="text" :class="input" />
            </div>
            <div>
              <label :class="labelClass" for="staff-email">Email</label>
              <input id="staff-email" v-model="form.email" type="email" :class="input" />
            </div>
            <div>
              <label :class="labelClass" for="staff-password">Пароль</label>
              <input
                id="staff-password"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :class="input"
              />
            </div>
            <div>
              <label :class="labelClass" for="staff-role">Роль</label>
              <select id="staff-role" v-model="form.role" :class="select">
                <option v-for="role in STAFF_ROLES" :key="role" :value="role">
                  {{ STAFF_ROLE_LABELS[role] }}
                </option>
              </select>
            </div>
            <label class="flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200">
              <input
                v-model="form.isActive"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-pitch-600 focus:ring-pitch-500"
              />
              Активен
            </label>
            <label class="flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200">
              <input
                v-model="form.isVerified"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-pitch-600 focus:ring-pitch-500"
              />
              Verified
            </label>
          </div>

          <p
            v-if="formError"
            class="mt-4 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ formError }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="formSaving"
              @click="closeForm"
            >
              Отмена
            </button>
            <button type="submit" :class="[buttonPrimary, buttonSize.sm]" :disabled="formSaving">
              <LoaderCircle
                v-if="formSaving"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Сохранить
            </button>
          </div>
        </form>
      </template>
    </Modal>

    <Modal v-if="deleting" :fullScreenBackdrop="true" @close="closeDelete">
      <template #body>
        <div class="relative z-10 mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-6">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Отключить сотрудника?</h2>
          <p class="mt-2 text-theme-sm text-gray-600 dark:text-gray-400">
            {{ deleting.username }} больше не сможет войти.
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="deleteSaving"
              @click="closeDelete"
            >
              Отмена
            </button>
            <button
              type="button"
              :class="[buttonDanger, buttonSize.sm]"
              :disabled="deleteSaving"
              @click="confirmDelete"
            >
              <LoaderCircle
                v-if="deleteSaving"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Отключить
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>
