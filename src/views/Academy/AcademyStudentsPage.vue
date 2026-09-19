<script setup lang="ts">
/**
 * Ученики академии: воронка «пробное → абонемент».
 *
 * Два состояния из ТЗ §4.2 (`subscribed`) — это два разных занятия менеджера:
 * догнать тех, кто пришёл и не оформился, и вести тех, кто уже платит. Поэтому
 * переключатель режима, а не один общий список.
 *
 * Второй переключатель — «Все виды спорта»: раньше кросс-спортивный список
 * (GET /manager/academy_users без group_type) жил на отдельной странице, но
 * заводить два похожих списка учеников неудобно менеджеру. Здесь один список
 * с двумя источниками данных: sport-scoped ручки для обычного режима и
 * менеджерские — когда включено «Все» (там же обрабатываются sibling-записи
 * при переносе ребёнка в другой вид спорта).
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  EllipsisVertical,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserMinus,
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
import Modal from '@/components/ui/Modal.vue'
import {
  buttonDanger,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  input,
  inputSm,
  label as labelClass,
  panel,
  select,
  td,
  th,
} from '@/components/academy/ui'
import { useBotHandoff } from '@/composables/useBotHandoff'
import {
  assignAcademyUser,
  assignStudent as assignAcademyStudent,
  createAcademyUser,
  createStudent,
  deassignAcademyUser,
  deassignStudent,
  listAcademyUsers,
  listGroups,
  listStudents,
  setStudentSubscribed,
  updateAcademyUser,
  updateStudent,
  SPORTS,
  SPORT_KEYS,
  type AcademyUserExperience,
  type AcademyUserSchoolShift,
  type AcademyGroup,
  type AcademyStudent,
  type SportKey,
} from '@/services/academy'
import { hasPermission, permittedAcademySports } from '@/services/rbac'
import { useAcademyStore } from '@/stores/academy'
import { useAuthStore } from '@/stores/auth'
import { setPending, type PendingMap } from '@/utils/pending'

const props = defineProps<{ sport: SportKey }>()

const route = useRoute()
const router = useRouter()
const academy = useAcademyStore()
const auth = useAuthStore()
const filters = academy.studentFilters
const {
  load: loadHandoff,
  stateFor: handoffFor,
  isPending: handoffPending,
  toggle: toggleHandoff,
  error: handoffError,
} = useBotHandoff()

/** Виден только тем, кому не привязан один вид спорта (см. rbac.ts). */
const canViewAllSports = computed(() => hasPermission(auth.role, 'academyUsers'))
const showAllSports = ref(false)

type ScopeOption = SportKey | 'all'

/**
 * Один выпадающий список вместо переключателя направления в шапке (он
 * скрыт через hideSportSwitcher) и двух некрасивых кнопок-вкладок: сюда же
 * переехал выбор футбол/бокс, чтобы не дублировать один и тот же контрол.
 */
const scopeOptions = computed(() => {
  const options: { value: ScopeOption; label: string }[] = []
  if (canViewAllSports.value) options.push({ value: 'all', label: 'Все виды спорта' })
  options.push(
    ...permittedAcademySports(auth.role).map((key) => ({ value: key, label: SPORTS[key].label })),
  )
  return options
})

const scopeSelection = computed<ScopeOption>({
  get: () => (showAllSports.value ? 'all' : props.sport),
  set: (value) => {
    if (value === 'all') {
      showAllSports.value = true
      return
    }
    showAllSports.value = false
    if (value !== props.sport) {
      router.push(route.path.replace(`/${props.sport}`, `/${value}`))
    }
  },
})

const students = ref<AcademyStudent[]>([])
const groupsBySport = ref<Record<SportKey, AcademyGroup[]>>({ football: [], boxing: [] })
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const savingIds = ref<PendingMap<number>>({})
const assignmentSavingIds = ref<PendingMap<number>>({})
/** Подтверждение снятия абонемента — отдельный шаг внутри модалки действий. */
const assigningStudent = ref<AcademyStudent | null>(null)
const assigningSport = ref<SportKey>(props.sport)
const assigningGroupId = ref('')
const groupQuery = ref('')
const groupAssigning = ref(false)
const groupAssignError = ref('')
const createOpen = ref(false)
const createSaving = ref(false)
const createError = ref('')
const createForm = ref({
  name: '',
  birthYear: '',
  parentPhone: '',
  groupId: '',
  experience: '' as AcademyUserExperience | '',
  schoolShift: '' as AcademyUserSchoolShift | '',
})
const editingStudent = ref<AcademyStudent | null>(null)
const editSaving = ref(false)
const editError = ref('')
const editForm = ref({
  name: '',
  birthYear: '',
  parentPhone: '',
  totalTrials: '',
  subscribed: false,
  experience: '' as AcademyUserExperience | '',
  schoolShift: '' as AcademyUserSchoolShift | '',
})
/** Компактное меню действий строки — вместо кнопок, которые не помещались на мобильных (см. #5). */
const actionsStudent = ref<AcademyStudent | null>(null)
const actionsConfirmUnsub = ref(false)

const subscribedMode = computed(() => filters.mode === 'subscribed')

async function loadGroupOptions() {
  try {
    groupsBySport.value = {
      ...groupsBySport.value,
      [props.sport]: await listGroups(props.sport),
    }
  } catch {
    groupsBySport.value = { ...groupsBySport.value, [props.sport]: [] }
  }

  if (!showAllSports.value) return

  const otherSport: SportKey = props.sport === 'football' ? 'boxing' : 'football'
  try {
    groupsBySport.value = { ...groupsBySport.value, [otherSport]: await listGroups(otherSport) }
  } catch {
    groupsBySport.value = { ...groupsBySport.value, [otherSport]: [] }
  }
}

async function load() {
  loading.value = true
  actionsStudent.value = null
  try {
    if (showAllSports.value) {
      const all = await listAcademyUsers()
      students.value = all.filter(
        (student) => (student.subscribed === true) === subscribedMode.value,
      )
    } else {
      students.value = await listStudents(props.sport, subscribedMode.value)
    }
    loadError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить учеников'
  } finally {
    loading.value = false
  }

  await loadGroupOptions()

  loadHandoff()
}

onMounted(load)
watch([() => props.sport, () => filters.mode, showAllSports], load)

/** id группы → название и вид спорта — нужно только когда включено «Все». */
const groupIndex = computed(() => {
  const map = new Map<number, { name: string; sport: SportKey }>()
  for (const sport of SPORT_KEYS) {
    for (const group of groupsBySport.value[sport]) {
      const id = Number(group.group_id ?? group.id)
      if (!Number.isFinite(id) || map.has(id)) continue
      map.set(id, { name: group.group_name || 'Без названия', sport })
    }
  }
  return map
})

function groupNameOf(student: AcademyStudent): string {
  const groupId = Number(student.assigned_group_id)
  const known = Number.isFinite(groupId) ? groupIndex.value.get(groupId) : undefined
  return student.assigned_group_name || student.assigned_group || known?.name || ''
}

function sportOf(student: AcademyStudent): SportKey | null {
  const groupId = Number(student.assigned_group_id)
  if (!Number.isFinite(groupId)) return null
  return groupIndex.value.get(groupId)?.sport ?? null
}

function phoneOf(student: AcademyStudent): string {
  return student.parent_phone || ''
}

/** Все группы выбранного охвата — а не только те, где уже кто-то учится. */
const groupOptions = computed(() => {
  const sports = showAllSports.value ? SPORT_KEYS : [props.sport]
  const names = new Set<string>()
  for (const sport of sports) {
    for (const group of groupsBySport.value[sport]) {
      names.add(group.group_name || 'Без названия')
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'))
})

function dedupeGroups(
  rows: AcademyGroup[],
): { id: number; name: string; active: boolean | null }[] {
  const byId = new Map<number, { id: number; name: string; active: boolean | null }>()
  for (const group of rows) {
    const id = Number(group.group_id ?? group.id)
    if (!Number.isFinite(id) || byId.has(id)) continue
    byId.set(id, { id, name: group.group_name || 'Без названия', active: group.is_active ?? null })
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Группы текущего спорта — пикер в форме создания (только для sport-scoped создания). */
const currentSportGroupOptions = computed(() => dedupeGroups(groupsBySport.value[props.sport]))

/** Группы выбранного в модалке назначения вида спорта, с поиском. */
const assignGroupOptions = computed(() => {
  const sport = showAllSports.value ? assigningSport.value : props.sport
  const options = dedupeGroups(groupsBySport.value[sport])
  const q = groupQuery.value.trim().toLowerCase()
  return q ? options.filter((group) => group.name.toLowerCase().includes(q)) : options
})

const filtered = computed(() => {
  const query = filters.query.trim().toLowerCase()
  const digits = query.replace(/\D/g, '')

  return students.value.filter((student) => {
    if (filters.groupId !== 'all' && groupNameOf(student) !== filters.groupId) return false
    if (!query) return true

    const nameHit = student.name.toLowerCase().includes(query)
    const groupHit = groupNameOf(student).toLowerCase().includes(query)
    const phoneHit = digits.length > 1 && phoneOf(student).replace(/\D/g, '').includes(digits)
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

function isAssignmentSaving(student: AcademyStudent): boolean {
  return assignmentSavingIds.value[student.id] === true
}

function setAssignmentSaving(student: AcademyStudent, value: boolean) {
  assignmentSavingIds.value = setPending(assignmentSavingIds.value, student.id, value)
}

function resetFilters() {
  filters.query = ''
  filters.groupId = 'all'
}

function resetCreateForm() {
  groupQuery.value = ''
  createForm.value = {
    name: '',
    birthYear: '',
    parentPhone: '',
    groupId: '',
    experience: '',
    schoolShift: '',
  }
  createError.value = ''
}

function selectDefaultCreateGroup() {
  const group =
    currentSportGroupOptions.value.find((item) => item.active !== false) ??
    currentSportGroupOptions.value[0]
  createForm.value.groupId = group ? String(group.id) : ''
}

async function openCreate() {
  resetCreateForm()
  createOpen.value = true
  if (!showAllSports.value) {
    if (!groupsBySport.value[props.sport].length) {
      await loadGroupOptions()
    }
    selectDefaultCreateGroup()
  }
}

function closeCreate() {
  if (createSaving.value) return
  createOpen.value = false
}

/**
 * Год рождения приходит из `<input type="number">`: Vue кастует v-model к
 * числу автоматически, даже без модификатора `.number` — значение здесь может
 * быть и строкой, и числом, поэтому оборачиваем в `String()` перед `.trim()`.
 */
function optionalNumber(value: string | number): number | null | undefined {
  const trimmed = String(value).trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function requiredNumber(value: string | number): number | null {
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

async function saveCreate() {
  if (createSaving.value) return

  const name = createForm.value.name.trim()
  const birthYear = optionalNumber(createForm.value.birthYear)

  if (!name) {
    createError.value = 'Введите имя ученика.'
    return
  }
  if (birthYear === null) {
    createError.value = 'Год рождения должен быть числом.'
    return
  }

  const groupValue = showAllSports.value ? '' : String(createForm.value.groupId).trim()
  const groupId = Number(groupValue)

  createSaving.value = true
  createError.value = ''
  try {
    const profile = {
      name,
      ...(birthYear !== undefined ? { birth_year: birthYear } : {}),
      ...(createForm.value.parentPhone.trim()
        ? { parent_phone: createForm.value.parentPhone.trim() }
        : {}),
      total_trials: 0,
      subscribed: false,
      ...(createForm.value.experience ? { experience: createForm.value.experience } : {}),
      ...(createForm.value.schoolShift ? { school_shift: createForm.value.schoolShift } : {}),
    }

    if (groupValue && Number.isFinite(groupId) && groupId > 0) {
      await createStudent(props.sport, { ...profile, assigned_group_id: groupId })
    } else {
      await createAcademyUser(profile)
    }

    createOpen.value = false
    await load()
  } catch (e) {
    createError.value =
      e instanceof Error ? e.message : 'Не удалось создать ученика. Проверьте API.'
  } finally {
    createSaving.value = false
  }
}

function openEdit(student: AcademyStudent) {
  editingStudent.value = student
  editForm.value = {
    name: student.name,
    birthYear: student.birth_year == null ? '' : String(student.birth_year),
    parentPhone: student.parent_phone ?? '',
    totalTrials: student.total_trials == null ? '' : String(student.total_trials),
    subscribed: student.subscribed === true,
    experience: student.experience ?? '',
    schoolShift: student.school_shift ?? '',
  }
  editError.value = ''
}

function closeEdit() {
  if (editSaving.value) return
  editingStudent.value = null
}

async function saveEdit() {
  const student = editingStudent.value
  if (!student || editSaving.value) return

  const name = editForm.value.name.trim()
  const birthYear = optionalNumber(editForm.value.birthYear)
  const totalTrials = editForm.value.totalTrials.trim()
    ? requiredNumber(editForm.value.totalTrials)
    : undefined

  if (!name) {
    editError.value = 'Введите имя ученика.'
    return
  }
  if (birthYear === null) {
    editError.value = 'Год рождения должен быть числом.'
    return
  }
  if (totalTrials === null) {
    editError.value = 'Количество пробных должно быть числом.'
    return
  }

  editSaving.value = true
  editError.value = ''
  try {
    const patch = {
      name,
      birth_year: birthYear ?? null,
      parent_phone: editForm.value.parentPhone.trim() || null,
      total_trials: totalTrials ?? 0,
      subscribed: editForm.value.subscribed,
      experience: editForm.value.experience || null,
      school_shift: editForm.value.schoolShift || null,
    }
    const updated = showAllSports.value
      ? await updateAcademyUser(student.id, patch)
      : await updateStudent(props.sport, student.id, patch)
    students.value = students.value.map((item) => (item.id === student.id ? updated : item))
    editingStudent.value = null
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Не удалось сохранить ученика.'
  } finally {
    editSaving.value = false
  }
}

/** Смена статуса убирает ученика из текущего режима — режимы взаимоисключающие. */
async function setSubscribed(student: AcademyStudent, subscribed: boolean) {
  setSaving(student, true)
  actionError.value = ''
  try {
    if (showAllSports.value) {
      await updateAcademyUser(student.id, { subscribed })
    } else {
      await setStudentSubscribed(props.sport, student.id, subscribed)
    }
    students.value = students.value.filter((item) => item.id !== student.id)
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
  assigningSport.value = showAllSports.value ? (sportOf(student) ?? props.sport) : props.sport
  assigningGroupId.value = showAllSports.value ? '' : String(student.assigned_group_id ?? '')
  groupQuery.value = ''
  groupAssignError.value = ''
}

function closeGroupAssign() {
  if (groupAssigning.value) return
  assigningStudent.value = null
}

function selectAssignSport(sport: SportKey) {
  assigningSport.value = sport
  assigningGroupId.value = ''
}

async function assignToGroup() {
  const student = assigningStudent.value
  const groupId = Number(assigningGroupId.value)
  if (!student || !Number.isFinite(groupId) || groupId <= 0) {
    groupAssignError.value = 'Выберите группу.'
    return
  }

  groupAssigning.value = true
  groupAssignError.value = ''
  try {
    if (showAllSports.value) {
      await assignAcademyUser(student.id, { group_id: groupId })
      assigningStudent.value = null
      // Назначение в другой вид спорта может создать sibling-запись — проще
      // перечитать список целиком, чем аккуратно патчить его локально.
      await load()
    } else {
      await assignAcademyStudent(props.sport, student.id, { group_id: groupId })
      const group = assignGroupOptions.value.find((item) => item.id === groupId)
      students.value = students.value.map((item) =>
        item.id === student.id
          ? {
              ...item,
              assigned_group_id: groupId,
              assigned_group_name: group?.name ?? item.assigned_group_name,
              assigned_group: group?.name ?? item.assigned_group,
            }
          : item,
      )
      assigningStudent.value = null
    }
  } catch (e) {
    groupAssignError.value =
      e instanceof Error ? e.message : 'Не удалось назначить группу. Проверьте API.'
  } finally {
    groupAssigning.value = false
  }
}

async function deassignFromGroup(student: AcademyStudent) {
  setAssignmentSaving(student, true)
  actionError.value = ''
  try {
    if (showAllSports.value) {
      await deassignAcademyUser(student.id)
    } else {
      await deassignStudent(props.sport, student.id)
    }
    students.value = students.value.map((item) =>
      item.id === student.id
        ? { ...item, assigned_group_id: null, assigned_group_name: null, assigned_group: '' }
        : item,
    )
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось снять группу.'
  } finally {
    setAssignmentSaving(student, false)
  }
}

// ── Меню действий строки (см. #5: кнопки в ряд не помещались на мобильных) ──

function openActions(student: AcademyStudent) {
  actionsStudent.value = student
  actionsConfirmUnsub.value = false
}

function closeActions() {
  const student = actionsStudent.value
  if (student && isSaving(student)) return
  actionsStudent.value = null
  actionsConfirmUnsub.value = false
}

function actionsEdit() {
  const student = actionsStudent.value
  if (!student) return
  closeActions()
  openEdit(student)
}

function actionsAssign() {
  const student = actionsStudent.value
  if (!student) return
  closeActions()
  openGroupAssign(student)
}

async function actionsDeassign() {
  const student = actionsStudent.value
  if (!student) return
  closeActions()
  await deassignFromGroup(student)
}

async function actionsSetSubscribed(subscribed: boolean) {
  const student = actionsStudent.value
  if (!student) return
  await setSubscribed(student, subscribed)
  actionsStudent.value = null
  actionsConfirmUnsub.value = false
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
      :hide-sport-switcher="true"
    >
      <template #actions>
        <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="openCreate">
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          Добавить ученика
        </button>
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
            <div v-if="scopeOptions.length > 1" class="relative sm:w-44">
              <label class="sr-only" for="student-scope">Вид спорта</label>
              <select id="student-scope" v-model="scopeSelection" :class="select">
                <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              />
            </div>

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
              <th :class="[th, 'text-right']">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="student in filtered"
              :key="student.id"
              class="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/70 dark:hover:bg-white/[0.02]"
            >
              <td :class="[td, 'w-[28%]']">
                <PersonCell
                  :name="student.name"
                  :age="student.age"
                  :birthdate="student.birthdate"
                />
              </td>
              <td :class="[td, 'w-[26%]']">
                <ContactActions
                  :phone="phoneOf(student)"
                  :handoff="handoffFor(phoneOf(student))"
                  :handoff-pending="handoffPending(phoneOf(student))"
                  @handoff="toggleHandoff(phoneOf(student))"
                />
              </td>
              <td :class="[td, 'w-[24%]']">
                <div class="flex flex-wrap items-center gap-1.5">
                  <StatusPill v-if="groupNameOf(student)" tone="neutral">
                    {{ groupNameOf(student) }}
                  </StatusPill>
                  <span v-else class="text-theme-xs text-gray-600 dark:text-gray-400">
                    Группа не назначена
                  </span>
                  <StatusPill v-if="showAllSports && sportOf(student)" tone="info">
                    {{ SPORTS[sportOf(student)!].label }}
                  </StatusPill>
                </div>
              </td>
              <td
                :class="[
                  td,
                  'w-[10%] text-right tabular-nums text-theme-sm text-gray-800 dark:text-gray-200',
                ]"
              >
                {{ student.total_trials ?? 0 }}
              </td>
              <td :class="[td, 'w-[12%] text-right']">
                <button
                  type="button"
                  :class="[buttonSecondary, buttonSize.sm]"
                  @click="openActions(student)"
                >
                  <EllipsisVertical class="h-3.5 w-3.5" aria-hidden="true" />
                  Действия
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
          <li v-for="student in filtered" :key="student.id" class="px-5 py-4 sm:px-6">
            <div class="flex items-start justify-between gap-3">
              <PersonCell :name="student.name" :age="student.age" :birthdate="student.birthdate" />
              <button
                type="button"
                :class="[buttonSecondary, buttonSize.sm, 'shrink-0']"
                @click="openActions(student)"
              >
                <EllipsisVertical class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div class="mt-3">
              <ContactActions
                :phone="phoneOf(student)"
                :handoff="handoffFor(phoneOf(student))"
                :handoff-pending="handoffPending(phoneOf(student))"
                @handoff="toggleHandoff(phoneOf(student))"
              />
            </div>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <StatusPill v-if="groupNameOf(student)" tone="neutral">
                  {{ groupNameOf(student) }}
                </StatusPill>
                <span v-else class="text-theme-xs text-gray-600 dark:text-gray-400">
                  Группа не назначена
                </span>
                <StatusPill v-if="showAllSports && sportOf(student)" tone="info">
                  {{ SPORTS[sportOf(student)!].label }}
                </StatusPill>
              </div>
              <span class="text-theme-xs text-gray-600 dark:text-gray-400">
                Пробных: {{ student.total_trials ?? 0 }}
              </span>
            </div>
          </li>
        </ul>
      </StateBlock>
    </section>

    <p class="mt-4 flex items-start gap-2 text-theme-xs text-gray-600 dark:text-gray-400">
      <Users class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Список формируется из пробных заявок бота: ребёнок попадает сюда после первого занятия.
    </p>

    <Modal v-if="createOpen" :fullScreenBackdrop="true" @close="closeCreate">
      <template #body>
        <form
          class="relative z-10 mx-4 my-4 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:my-8 sm:p-6"
          novalidate
          @submit.prevent="saveCreate"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Добавить ученика</h2>
            </div>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeCreate">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label :class="labelClass" for="academy-user-name">Имя ученика</label>
              <input
                id="academy-user-name"
                v-model="createForm.name"
                type="text"
                autocomplete="name"
                :class="input"
              />
            </div>

            <div>
              <label :class="labelClass" for="academy-user-birth-year">Год рождения</label>
              <input
                id="academy-user-birth-year"
                v-model="createForm.birthYear"
                type="number"
                inputmode="numeric"
                min="2000"
                max="2030"
                :class="input"
              />
            </div>

            <div>
              <label :class="labelClass" for="academy-user-phone">Телефон родителя</label>
              <input
                id="academy-user-phone"
                v-model="createForm.parentPhone"
                type="tel"
                autocomplete="tel"
                :class="input"
              />
            </div>

            <div v-if="!showAllSports" class="sm:col-span-2">
              <label :class="labelClass" for="academy-user-group">Группа</label>
              <div class="relative">
                <select id="academy-user-group" v-model="createForm.groupId" :class="select">
                  <option value="">Без группы</option>
                  <option
                    v-for="group in currentSportGroupOptions"
                    :key="group.id"
                    :value="String(group.id)"
                  >
                    {{ group.name }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>
            <p v-else class="sm:col-span-2 text-theme-xs text-gray-600 dark:text-gray-400">
              Группу назначите отдельным действием после создания — так же, как и перевод между
              футболом и боксом.
            </p>

            <div>
              <label :class="labelClass" for="academy-user-experience">Опыт</label>
              <div class="relative">
                <select
                  id="academy-user-experience"
                  v-model="createForm.experience"
                  :class="select"
                >
                  <option value="">Не указан</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>

            <div>
              <label :class="labelClass" for="academy-user-school-shift">Смена</label>
              <div class="relative">
                <select
                  id="academy-user-school-shift"
                  v-model="createForm.schoolShift"
                  :class="select"
                >
                  <option value="">Не указана</option>
                  <option value="morning">Утро</option>
                  <option value="afternoon">День</option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>
          </div>

          <p
            v-if="createError"
            class="mt-4 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ createError }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="createSaving"
              @click="closeCreate"
            >
              Отмена
            </button>
            <button
              type="button"
              :class="[buttonPrimary, buttonSize.sm]"
              :disabled="createSaving"
              @click="saveCreate"
            >
              <LoaderCircle
                v-if="createSaving"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Создать
            </button>
          </div>
        </form>
      </template>
    </Modal>

    <Modal v-if="editingStudent" :fullScreenBackdrop="true" @close="closeEdit">
      <template #body>
        <form
          class="relative z-10 mx-4 my-4 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:my-8 sm:p-6"
          novalidate
          @submit.prevent="saveEdit"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Изменить ученика</h2>
              <p class="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                Группа меняется отдельным действием.
              </p>
            </div>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeEdit">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label :class="labelClass" for="edit-academy-user-name">Имя ученика</label>
              <input
                id="edit-academy-user-name"
                v-model="editForm.name"
                type="text"
                :class="input"
              />
            </div>

            <div>
              <label :class="labelClass" for="edit-academy-user-birth-year">Год рождения</label>
              <input
                id="edit-academy-user-birth-year"
                v-model="editForm.birthYear"
                type="number"
                inputmode="numeric"
                min="2000"
                max="2030"
                :class="input"
              />
            </div>

            <div>
              <label :class="labelClass" for="edit-academy-user-phone">Телефон родителя</label>
              <input
                id="edit-academy-user-phone"
                v-model="editForm.parentPhone"
                type="tel"
                :class="input"
              />
            </div>

            <div>
              <label :class="labelClass" for="edit-academy-user-trials">Пробных</label>
              <input
                id="edit-academy-user-trials"
                v-model="editForm.totalTrials"
                type="number"
                inputmode="numeric"
                min="0"
                :class="input"
              />
            </div>

            <label
              class="flex items-center gap-2 pt-6 text-theme-sm text-gray-800 dark:text-gray-200"
            >
              <input
                v-model="editForm.subscribed"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-pitch-600 focus:ring-pitch-500"
              />
              Абонемент активен
            </label>

            <div>
              <label :class="labelClass" for="edit-academy-user-experience">Опыт</label>
              <div class="relative">
                <select
                  id="edit-academy-user-experience"
                  v-model="editForm.experience"
                  :class="select"
                >
                  <option value="">Не указан</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>

            <div>
              <label :class="labelClass" for="edit-academy-user-school-shift">Смена</label>
              <div class="relative">
                <select
                  id="edit-academy-user-school-shift"
                  v-model="editForm.schoolShift"
                  :class="select"
                >
                  <option value="">Не указана</option>
                  <option value="morning">Утро</option>
                  <option value="afternoon">День</option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>
          </div>

          <p
            v-if="editError"
            class="mt-4 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ editError }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="editSaving"
              @click="closeEdit"
            >
              Отмена
            </button>
            <button type="submit" :class="[buttonPrimary, buttonSize.sm]" :disabled="editSaving">
              <LoaderCircle
                v-if="editSaving"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Сохранить
            </button>
          </div>
        </form>
      </template>
    </Modal>

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

          <div
            v-if="showAllSports"
            role="tablist"
            aria-label="Вид спорта"
            class="mb-4 inline-flex w-fit gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
          >
            <button
              v-for="s in SPORT_KEYS"
              :key="s"
              type="button"
              role="tab"
              :aria-selected="assigningSport === s"
              :class="tabClass(assigningSport === s)"
              @click="selectAssignSport(s)"
            >
              {{ SPORTS[s].label }}
            </button>
          </div>
          <p v-if="showAllSports" class="mb-3 text-theme-xs text-gray-600 dark:text-gray-400">
            Если ребёнок уже занят в другом виде спорта, назначение сюда создаст отдельную запись
            для {{ SPORTS[assigningSport].genitive }} — так же, как в футболе и боксе одновременно.
          </p>

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
              v-for="group in assignGroupOptions"
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
                :value="String(group.id)"
                class="h-4 w-4 border-gray-300 text-pitch-600 focus:ring-pitch-500"
              />
            </label>
            <p
              v-if="!assignGroupOptions.length"
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

    <!-- Действия строки одной кнопкой — на мобильных пять кнопок в ряд не помещались (#5) -->
    <Modal v-if="actionsStudent" :fullScreenBackdrop="true" @close="closeActions">
      <template #body>
        <div
          class="relative z-10 mx-4 mb-4 w-full max-w-sm rounded-2xl bg-white p-4 shadow-theme-xl dark:bg-gray-900 sm:mx-auto sm:my-8"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
                {{ actionsStudent.name }}
              </p>
              <p class="text-theme-xs text-gray-600 dark:text-gray-400">Действия</p>
            </div>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeActions">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div v-if="!actionsConfirmUnsub" class="flex flex-col gap-1.5">
            <button
              v-if="!subscribedMode"
              type="button"
              :class="[buttonPrimary, buttonSize.sm, 'justify-start']"
              :disabled="isSaving(actionsStudent)"
              @click="actionsSetSubscribed(true)"
            >
              <LoaderCircle
                v-if="isSaving(actionsStudent)"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <UserPlus v-else class="h-3.5 w-3.5" aria-hidden="true" />
              Оформить абонемент
            </button>
            <button
              v-else
              type="button"
              :class="[buttonGhost, buttonSize.sm, 'justify-start']"
              @click="actionsConfirmUnsub = true"
            >
              Снять абонемент
            </button>

            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm, 'justify-start']"
              @click="actionsEdit"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
              Изменить
            </button>

            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm, 'justify-start']"
              @click="actionsAssign"
            >
              Назначить группу
            </button>

            <button
              v-if="actionsStudent.assigned_group_id"
              type="button"
              :class="[buttonDanger, buttonSize.sm, 'justify-start']"
              :disabled="isAssignmentSaving(actionsStudent)"
              @click="actionsDeassign"
            >
              <LoaderCircle
                v-if="isAssignmentSaving(actionsStudent)"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <UserMinus v-else class="h-3.5 w-3.5" aria-hidden="true" />
              Снять группу
            </button>
          </div>

          <div v-else class="flex flex-col gap-2">
            <p class="text-theme-sm text-gray-700 dark:text-gray-300">
              Снять абонемент у {{ actionsStudent.name }}?
            </p>
            <button
              type="button"
              :class="[buttonDanger, buttonSize.sm, 'justify-start']"
              :disabled="isSaving(actionsStudent)"
              @click="actionsSetSubscribed(false)"
            >
              <LoaderCircle
                v-if="isSaving(actionsStudent)"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Да, снять
            </button>
            <button
              type="button"
              :class="[buttonGhost, buttonSize.sm, 'justify-start']"
              @click="actionsConfirmUnsub = false"
            >
              Отмена
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>
