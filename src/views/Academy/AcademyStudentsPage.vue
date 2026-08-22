<script setup lang="ts">
/**
 * Ученики академии: воронка «пробное → абонемент».
 *
 * Два состояния из ТЗ §4.2 (`subscribed`) — это два разных занятия менеджера:
 * догнать тех, кто пришёл и не оформился, и вести тех, кто уже платит. Поэтому
 * переключатель режима, а не один общий список.
 */
import { computed, onMounted, ref, watch } from 'vue'
import {
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ChevronDownIcon } from '@/icons'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import ContactActions from '@/components/academy/ContactActions.vue'
import PersonCell from '@/components/academy/PersonCell.vue'
import StateBlock from '@/components/academy/StateBlock.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
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
  listStudents,
  setStudentSubscribed,
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
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const savingIds = ref<PendingMap<string>>({})
/** Подтверждение снятия абонемента прямо в строке — вместо модалки. */
const confirmingId = ref('')

const subscribedMode = computed(() => filters.mode === 'subscribed')

async function load() {
  loading.value = true
  confirmingId.value = ''
  try {
    students.value = await listStudents(props.sport, subscribedMode.value)
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
          @click="
            filters.query = '';
            filters.groupId = 'all'
          "
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
              <td :class="[td, 'w-[10%] text-right tabular-nums text-theme-sm text-gray-800 dark:text-gray-200']">
                {{ student.total_trials }}
              </td>
              <td :class="[td, 'w-[18%]']">
                <div class="flex justify-end">
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
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
          <li v-for="student in filtered" :key="student.id" class="px-5 py-4 sm:px-6">
            <div class="flex items-start justify-between gap-3">
              <PersonCell
                :name="student.name"
                :age="student.age"
                :birthdate="student.birthdate"
              />
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
            </div>
          </li>
        </ul>
      </StateBlock>
    </section>

    <p class="mt-4 flex items-start gap-2 text-theme-xs text-gray-600 dark:text-gray-400">
      <Users class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Список формируется из пробных заявок бота: ребёнок попадает сюда после первого занятия.
    </p>
  </AdminLayout>
</template>
