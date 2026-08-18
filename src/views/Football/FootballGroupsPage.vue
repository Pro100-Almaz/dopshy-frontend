<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
  Phone,
  Users,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  formatBirthdate,
  listFootballGroups,
  listFootballStudents,
  updateFootballGroup,
} from '@/services/football'
import type { FootballGroup, FootballStudent, UpdateFootballGroupPayload } from '@/services/football'

interface FootballGroupSchedule {
  training_day: string
  training_day_label: string
  start_time: string
  end_time: string
}

interface FootballGroupView {
  key: string
  group_type: string
  group_name: string
  max_cap: number | null
  curr_cap: number | null
  schedules: FootballGroupSchedule[]
}

const currentPageTitle = 'Футбол: группы'
const groups = ref<FootballGroup[]>([])
const subscribedStudents = ref<FootballStudent[]>([])
const selectedGroupId = ref('')
const loading = ref(true)
const error = ref('')
const editingGroup = ref<FootballGroupView | null>(null)
const editGroupName = ref('')
const editMaxCap = ref<number | null>(null)
const editSchedules = ref<FootballGroupSchedule[]>([])
const originalEditSchedules = ref<FootballGroupSchedule[]>([])
const editError = ref('')
const editSaving = ref(false)

function groupKey(group: FootballGroup): string {
  return String(group.group_id ?? group.id)
}

const groupedGroups = computed<FootballGroupView[]>(() => {
  const byGroup = new Map<string, FootballGroupView>()

  for (const group of groups.value) {
    const key = groupKey(group)
    const existing = byGroup.get(key)
    const schedule = {
      training_day: group.training_day,
      training_day_label: group.training_day_label || group.training_day,
      start_time: group.start_time,
      end_time: group.end_time,
    }

    if (existing) {
      existing.curr_cap = Math.max(existing.curr_cap ?? 0, group.curr_cap ?? 0)
      existing.max_cap = group.max_cap ?? existing.max_cap
      existing.schedules.push(schedule)
      continue
    }

    byGroup.set(key, {
      key,
      group_type: group.group_type,
      group_name: group.group_name,
      max_cap: group.max_cap,
      curr_cap: group.curr_cap,
      schedules: [schedule],
    })
  }

  return Array.from(byGroup.values())
})

const selectedGroup = computed<FootballGroupView | undefined>(() =>
  groupedGroups.value.find((group) => group.key === selectedGroupId.value),
)

const selectedGroupChildren = computed(() => {
  if (!selectedGroup.value) return []
  const group = selectedGroup.value
  return subscribedStudents.value.filter(
    (student) =>
      String(student.assigned_group_id ?? '') === group.key ||
      student.assigned_group_name === group.group_name ||
      student.assigned_group === group.group_name,
  )
})

function selectGroup(group: FootballGroupView) {
  selectedGroupId.value = group.key
}

function normalizeTime(value: string): string {
  return value.slice(0, 5)
}

function openEditGroup(group: FootballGroupView) {
  editingGroup.value = group
  editGroupName.value = group.group_name
  editMaxCap.value = group.max_cap
  editSchedules.value = group.schedules.map((schedule) => ({
    ...schedule,
    start_time: normalizeTime(schedule.start_time),
    end_time: normalizeTime(schedule.end_time),
  }))
  originalEditSchedules.value = editSchedules.value.map((schedule) => ({ ...schedule }))
  editError.value = ''
}

function closeEditGroup() {
  if (editSaving.value) return
  editingGroup.value = null
  editError.value = ''
}

function updateScheduleTime(index: number, field: 'start_time' | 'end_time', value: string) {
  const schedule = editSchedules.value[index]
  if (!schedule) return
  schedule[field] = normalizeTime(value)
}

async function saveGroupEdit() {
  const group = editingGroup.value
  if (!group) return

  const payload: UpdateFootballGroupPayload = {}
  const nextName = editGroupName.value.trim()

  if (nextName && nextName !== group.group_name) {
    payload.group_name = nextName
  }

  if (editMaxCap.value !== null && editMaxCap.value !== group.max_cap) {
    if (!Number.isInteger(editMaxCap.value)) {
      editError.value = 'Вместимость должна быть целым числом.'
      return
    }
    if (group.curr_cap !== null && editMaxCap.value < group.curr_cap) {
      editError.value = `Вместимость не может быть меньше текущего количества учеников (${group.curr_cap}).`
      await load()
      return
    }
    payload.max_cap = editMaxCap.value
  }

  const changedSchedule = editSchedules.value
    .map((schedule, index) => ({ schedule, original: originalEditSchedules.value[index] }))
    .find(({ schedule, original }) => {
      if (!original) return false
      return schedule.start_time !== original.start_time || schedule.end_time !== original.end_time
    })

  if (changedSchedule?.original) {
    if (changedSchedule.schedule.start_time !== changedSchedule.original.start_time) {
      payload.start_time = changedSchedule.schedule.start_time
    }
    if (changedSchedule.schedule.end_time !== changedSchedule.original.end_time) {
      payload.end_time = changedSchedule.schedule.end_time
    }
  }

  if (
    !payload.group_name &&
    payload.max_cap === undefined &&
    payload.start_time === undefined &&
    payload.end_time === undefined
  ) {
    editError.value = 'Измените название группы, вместимость или время перед сохранением.'
    return
  }

  editSaving.value = true
  try {
    console.info('Football group update payload', payload)
    await updateFootballGroup(group.key, payload)
    await load()
    editingGroup.value = null
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Не удалось изменить группу.'
    window.alert(editError.value)
    await load()
  } finally {
    editSaving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const [nextGroups, nextStudents] = await Promise.all([
      listFootballGroups(),
      listFootballStudents(true),
    ])
    groups.value = nextGroups
    subscribedStudents.value = nextStudents
    if (
      !selectedGroupId.value ||
      !nextGroups.some((group) => groupKey(group) === selectedGroupId.value)
    ) {
      selectedGroupId.value = nextGroups[0] ? groupKey(nextGroups[0]) : ''
    }
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load football groups'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800'
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <h3 class="font-medium text-gray-800 dark:text-white/90">Группы</h3>
          <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Select a football group to view subscribed children assigned to it.
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
            Повторить
          </button>
        </div>

        <div
          v-else-if="!groups.length"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">Группы по футболу не найдены.</p>
        </div>

        <div v-else class="divide-y divide-gray-200 dark:divide-gray-800">
          <button
            v-for="group in groupedGroups"
            :key="group.key"
            type="button"
            class="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors sm:px-6"
            :class="
              selectedGroupId === group.key
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
              <span class="mt-3 block space-y-2">
                <span
                  v-for="(schedule, index) in group.schedules"
                  :key="`${schedule.training_day}-${schedule.start_time}-${schedule.end_time}-${index}`"
                  class="relative block pl-5 text-theme-xs text-gray-500 dark:text-gray-400"
                >
                  <span
                    class="absolute bottom-[-14px] left-1.5 top-[-10px] w-px bg-gray-900 dark:bg-white"
                    :class="{
                      'top-1/2': index === 0,
                      'bottom-1/2': index === group.schedules.length - 1,
                    }"
                  ></span>
                  <span class="absolute left-1.5 top-1/2 h-px w-3 bg-gray-900 dark:bg-white"></span>
                  {{ schedule.training_day_label }},
                  {{ schedule.start_time }}-{{ schedule.end_time }}
                </span>
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
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                @click="openEditGroup(selectedGroup)"
              >
                <Edit3 class="h-3.5 w-3.5" /> Изменить
              </button>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
              >
                <Users class="h-3.5 w-3.5" />
                {{ selectedGroup.curr_cap ?? 0 }}/{{ selectedGroup.max_cap ?? '∞' }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-theme-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
              >
                <CalendarDays class="h-3.5 w-3.5" /> {{ selectedGroup.schedules.length }} расписаний
              </span>
            </div>
          </div>
        </div>

        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div class="space-y-2">
            <div
              v-for="(schedule, index) in selectedGroup.schedules"
              :key="`${schedule.training_day}-${schedule.start_time}-${schedule.end_time}-${index}`"
              class="relative flex items-center gap-2 pl-5 text-theme-sm text-gray-700 dark:text-gray-300"
            >
              <span
                class="absolute bottom-[-10px] left-1.5 top-[-10px] w-px bg-gray-900 dark:bg-white"
                :class="{
                  'top-1/2': index === 0,
                  'bottom-1/2': index === selectedGroup.schedules.length - 1,
                }"
              ></span>
              <span class="absolute left-1.5 top-1/2 h-px w-3 bg-gray-900 dark:bg-white"></span>
              <CalendarDays class="h-4 w-4 text-gray-400" />
              <span>{{ schedule.training_day_label }}</span>
              <Clock3 class="h-4 w-4 text-gray-400" />
              <span>{{ schedule.start_time }}-{{ schedule.end_time }}</span>
            </div>
          </div>
        </div>

        <div class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="w-full min-w-[760px] table-fixed">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="w-[32%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Ребёнок</p>
                </th>
                <th class="w-[22%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Дата рождения</p>
                </th>
                <th class="w-[24%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Контакт</p>
                </th>
                <th class="w-[22%] px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Пробные</p>
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
                    Возраст {{ student.age }}
                  </span>
                </td>
                <td class="px-5 py-4 sm:px-6">
                  <span class="text-theme-sm text-gray-700 dark:text-gray-300">
                    {{ formatBirthdate(student.birthdate) }}
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
            В этой группе пока нет записанных учеников.
          </div>
        </div>
      </section>
    </div>

    <Modal v-if="editingGroup" :fullScreenBackdrop="true" @close="closeEditGroup">
      <template #body>
        <div
          class="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <button
            type="button"
            class="absolute right-5 top-5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white/90"
            aria-label="Close"
            :disabled="editSaving"
            @click="closeEditGroup"
          >
            <X class="h-5 w-5" />
          </button>

          <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Изменить группу
          </h3>
          <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
            {{ editingGroup.group_name }}
          </p>

          <form class="space-y-5" @submit.prevent="saveGroupEdit">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Название группы
                </label>
                <input v-model="editGroupName" type="text" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Макс. вместимость
                </label>
                <input v-model.number="editMaxCap" type="number" min="0" step="1" :class="inputClass" />
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Расписание
              </label>
              <div class="space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div
                  v-for="(schedule, index) in editSchedules"
                  :key="`${schedule.training_day}-${index}`"
                  class="grid gap-3 sm:grid-cols-3"
                >
                  <input
                    v-model="schedule.training_day_label"
                    type="text"
                    :class="inputClass"
                    placeholder="День недели"
                    readonly
                  />
                  <input
                    :value="schedule.start_time"
                    type="time"
                    :class="inputClass"
                    @input="updateScheduleTime(index, 'start_time', ($event.target as HTMLInputElement).value)"
                  />
                  <input
                    :value="schedule.end_time"
                    type="time"
                    :class="inputClass"
                    @input="updateScheduleTime(index, 'end_time', ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </div>

            <p v-if="editError" class="text-theme-sm text-error-600 dark:text-error-500">
              {{ editError }}
            </p>

            <div class="flex justify-end gap-3 pt-1">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2.5 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                :disabled="editSaving"
                @click="closeEditGroup"
              >
                Отмена
              </button>
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-lg bg-success-500 px-4 py-2.5 text-theme-sm font-medium text-white transition-colors hover:bg-success-600 disabled:opacity-60"
                :disabled="editSaving"
              >
                <Loader2 v-if="editSaving" class="h-4 w-4 animate-spin" />
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>
