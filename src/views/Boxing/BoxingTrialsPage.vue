<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarDays,
  CheckCircle2,
  Languages,
  Loader2,
  Phone,
  Search,
  StickyNote,
  Users,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  listBoxingTrials,
  setBoxingTrialAttended,
  setBoxingTrialSubscribed,
} from '@/services/boxing'
import type { BoxingTrial } from '@/services/boxing'

const currentPageTitle = 'Бокс: пробные'
const query = ref('')
const trials = ref<BoxingTrial[]>([])
const loading = ref(true)
const error = ref('')
const savingTrialIds = ref<Set<number>>(new Set())

const visibleTrials = computed(() => {
  const q = query.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')

  console.log(trials);
  return trials.value.filter((trial) => {
    if (trial.subscribed) return false
    if (!q) return true

    const nameHit = trial.child_name.toLowerCase().includes(q)
    const groupHit = groupName(trial).toLowerCase().includes(q)
    const phoneHit = digits.length > 0 && trial.phone.replace(/\D/g, '').includes(digits)
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

function groupName(trial: BoxingTrial): string {
  return trial.assigned_group_name || trial.group_id || 'Unassigned'
}

async function load() {
  loading.value = true
  try {
    trials.value = await listBoxingTrials(false)
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load boxing trials'
  } finally {
    loading.value = false
  }
}

async function updateAttended(trial: BoxingTrial, attended: boolean) {
  savingTrialIds.value.add(trial.trial_id)
  try {
    const updated = await setBoxingTrialAttended(trial.trial_id, attended)
    trial.attended = updated.attended
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update attendance'
  } finally {
    savingTrialIds.value.delete(trial.trial_id)
  }
}

async function subscribeTrial(trial: BoxingTrial) {
  savingTrialIds.value.add(trial.trial_id)
  try {
    await setBoxingTrialSubscribed(trial.trial_id, true)
    trials.value = trials.value.filter((item) => item.trial_id !== trial.trial_id)
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to subscribe child'
  } finally {
    savingTrialIds.value.delete(trial.trial_id)
  }
}

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
          <h3 class="font-medium text-gray-800 dark:text-white/90">Пробные занятия</h3>
          <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Children who have not subscribed yet.
          </p>
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
        v-else-if="!visibleTrials.length"
        class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
        <p class="text-gray-600 dark:text-gray-400">No non-subscribed trial children found.</p>
      </div>

      <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
        <table class="w-full min-w-[1240px] table-fixed">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="w-[19%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Child</p>
              </th>
              <th class="w-[17%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Contact</p>
              </th>
              <th class="w-[17%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Group / Trial</p>
              </th>
              <th class="w-[11%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">State</p>
              </th>
              <th class="w-[19%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Notes</p>
              </th>
              <th class="w-[8%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Attended</p>
              </th>
              <th class="w-[9%] px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Subscribe</p>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="trial in visibleTrials"
              :key="trial.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
            >
              <td class="px-5 py-4 sm:px-6">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                  >
                    {{ initials(trial.child_name) }}
                  </div>
                  <div>
                    <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {{ trial.child_name }}
                    </span>
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                      Age {{ trial.child_age }} · {{ trial.birthdate }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="inline-flex items-center gap-1 text-theme-sm text-gray-700 dark:text-gray-300">
                  <Phone class="h-3.5 w-3.5 text-gray-400" /> {{ trial.phone }}
                </span>
                <span class="mt-1 flex items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  <Languages class="h-3.5 w-3.5" /> {{ trial.language }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ groupName(trial) }}
                </span>
                <span class="mt-1 flex items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  <CalendarDays class="h-3.5 w-3.5" />
                  {{ trial.trial_day }}, {{ trial.start_time }}-{{ trial.end_time }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span
                  class="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                >
                  {{ trial.state }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="flex items-start gap-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  <StickyNote class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {{ trial.notes }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <label class="inline-flex items-center gap-2 text-theme-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-success-500 focus:ring-success-500 dark:border-gray-700 dark:bg-gray-900"
                    :checked="trial.attended"
                    :disabled="savingTrialIds.has(trial.trial_id)"
                    @change="updateAttended(trial, ($event.target as HTMLInputElement).checked)"
                  />
                  Yes
                </label>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <button
                  type="button"
                  class="inline-flex h-8 w-fit items-center gap-1 rounded-lg bg-success-500 px-3 text-theme-xs font-medium text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                  :disabled="savingTrialIds.has(trial.trial_id)"
                  @click="subscribeTrial(trial)"
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
