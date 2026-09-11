<script setup lang="ts">
/**
 * Ученики академии: воронка «пробное → абонемент».
 *
 * Два состояния из ТЗ §4.2 (`subscribed`) — это два разных занятия менеджера:
 * догнать тех, кто пришёл и не оформился, и вести тех, кто уже платит. Поэтому
 * переключатель режима, а не один общий список.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { GraduationCap, LoaderCircle, RefreshCw, Search, UserPlus, Users, X } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ChevronDownIcon } from '@/icons'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import ContactActions from '@/components/academy/ContactActions.vue'
import PersonCell from '@/components/academy/PersonCell.vue'
import StateBlock from '@/components/academy/StateBlock.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  buttonDanger,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  inputSm,
  panel,
  select,
  td,
  th,
} from '@/components/academy/ui'
import { useBotHandoff } from '@/composables/useBotHandoff'
import {
  assignStudentToGroup,
  listGroups,
  listStudents,
  setStudentSubscribed,
  type AcademyGroup,
  type AcademyStudent,
  type SportKey,
} from '@/services/academy'
import { useAcademyStore } from '@/stores/academy'
import { setPending, type PendingMap } from '@/utils/pending'

const props = defineProps<{ sport: SportKey }>()

const academy = useAcademyStore()
const filters = academy.studentFilters
const {
  load: loadHandoff,
  stateFor: handoffFor,
  isPending: handoffPending,
  toggle: toggleHandoff,
  error: handoffError,
} = useBotHandoff()

const students = ref<AcademyStudent[]>([])
const rawGroups = ref<AcademyGroup[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const savingIds = ref<PendingMap<string>>({})
/** Подтверждение снятия абонемента прямо в строке — вместо модалки. */
const confirmingId = ref('')
const assigningStudent = ref<AcademyStudent | null>(null)
const assigningGroupId = ref('')
const groupQuery = ref('')
const groupAssigning = ref(false)
const groupAssignError = ref('')

const subscribedMode = computed(() => filters.mode === 'subscribed')

async function load() {
  loading.value = true
  confirmingId.value = ''
  try {
    const [nextStudents, nextGroups] = await Promise.all([
      listStudents(props.sport, subscribedMode.value),
      listGroups(props.sport),
    ])
    students.value = nextStudents
    rawGroups.value = nextGroups
    loadError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить учеников'
  } finally {
    loading.value = false
  }
  loadHandoff()
}

onMounted(load)
watch([() => props.sport, () => filters.mode], load)

function groupNameOf(student: AcademyStudent): string {
  return student.assigned_group_name || student.assigned_group || ''
}

const groupOptions = computed(() => {
  const names = new Set<string>()
  for (const student of students.value) {
    const name = groupNameOf(student)
    if (name) names.add(name)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'))
})

const assignmentGroups = computed(() => {
  const byKey = new Map<string, { id: string; name: string; active: boolean | null }>()
  for (const group of rawGroups.value) {
    const id = String(group.group_id ?? group.id)
    if (!byKey.has(id)) {
      byKey.set(id, {
        id,
        name: group.group_name || 'Без названия',
        active: group.is_active ?? null,
      })
    }
  }
  const query = groupQuery.value.trim().toLowerCase()
  return Array.from(byKey.values())
    .filter((group) => !query || group.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const filtered = computed(() => {
  const query = filters.query.trim().toLowerCase()
  const digits = query.replace(/\D/g, '')

  return students.value.filter((student) => {
    if (filters.groupId !== 'all' && groupNameOf(student) !== filters.groupId) return false
    if (!query) return true

    const nameHit = student.name.toLowerCase().includes(query)
    const groupHit = groupNameOf(student).toLowerCase().includes(query)
    const phoneHit = digits.length > 1 && student.parent_phone.replace(/\D/g, '').includes(digits)
    return nameHit || groupHit || phoneHit
  })
})

const filtersActive = computed(() => filters.query.trim() !== '' || filters.groupId !== 'all')

const state = computed(() => {
  if (loading.value) return 'loading' as const
  if (loadError.value) return 'error' as const
  if (!filtered.value.length) return 'empty' as const
  return 'ready' as const
})

const emptyCopy = computed(() => {
  if (filtersActive.value) {
    return {
      title: 'Ничего не нашлось',
      hint: 'Ни один ученик не подходит под фильтры. Сбросьте их, чтобы увидеть весь список.',
    }
  }
  return subscribedMode.value
    ? {
        title: 'Абонементов пока нет',
        hint: 'Оформите абонемент на экране «Пробные» — ученик появится здесь.',
      }
    : {
        title: 'Все дети оформлены',
        hint: 'Никто не остался без абонемента — здесь появятся те, кто пришёл на пробное, но ещё не оформился.',
      }
})

function isSaving(student: AcademyStudent): boolean {
  return savingIds.value[student.id] === true
}

function setSaving(student: AcademyStudent, value: boolean) {
  savingIds.value = setPending(savingIds.value, student.id, value)
}

function resetFilters() {
  filters.query = ''
  filters.groupId = 'all'
}

/** Смена статуса убирает ученика из текущего режима — режимы взаимоисключающие. */
async function setSubscribed(student: AcademyStudent, subscribed: boolean) {
  setSaving(student, true)
  actionError.value = ''
  try {
    await setStudentSubscribed(props.sport, student.id, subscribed)
    students.value = students.value.filter((item) => item.id !== student.id)
    confirmingId.value = ''
  } catch (e) {
    actionError.value =
      e instanceof Error
        ? e.message
        : subscribed
          ? 'Не удалось оформить абонемент'
          : 'Не удалось снять абонемент'
  } finally {
    setSaving(student, false)
  }
}

function openGroupAssign(student: AcademyStudent) {
  assigningStudent.value = student
  assigningGroupId.value = String(student.assigned_group_id ?? '')
  groupQuery.value = ''
  groupAssignError.value = ''
}

function closeGroupAssign() {
  if (groupAssigning.value) return
  assigningStudent.value = null
}

async function assignToGroup() {
  const student = assigningStudent.value
  if (!student || !assigningGroupId.value) {
    groupAssignError.value = 'Выберите группу.'
    return
  }

  groupAssigning.value = true
  groupAssignError.value = ''
  try {
    await assignStudentToGroup(assigningGroupId.value, { student_id: student.id })
    const group = assignmentGroups.value.find((item) => item.id === assigningGroupId.value)
    students.value = students.value.map((item) =>
      item.id === student.id
        ? {
            ...item,
            assigned_group_id: assigningGroupId.value,
            assigned_group_name: group?.name ?? item.assigned_group_name,
            assigned_group: group?.name ?? item.assigned_group,
          }
        : item,
    )
    assigningStudent.value = null
  } catch (e) {
    groupAssignError.value =
      e instanceof Error ? e.message : 'Не удалось назначить группу. Проверьте API.'
  } finally {
    groupAssigning.value = false
  }
}

const MODES = [
  { value: 'unsubscribed' as const, label: 'Без абонемента' },
  { value: 'subscribed' as const, label: 'С абонементом' },
]

const tabClass = (active: boolean) =>
  [
    'focus-ring rounded-lg px-3.5 py-1.5 text-theme-sm font-semibold transition-colors duration-150',
    active
      ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  ].join(' ')
</script>

<template>
  <AdminLayout>
    <AcademyHeader
      :sport="sport"
      title="Ученики"
      subtitle="Кто уже платит за абонемент, а кого ещё нужно догнать после пробного занятия."
    >
      <template #actions>
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
      </template>
    </AcademyHeader>

    <section :class="panel">
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Статус абонемента"
            class="inline-flex w-fit gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
          >
            <button
              v-for="mode in MODES"
              :key="mode.value"
              type="button"
              role="tab"
              :aria-selected="filters.mode === mode.value"
              :class="tabClass(filters.mode === mode.value)"
              @click="filters.mode = mode.value"
            >
              {{ mode.label }}
            </button>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="relative sm:w-52">
              <label class="sr-only" for="student-group">Группа</label>
              <select id="student-group" v-model="filters.groupId" :class="select">
                <option value="all">Все группы</option>
                <option v-for="name in groupOptions" :key="name" :value="name">{{ name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              />
            </div>

            <div class="relative sm:w-64">
              <label class="sr-only" for="student-search">Поиск</label>
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <input
                id="student-search"
                v-model="filters.query"
                type="search"
                placeholder="Имя, телефон, группа"
                :class="[inputSm, 'pl-9']"
              />
            </div>
          </div>
        </div>

        <button
          v-if="filtersActive"
          type="button"
          :class="[buttonGhost, buttonSize.sm, 'mt-3']"
          @click="resetFilters"
        >
          <X class="h-3.5 w-3.5" aria-hidden="true" />
          Сбросить фильтры
        </button>
      </div>

      <p
        v-if="actionError"
        class="border-b border-error-200 bg-error-50 px-5 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300 sm:px-6"
        role="alert"
      >
        {{ actionError }}
      </p>
      <p
        v-if="handoffError"
        class="border-b border-warning-200 bg-warning-50 px-5 py-3 text-theme-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200 sm:px-6"
        role="alert"
      >
        {{ handoffError }}
      </p>

      <StateBlock
        :state="state"
        :error="loadError"
        :rows="6"
        :empty-title="emptyCopy.title"
        :empty-hint="emptyCopy.hint"
        @retry="load"
      >
        <template #icon><GraduationCap class="h-5 w-5" aria-hidden="true" /></template>

        <table class="hidden w-full lg:table">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th :class="th">Ребёнок</th>
              <th :class="th">Контакт родителя</th>
              <th :class="th">Группа</th>
              <th :class="[th, 'text-right']">Пробных</th>
              <th :class="[th, 'text-right']">Действие</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="student in filtered"
              :key="student.id"
              class="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/70 dark:hover:bg-white/[0.02]"
            >
              <td :class="[td, 'w-[26%]']">
                <PersonCell
                  :name="student.name"
                  :age="student.age"
                  :birthdate="student.birthdate"
                />
              </td>
              <td :class="[td, 'w-[24%]']">
                <ContactActions
                  :phone="student.parent_phone"
                  :handoff="handoffFor(student.parent_phone)"
                  :handoff-pending="handoffPending(student.parent_phone)"
                  @handoff="toggleHandoff(student.parent_phone)"
                />
              </td>
              <td :class="[td, 'w-[22%]']">
                <StatusPill v-if="groupNameOf(student)" tone="neutral">
                  {{ groupNameOf(student) }}
                </StatusPill>
                <span v-else class="text-theme-xs text-gray-600 dark:text-gray-400">
                  Группа не назначена
                </span>
              </td>
              <td
                :class="[
                  td,
                  'w-[10%] text-right tabular-nums text-theme-sm text-gray-800 dark:text-gray-200',
                ]"
              >
                {{ student.total_trials }}
              </td>
              <td :class="[td, 'w-[18%]']">
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    v-if="!subscribedMode"
                    type="button"
                    :class="[buttonPrimary, buttonSize.sm]"
                    :disabled="isSaving(student)"
                    @click="setSubscribed(student, true)"
                  >
                    <LoaderCircle
                      v-if="isSaving(student)"
                      class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    <UserPlus v-else class="h-3.5 w-3.5" aria-hidden="true" />
                    Оформить
                  </button>

                  <div v-else-if="confirmingId === student.id" class="flex items-center gap-2">
                    <span class="text-theme-xs text-gray-700 dark:text-gray-300">Снять?</span>
                    <button
                      type="button"
                      :class="[buttonDanger, buttonSize.sm]"
                      :disabled="isSaving(student)"
                      @click="setSubscribed(student, false)"
                    >
                      Да, снять
                    </button>
                    <button
                      type="button"
                      :class="[buttonGhost, buttonSize.sm]"
                      @click="confirmingId = ''"
                    >
                      Отмена
                    </button>
                  </div>

                  <button
                    v-else
                    type="button"
                    :class="[buttonGhost, buttonSize.sm]"
                    @click="confirmingId = student.id"
                  >
                    Снять абонемент
                  </button>

                  <button
                    type="button"
                    :class="[buttonSecondary, buttonSize.sm]"
                    @click="openGroupAssign(student)"
                  >
                    Назначить группу
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
          <li v-for="student in filtered" :key="student.id" class="px-5 py-4 sm:px-6">
            <div class="flex items-start justify-between gap-3">
              <PersonCell :name="student.name" :age="student.age" :birthdate="student.birthdate" />
              <StatusPill v-if="groupNameOf(student)" tone="neutral">
                {{ groupNameOf(student) }}
              </StatusPill>
            </div>

            <div class="mt-3">
              <ContactActions
                :phone="student.parent_phone"
                :handoff="handoffFor(student.parent_phone)"
                :handoff-pending="handoffPending(student.parent_phone)"
                @handoff="toggleHandoff(student.parent_phone)"
              />
            </div>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span class="text-theme-xs text-gray-600 dark:text-gray-400">
                Пробных: {{ student.total_trials }}
              </span>
              <div class="flex flex-wrap justify-end gap-2">
                <button
                  v-if="!subscribedMode"
                  type="button"
                  :class="[buttonPrimary, buttonSize.sm]"
                  :disabled="isSaving(student)"
                  @click="setSubscribed(student, true)"
                >
                  <UserPlus class="h-3.5 w-3.5" aria-hidden="true" />
                  Оформить абонемент
                </button>
                <template v-else>
                  <div v-if="confirmingId === student.id" class="flex items-center gap-2">
                    <button
                      type="button"
                      :class="[buttonDanger, buttonSize.sm]"
                      :disabled="isSaving(student)"
                      @click="setSubscribed(student, false)"
                    >
                      Да, снять
                    </button>
                    <button
                      type="button"
                      :class="[buttonGhost, buttonSize.sm]"
                      @click="confirmingId = ''"
                    >
                      Отмена
                    </button>
                  </div>
                  <button
                    v-else
                    type="button"
                    :class="[buttonGhost, buttonSize.sm]"
                    @click="confirmingId = student.id"
                  >
                    Снять абонемент
                  </button>
                </template>
                <button
                  type="button"
                  :class="[buttonSecondary, buttonSize.sm]"
                  @click="openGroupAssign(student)"
                >
                  Назначить группу
                </button>
              </div>
            </div>
          </li>
        </ul>
      </StateBlock>
    </section>

    <p class="mt-4 flex items-start gap-2 text-theme-xs text-gray-600 dark:text-gray-400">
      <Users class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Список формируется из пробных заявок бота: ребёнок попадает сюда после первого занятия.
    </p>

    <Modal v-if="assigningStudent" :fullScreenBackdrop="true" @close="closeGroupAssign">
      <template #body>
        <form
          class="relative z-10 mx-4 my-8 w-full max-w-xl rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-6"
          @submit.prevent="assignToGroup"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Назначить группу</h2>
              <p class="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                {{ assigningStudent.name }}
              </p>
            </div>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeGroupAssign">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="relative mb-4">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />
            <input
              v-model="groupQuery"
              type="search"
              placeholder="Поиск группы"
              :class="[inputSm, 'pl-9']"
            />
          </div>

          <div
            class="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <label
              v-for="group in assignmentGroups"
              :key="group.id"
              class="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
            >
              <span class="min-w-0">
                <span
                  class="block truncate text-theme-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ group.name }}
                </span>
                <span
                  class="mt-1 block text-theme-xs"
                  :class="
                    group.active === false
                      ? 'text-warning-700 dark:text-warning-300'
                      : 'text-gray-600 dark:text-gray-400'
                  "
                >
                  {{ group.active === false ? 'Отключена' : 'Активна' }}
                </span>
              </span>
              <input
                v-model="assigningGroupId"
                type="radio"
                name="student-group-assignment"
                :value="group.id"
                class="h-4 w-4 border-gray-300 text-pitch-600 focus:ring-pitch-500"
              />
            </label>
            <p
              v-if="!assignmentGroups.length"
              class="px-4 py-8 text-center text-theme-sm text-gray-600 dark:text-gray-400"
            >
              Группы не найдены.
            </p>
          </div>

          <p
            v-if="groupAssignError"
            class="mt-4 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ groupAssignError }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="groupAssigning"
              @click="closeGroupAssign"
            >
              Отмена
            </button>
            <button
              type="submit"
              :class="[buttonPrimary, buttonSize.sm]"
              :disabled="groupAssigning"
            >
              <LoaderCircle
                v-if="groupAssigning"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Сохранить
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </AdminLayout>
</template>
