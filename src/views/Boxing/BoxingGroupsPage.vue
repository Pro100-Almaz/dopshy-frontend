<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarDays,
  Clock3,
  Loader2,
  Phone,
  Users,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { listBoxingGroups, listBoxingStudents } from '@/services/boxing'
import type { BoxingGroup, BoxingStudent } from '@/services/boxing'

const currentPageTitle = 'Бокс: группы'
const groups = ref<BoxingGroup[]>([])
const subscribedStudents = ref<BoxingStudent[]>([])
const selectedGroupId = ref('')
const loading = ref(true)
const error = ref('')

const selectedGroup = computed<BoxingGroup | undefined>(() =>
  groups.value.find((group) => group.id === selectedGroupId.value),
)

const selectedGroupChildren = computed(() => {
  if (!selectedGroup.value) return []
  const group = selectedGroup.value
  return subscribedStudents.value.filter(
    (student) =>
      student.assigned_group_id === group.id ||
      student.assigned_group_name === group.group_name ||
      student.assigned_group === group.group_name,
  )
})

function selectGroup(group: BoxingGroup) {
  selectedGroupId.value = group.id
}

async function load() {
  loading.value = true
  try {
    const [nextGroups, nextStudents] = await Promise.all([
      listBoxingGroups(),
      listBoxingStudents(true),
    ])
    groups.value = nextGroups
    subscribedStudents.value = nextStudents
    if (!selectedGroupId.value || !nextGroups.some((group) => group.id === selectedGroupId.value)) {
      selectedGroupId.value = nextGroups[0]?.id ?? ''
    }
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load boxing groups'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <h3 class="font-medium text-gray-800 dark:text-white/90">Groups</h3>
          <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Select a boxing group to view subscribed children assigned to it.
          </p>
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
          v-else-if="!groups.length"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">No boxing groups found.</p>
        </div>

        <div v-else class="divide-y divide-gray-200 dark:divide-gray-800">
          <button
            v-for="group in groups"
            :key="group.id"
            type="button"
            class="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors sm:px-6"
            :class="
              selectedGroupId === group.id
                ? 'bg-brand-50 dark:bg-brand-500/[0.12]'
                : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
            "
            @click="selectGroup(group)"
          >
            <span
              class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500"
            >
              <Users class="h-5 w-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
                {{ group.group_name }}
              </span>
              <span class="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
                {{ group.group_type }} · {{ group.curr_cap ?? 0 }}/{{ group.max_cap ?? '∞' }}
              </span>
              <span class="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
                {{ group.training_day }}, {{ group.start_time }}-{{ group.end_time }}
              </span>
            </span>
          </button>
        </div>
      </section>

      <section
        v-if="selectedGroup"
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p class="text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ selectedGroup.group_type }}
              </p>
              <h3 class="mt-1 font-semibold text-gray-800 text-theme-xl dark:text-white/90">
                {{ selectedGroup.group_name }}
              </h3>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
              >
                <Users class="h-3.5 w-3.5" />
                {{ selectedGroup.curr_cap ?? 0 }}/{{ selectedGroup.max_cap ?? '∞' }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
              >
                <CalendarDays class="h-3.5 w-3.5" /> {{ selectedGroup.training_day }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
              >
                <Clock3 class="h-3.5 w-3.5" />
                {{ selectedGroup.start_time }}-{{ selectedGroup.end_time }}
              </span>
            </div>
          </div>
        </div>

        <div class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="w-full min-w-[760px] table-fixed">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="w-[32%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Child</p>
                </th>
                <th class="w-[22%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Birthdate</p>
                </th>
                <th class="w-[24%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Contact</p>
                </th>
                <th class="w-[22%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Trials</p>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="student in selectedGroupChildren"
                :key="student.id"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <td class="px-5 py-4 sm:px-6">
                  <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                    {{ student.name }}
                  </span>
                  <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                    Age {{ student.age }}
                  </span>
                </td>
                <td class="px-5 py-4 sm:px-6">
                  <span class="text-theme-sm text-gray-700 dark:text-gray-300">
                    {{ student.birthdate }}
                  </span>
                </td>
                <td class="px-5 py-4 sm:px-6">
                  <span
                    class="inline-flex items-center gap-1 text-theme-sm text-gray-700 dark:text-gray-300"
                  >
                    <Phone class="h-3.5 w-3.5 text-gray-400" /> {{ student.parent_phone }}
                  </span>
                </td>
                <td class="px-5 py-4 sm:px-6">
                  <span
                    class="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
                  >
                    {{ student.total_trials }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="!selectedGroupChildren.length"
            class="flex min-h-[200px] items-center justify-center px-6 text-center text-gray-500 dark:text-gray-400"
          >
            No subscribed children assigned to this group yet.
          </div>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>
