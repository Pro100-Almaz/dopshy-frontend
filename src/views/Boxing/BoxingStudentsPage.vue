<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CheckCircle2, GraduationCap, Loader2, Phone, Search, Users } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  formatBirthdate,
  listBoxingStudents,
  setBoxingStudentSubscribed,
} from '@/services/boxing'
import type { BoxingStudent } from '@/services/boxing'

const currentPageTitle = 'Бокс: ученики'
const query = ref('')
const studentMode = ref<'unsubscribed' | 'subscribed'>('unsubscribed')
const students = ref<BoxingStudent[]>([])
const loading = ref(true)
const error = ref('')
const savingStudentIds = ref<Set<string>>(new Set())

const filteredStudents = computed(() => {
  const q = query.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')

  return students.value.filter((student) => {
    if (!q) return true
    const nameHit = student.name.toLowerCase().includes(q)
    const groupHit = groupName(student).toLowerCase().includes(q)
    const phoneHit = digits.length > 0 && student.parent_phone.replace(/\D/g, '').includes(digits)
    return nameHit || groupHit || phoneHit
  })
})

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

function groupName(student: BoxingStudent): string {
  return student.assigned_group_name || student.assigned_group || 'Unassigned'
}

async function load() {
  loading.value = true
  try {
    students.value = await listBoxingStudents(studentMode.value === 'subscribed')
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load boxing students'
  } finally {
    loading.value = false
  }
}

async function subscribeStudent(student: BoxingStudent) {
  savingStudentIds.value.add(student.id)
  try {
    await setBoxingStudentSubscribed(student.id, true)
    students.value = students.value.filter((item) => item.id !== student.id)
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to subscribe child'
  } finally {
    savingStudentIds.value.delete(student.id)
  }
}

watch(studentMode, load)
onMounted(load)
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <section
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div
        class="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div>
          <h3 class="font-medium text-gray-800 dark:text-white/90">Students</h3>
          <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Switch between non-subscribed trial children and subscribed students.
          </p>
        </div>
        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div class="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-theme-xs font-medium transition-colors"
              :class="
                studentMode === 'unsubscribed'
                  ? 'bg-white text-gray-800 shadow-theme-xs dark:bg-gray-900 dark:text-white/90'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="studentMode = 'unsubscribed'"
            >
              Non-subscribed
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-theme-xs font-medium transition-colors"
              :class="
                studentMode === 'subscribed'
                  ? 'bg-white text-gray-800 shadow-theme-xs dark:bg-gray-900 dark:text-white/90'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              "
              @click="studentMode = 'subscribed'"
            >
              Subscribed
            </button>
          </div>
          <div class="relative w-full sm:w-72">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="query"
              type="search"
              placeholder="Search name, phone, group"
              class="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
        <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
      </div>

      <div
        v-else-if="error"
        class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p class="text-error-600 dark:text-error-500">{{ error }}</p>
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          @click="load"
        >
          Retry
        </button>
      </div>

      <div
        v-else-if="!filteredStudents.length"
        class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
        <p class="text-gray-600 dark:text-gray-400">Students not found.</p>
      </div>

      <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
        <table class="w-full min-w-[1080px] table-fixed">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="w-[280px] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Child</p>
              </th>
              <th class="w-[150px] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Birthdate</p>
              </th>
              <th class="w-[230px] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Parent phone</p>
              </th>
              <th v-if="studentMode === 'unsubscribed'" class="w-[110px] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Trials</p>
              </th>
              <th class="px-5 py-3 text-left sm:px-6" :class="studentMode === 'subscribed' ? 'w-[420px]' : 'w-[180px]'">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Assigned group</p>
              </th>
              <th v-if="studentMode === 'unsubscribed'" class="w-[170px] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Action</p>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="student in filteredStudents"
              :key="student.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
            >
              <td class="px-5 py-4 sm:px-6">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                  >
                    {{ initials(student.name) }}
                  </div>
                  <div>
                    <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {{ student.name }}
                    </span>
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                      Age {{ student.age }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="text-theme-sm text-gray-700 dark:text-gray-300">
                  {{ formatBirthdate(student.birthdate) }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="inline-flex items-center gap-1 text-theme-sm text-gray-700 dark:text-gray-300">
                  <Phone class="h-3.5 w-3.5 text-gray-400" /> {{ student.parent_phone }}
                </span>
              </td>
              <td v-if="studentMode === 'unsubscribed'" class="px-5 py-4 sm:px-6">
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
                >
                  <GraduationCap class="h-3.5 w-3.5" /> {{ student.total_trials }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span
                  class="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                >
                  {{ groupName(student) }}
                </span>
              </td>
              <td v-if="studentMode === 'unsubscribed'" class="px-5 py-4 sm:px-6">
                <button
                  type="button"
                  class="inline-flex h-8 whitespace-nowrap items-center gap-1 rounded-lg bg-success-500 px-3 text-theme-xs font-medium text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                  :disabled="savingStudentIds.has(student.id)"
                  @click="subscribeStudent(student)"
                >
                  <CheckCircle2 class="h-3.5 w-3.5" /> Subscribe
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </AdminLayout>
</template>
