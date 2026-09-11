<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  CalendarDays,
  Check,
  Clock3,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import ContactActions from '@/components/academy/ContactActions.vue'
import OccupancyMeter from '@/components/academy/OccupancyMeter.vue'
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
  panelHeader,
  panelHint,
  panelTitle,
  select,
  td,
  th,
} from '@/components/academy/ui'
import {
  assignAcademyUser,
  createGroup,
  deleteGroup,
  listAcademyUsers,
  listGroups,
  shiftLabel,
  SPORTS,
  updateGroup,
  type AcademyGroup,
  type AcademyStudent,
  type CreateGroupPayload,
  type SportKey,
  type UpdateGroupPayload,
} from '@/services/academy'
import {
  addDays,
  formatDayMonth,
  formatTime,
  formatTimeRange,
  isSameDay,
  parseTimeToMinutes,
  resolveWeekday,
  startOfWeek,
  WEEKDAYS,
  weekdayLong,
} from '@/utils/schedule'
import { pluralize } from '@/utils/plural'

const props = defineProps<{ sport: SportKey }>()

const rawGroups = ref<AcademyGroup[]>([])
const students = ref<AcademyStudent[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const selectedKey = ref('')
const scheduleSelectedKey = ref('')
const now = ref(new Date())
const activeDay = ref(0)
const activeView = ref<'schedule' | 'groups'>('schedule')
const groupFilter = ref('all')
const activeFilter = ref<'all' | 'active' | 'disabled'>('all')
const assignQuery = ref('')
const deleteTarget = ref<GroupView | null>(null)
const deleteSaving = ref(false)
const deleteError = ref('')
const groupsPage = ref(1)
const groupsPerPage = 8

interface Lesson {
  groupKey: string
  weekday: number | null
  dayLabel: string
  start: string
  end: string
  startMinutes: number
}

interface GroupView {
  key: string
  groupId: string
  name: string
  type: string
  currentCap: number | null
  maxCap: number | null
  lessons: Lesson[]
  ageRange: string | null
  ageMin: number | null
  ageMax: number | null
  shift: string | null
  active: boolean | null
  mixedTimes: boolean
}

interface ScheduleEntry {
  lesson: Lesson
  group: GroupView
}

function groupKeyOf(group: AcademyGroup): string {
  return String(group.group_id ?? group.id)
}

function ageRangeOf(group: AcademyGroup): string | null {
  const min = group.age_min
  const max = group.age_max
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min}-${max} лет`
  if (min != null) return `от ${min} лет`
  return `до ${max} лет`
}

function groupNameOf(student: AcademyStudent): string {
  return student.assigned_group_name || student.assigned_group || ''
}

function phoneOf(student: AcademyStudent): string {
  return student.parent_phone || ''
}

const groups = computed<GroupView[]>(() => {
  const byKey = new Map<string, GroupView>()

  for (const row of rawGroups.value) {
    const key = groupKeyOf(row)
    const weekday = resolveWeekday(
      row.training_day_label || row.training_day,
      row.training_day_value,
    )
    const lesson: Lesson = {
      groupKey: key,
      weekday,
      dayLabel:
        weekday === null
          ? row.training_day_label || row.training_day || 'День не указан'
          : weekdayLong(weekday),
      start: formatTime(row.start_time),
      end: formatTime(row.end_time),
      startMinutes: parseTimeToMinutes(row.start_time) ?? 0,
    }

    const existing = byKey.get(key)
    if (existing) {
      existing.lessons.push(lesson)
      existing.maxCap = row.max_cap ?? existing.maxCap
      existing.active = row.is_active ?? existing.active
      continue
    }

    byKey.set(key, {
      key,
      groupId: key,
      name: row.group_name || 'Без названия',
      type: row.group_type || '',
      currentCap: null,
      maxCap: row.max_cap,
      lessons: [lesson],
      ageRange: ageRangeOf(row),
      ageMin: row.age_min ?? null,
      ageMax: row.age_max ?? null,
      shift: shiftLabel(row.shift),
      active: row.is_active ?? null,
      mixedTimes: false,
    })
  }

  const list = Array.from(byKey.values())
  for (const group of list) {
    group.lessons.sort(
      (a, b) => (a.weekday ?? 9) - (b.weekday ?? 9) || a.startMinutes - b.startMinutes,
    )
    const first = group.lessons[0]
    group.mixedTimes = group.lessons.some(
      (lesson) => lesson.start !== first.start || lesson.end !== first.end,
    )
    // curr_cap с бэкенда не пересчитывается при назначении/снятии ученика
    // (проверено: остаётся 0 после подтверждённого назначения), поэтому
    // считаем состав по тем же полям, что и ростер группы (rosterFor) —
    // тогда счётчик обновляется сразу после assignStudent/deassign.
    group.currentCap = students.value.filter(
      (student) =>
        String(student.assigned_group_id ?? '') === group.key ||
        student.assigned_group_name === group.name ||
        student.assigned_group === group.name,
    ).length
  }

  return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

const visibleGroups = computed(() =>
  groups.value.filter((group) => {
    if (groupFilter.value !== 'all' && group.key !== groupFilter.value) return false
    if (activeFilter.value === 'active' && group.active === false) return false
    if (activeFilter.value === 'disabled' && group.active !== false) return false
    return true
  }),
)

const selectedGroup = computed<GroupView | undefined>(
  () => groups.value.find((group) => group.key === selectedKey.value) ?? groups.value[0],
)

const totalGroupPages = computed(() => Math.max(1, Math.ceil(groups.value.length / groupsPerPage)))

const paginatedGroups = computed(() => {
  const start = (groupsPage.value - 1) * groupsPerPage
  return groups.value.slice(start, start + groupsPerPage)
})

const scheduleSelectedGroup = computed<GroupView | undefined>(() =>
  groups.value.find((group) => group.key === scheduleSelectedKey.value),
)

function entriesForDay(weekday: number): ScheduleEntry[] {
  return visibleGroups.value
    .flatMap((group) =>
      group.lessons
        .filter((lesson) => lesson.weekday === weekday)
        .map((lesson) => ({ lesson, group })),
    )
    .sort(
      (a, b) =>
        a.lesson.startMinutes - b.lesson.startMinutes ||
        a.lesson.end.localeCompare(b.lesson.end) ||
        a.group.name.localeCompare(b.group.name, 'ru'),
    )
}

function bucketEntries(entries: ScheduleEntry[]) {
  const buckets = new Map<string, ScheduleEntry[]>()
  for (const entry of entries) {
    const key = `${entry.lesson.start}-${entry.lesson.end}`
    buckets.set(key, [...(buckets.get(key) ?? []), entry])
  }
  return Array.from(buckets.entries()).map(([key, bucket]) => ({
    key,
    start: bucket[0].lesson.start,
    end: bucket[0].lesson.end,
    entries: bucket,
  }))
}

const week = computed(() => {
  const monday = startOfWeek(now.value)
  return WEEKDAYS.map((day) => {
    const date = addDays(monday, day.index)
    const entries = entriesForDay(day.index)
    return {
      ...day,
      date,
      dateLabel: formatDayMonth(date),
      today: isSameDay(date, now.value),
      entries,
      buckets: bucketEntries(entries),
    }
  })
})

const unscheduled = computed(() =>
  visibleGroups.value.flatMap((group) =>
    group.lessons.filter((lesson) => lesson.weekday === null).map((lesson) => ({ lesson, group })),
  ),
)

function rosterFor(group: GroupView | undefined): AcademyStudent[] {
  if (!group) return []
  return students.value.filter(
    (student) =>
      String(student.assigned_group_id ?? '') === group.key ||
      student.assigned_group_name === group.name ||
      student.assigned_group === group.name,
  )
}

const selectedRoster = computed(() => rosterFor(selectedGroup.value))

const availableStudents = computed(() => {
  const group = selectedGroup.value
  const query = assignQuery.value.trim().toLowerCase()
  const digits = query.replace(/\D/g, '')

  return students.value.filter((student) => {
    const alreadyInGroup =
      group &&
      (String(student.assigned_group_id ?? '') === group.key ||
        student.assigned_group_name === group.name ||
        student.assigned_group === group.name)
    if (alreadyInGroup) return false
    if (!query) return true
    return (
      student.name.toLowerCase().includes(query) ||
      groupNameOf(student).toLowerCase().includes(query) ||
      phoneOf(student).replace(/\D/g, '').includes(digits)
    )
  })
})

const totals = computed(() => {
  const withLimit = groups.value.filter((group) => (group.maxCap ?? 0) > 0)
  const seats = withLimit.reduce((sum, group) => sum + (group.maxCap ?? 0), 0)
  const taken = withLimit.reduce((sum, group) => sum + (group.currentCap ?? 0), 0)
  return {
    groups: groups.value.length,
    active: groups.value.filter((group) => group.active !== false).length,
    lessons: groups.value.reduce((sum, group) => sum + group.lessons.length, 0),
    seats,
    taken,
    free: Math.max(0, seats - taken),
  }
})

const state = computed(() => {
  if (loading.value) return 'loading' as const
  if (loadError.value) return 'error' as const
  if (!groups.value.length) return 'empty' as const
  return 'ready' as const
})

async function load() {
  loading.value = true
  deleteTarget.value = null
  try {
    now.value = new Date()
    activeDay.value = (now.value.getDay() + 6) % 7
    // Ростер и кандидаты на назначение берём из полного списка academy_users
    // (без group_type): сузив по спорту, бэкенд отдаёт только тех, кто уже
    // назначен в этом виде спорта — непроверенные и кросс-спортивные дети
    // исчезают из списка, и назначать в группу становится некого (см. #8).
    const [nextGroups, nextStudents] = await Promise.all([listGroups(props.sport), listAcademyUsers()])
    rawGroups.value = nextGroups
    students.value = nextStudents
    if (!nextGroups.some((group) => groupKeyOf(group) === selectedKey.value)) {
      selectedKey.value = nextGroups[0] ? groupKeyOf(nextGroups[0]) : ''
    }
    if (!nextGroups.some((group) => groupKeyOf(group) === scheduleSelectedKey.value)) {
      scheduleSelectedKey.value = ''
    }
    if (groupsPage.value > totalGroupPages.value) {
      groupsPage.value = totalGroupPages.value
    }
    loadError.value = ''
    actionError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить группы'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.sport, load)
watch(groups, () => {
  if (groupsPage.value > totalGroupPages.value) groupsPage.value = totalGroupPages.value
})

const groupForm = reactive({
  mode: 'create' as 'create' | 'edit',
  open: false,
  name: '',
  maxCap: 12,
  timeMode: 'general' as 'general' | 'custom',
  selectedDays: [] as number[],
  generalStart: '',
  generalEnd: '',
  dayTimes: WEEKDAYS.reduce(
    (acc, day) => ({ ...acc, [day.index]: { start: '', end: '' } }),
    {} as Record<number, { start: string; end: string }>,
  ),
  ageMin: null as number | null,
  ageMax: null as number | null,
  shift: '',
  active: true,
  error: '',
  saving: false,
})

const assignModal = reactive({
  open: false,
  savingId: null as number | null,
  error: '',
})

function openCreate() {
  groupForm.mode = 'create'
  groupForm.name = ''
  groupForm.maxCap = 12
  groupForm.timeMode = 'general'
  groupForm.selectedDays = []
  groupForm.generalStart = ''
  groupForm.generalEnd = ''
  resetDayTimes()
  groupForm.ageMin = null
  groupForm.ageMax = null
  groupForm.shift = ''
  groupForm.active = true
  groupForm.error = ''
  groupForm.open = true
}

function openEdit(group: GroupView = selectedGroup.value as GroupView) {
  if (!group) return
  selectedKey.value = group.key
  groupForm.mode = 'edit'
  groupForm.name = group.name
  groupForm.maxCap = group.maxCap ?? 0
  groupForm.selectedDays = group.lessons
    .map((lesson) => lesson.weekday)
    .filter((weekday): weekday is number => weekday !== null)
  groupForm.timeMode = group.mixedTimes ? 'custom' : 'general'
  groupForm.generalStart = group.lessons[0]?.start === '—' ? '' : (group.lessons[0]?.start ?? '')
  groupForm.generalEnd = group.lessons[0]?.end === '—' ? '' : (group.lessons[0]?.end ?? '')
  resetDayTimes()
  for (const lesson of group.lessons) {
    if (lesson.weekday === null) continue
    groupForm.dayTimes[lesson.weekday] = {
      start: lesson.start === '—' ? '' : lesson.start,
      end: lesson.end === '—' ? '' : lesson.end,
    }
  }
  groupForm.ageMin = group.ageMin
  groupForm.ageMax = group.ageMax
  groupForm.shift = group.shift ?? ''
  groupForm.active = group.active !== false
  groupForm.error = ''
  groupForm.open = true
}

function closeGroupForm() {
  if (groupForm.saving) return
  groupForm.open = false
}

function resetDayTimes() {
  for (const day of WEEKDAYS) {
    groupForm.dayTimes[day.index] = { start: '', end: '' }
  }
}

function toggleTrainingDay(index: number) {
  if (groupForm.selectedDays.includes(index)) {
    groupForm.selectedDays = groupForm.selectedDays.filter((day) => day !== index)
    return
  }

  groupForm.selectedDays = [...groupForm.selectedDays, index].sort((a, b) => a - b)
  const time = timeForDay(index)
  if (groupForm.generalStart) time.start = groupForm.generalStart
  if (groupForm.generalEnd) time.end = groupForm.generalEnd
}

function timeForDay(index: number) {
  return groupForm.dayTimes[index] ?? { start: '', end: '' }
}

function validateTimePair(start: string, end: string, label: string): boolean {
  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)
  if (!start || startMinutes === null) {
    groupForm.error = 'Время начала указано неверно.'
    return false
  }
  if (!end || endMinutes === null) {
    groupForm.error = 'Время окончания указано неверно.'
    return false
  }
  if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
    groupForm.error = `${label}: занятие должно заканчиваться позже, чем начинается.`
    return false
  }
  return true
}

function validateSchedule(): boolean {
  if (!groupForm.selectedDays.length) {
    groupForm.error = 'Выберите хотя бы один день тренировки.'
    return false
  }
  if (groupForm.timeMode === 'general') {
    return validateTimePair(groupForm.generalStart, groupForm.generalEnd, 'Общее время')
  }
  return groupForm.selectedDays.every((weekday) => {
    const time = timeForDay(weekday)
    return validateTimePair(time.start, time.end, WEEKDAYS[weekday].long)
  })
}

function buildTrainingDays() {
  return groupForm.selectedDays.map((weekday) => {
    const time =
      groupForm.timeMode === 'general'
        ? { start: groupForm.generalStart, end: groupForm.generalEnd }
        : timeForDay(weekday)
    return {
      training_day: WEEKDAYS[weekday].long,
      training_day_value: weekday,
      start_time: time.start,
      end_time: time.end,
    }
  })
}

function applyGeneralTime() {
  if (!validateTimePair(groupForm.generalStart, groupForm.generalEnd, 'Общее время')) return
  for (const weekday of groupForm.selectedDays) {
    groupForm.dayTimes[weekday] = {
      start: groupForm.generalStart,
      end: groupForm.generalEnd,
    }
  }
  groupForm.error = ''
}

function setTimeMode(mode: 'general' | 'custom') {
  groupForm.timeMode = mode
  if (mode === 'custom' && groupForm.generalStart && groupForm.generalEnd) {
    for (const weekday of groupForm.selectedDays) {
      const time = timeForDay(weekday)
      if (!time.start) time.start = groupForm.generalStart
      if (!time.end) time.end = groupForm.generalEnd
    }
  }
}

async function saveGroup() {
  const name = groupForm.name.trim()
  if (!name) {
    groupForm.error = 'Название группы не может быть пустым.'
    return
  }
  if (!Number.isInteger(groupForm.maxCap) || groupForm.maxCap < 0) {
    groupForm.error = 'Вместимость — целое число не меньше нуля.'
    return
  }
  if (!validateSchedule()) return

  groupForm.saving = true
  groupForm.error = ''
  try {
    if (groupForm.mode === 'create') {
      const payload: CreateGroupPayload = {
        group_name: name,
        group_type: SPORTS[props.sport].groupType,
        max_cap: groupForm.maxCap,
        start_time: groupForm.generalStart || buildTrainingDays()[0]?.start_time,
        end_time: groupForm.generalEnd || buildTrainingDays()[0]?.end_time,
        training_days: buildTrainingDays(),
        age_min: groupForm.ageMin,
        age_max: groupForm.ageMax,
        shift: groupForm.shift || undefined,
        is_active: groupForm.active,
      }
      await createGroup(payload)
    } else {
      const group = selectedGroup.value
      if (!group) return
      if (group.currentCap !== null && groupForm.maxCap < group.currentCap) {
        groupForm.error = `В группе уже ${group.currentCap} учеников — вместимость не может быть меньше.`
        return
      }
      const payload: UpdateGroupPayload = {
        group_name: name,
        max_cap: groupForm.maxCap,
        training_days: buildTrainingDays(),
        age_min: groupForm.ageMin,
        age_max: groupForm.ageMax,
        shift: groupForm.shift || undefined,
        is_active: groupForm.active,
      }
      const firstTraining = buildTrainingDays()[0]
      if (firstTraining) {
        payload.start_time = firstTraining.start_time
        payload.end_time = firstTraining.end_time
      }
      await updateGroup(group.groupId, payload)
    }
    await load()
    groupForm.open = false
  } catch (e) {
    groupForm.error = e instanceof Error ? e.message : 'Не удалось сохранить группу. Проверьте API.'
  } finally {
    groupForm.saving = false
  }
}

function openDeleteConfirm(group: GroupView) {
  deleteTarget.value = group
  deleteError.value = ''
}

function closeDeleteConfirm() {
  if (deleteSaving.value) return
  deleteTarget.value = null
}

async function disableGroup() {
  const group = deleteTarget.value
  if (!group) return
  actionError.value = ''
  deleteSaving.value = true
  deleteError.value = ''
  try {
    await deleteGroup(group.groupId)
    await load()
  } catch (e) {
    deleteError.value =
      e instanceof Error ? e.message : 'Не удалось отключить группу. Проверьте API.'
  } finally {
    deleteSaving.value = false
  }
}

function selectScheduleGroup(group: GroupView) {
  scheduleSelectedKey.value = group.key
}

function viewScheduleDetails() {
  const group = scheduleSelectedGroup.value
  if (!group) return
  selectedKey.value = group.key
  activeView.value = 'groups'
}

function selectGroup(group: GroupView) {
  selectedKey.value = group.key
  deleteTarget.value = null
}

function openAssign(group: GroupView = selectedGroup.value as GroupView) {
  if (!group) return
  selectedKey.value = group.key
  assignQuery.value = ''
  assignModal.error = ''
  assignModal.open = true
}

function closeAssign() {
  if (assignModal.savingId) return
  assignModal.open = false
}

async function assignStudent(student: AcademyStudent) {
  const group = selectedGroup.value
  if (!group) return
  assignModal.savingId = student.id
  assignModal.error = ''
  try {
    // Менеджерская ручка, а не sport-scoped: кандидаты приходят из общего
    // списка academy_users и могут ещё не иметь записи в этом виде спорта.
    await assignAcademyUser(student.id, { group_id: Number(group.groupId) })
    await load()
    assignModal.open = false
  } catch (e) {
    assignModal.error =
      e instanceof Error ? e.message : 'Не удалось назначить ученика. Проверьте API.'
  } finally {
    assignModal.savingId = null
  }
}

function lessonsPerWeek(group: GroupView): string {
  return `${pluralize(group.lessons.length, 'занятие', 'занятия', 'занятий')} в неделю`
}

const tabClass = (active: boolean) =>
  [
    'focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-theme-sm font-semibold transition-colors duration-150',
    active
      ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  ].join(' ')

// `<button>` по умолчанию shrink-to-fit: без w-full/min-w-0 внутренний
// truncate-span с длинным названием группы растягивает саму кнопку шире
// колонки, и она визуально наезжает на соседний день в grid-cols-7 (#7).
const scheduleCardClass =
  'focus-ring block w-full min-w-0 rounded-lg border px-2.5 py-2 text-left transition-colors duration-150'
</script>

<template>
  <AdminLayout>
    <AcademyHeader
      :sport="sport"
      title="Группы и расписание"
      subtitle="Управление группами, составами и слотами, которые бот предлагает родителям."
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
        <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="openCreate">
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          Создать группу
        </button>
      </template>
    </AcademyHeader>

    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="tablist"
        aria-label="Группы и расписание"
        class="inline-flex w-fit gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'schedule'"
          :class="tabClass(activeView === 'schedule')"
          @click="activeView = 'schedule'"
        >
          <CalendarDays class="h-4 w-4" aria-hidden="true" />
          Расписание
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'groups'"
          :class="tabClass(activeView === 'groups')"
          @click="activeView = 'groups'"
        >
          <Users class="h-4 w-4" aria-hidden="true" />
          Группы
        </button>
      </div>

      <div v-if="activeView === 'schedule'" class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select v-model="groupFilter" :class="select" aria-label="Группа">
          <option value="all">Все группы</option>
          <option v-for="group in groups" :key="group.key" :value="group.key">
            {{ group.name }}
          </option>
        </select>
        <select v-model="activeFilter" :class="select" aria-label="Активность">
          <option value="all">Активные и отключённые</option>
          <option value="active">Только активные</option>
          <option value="disabled">Только отключённые</option>
        </select>
      </div>
    </div>

    <dl
      v-if="state === 'ready'"
      class="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div>
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Групп</dt>
        <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ totals.groups }}
        </dd>
      </div>
      <div>
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Активных</dt>
        <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ totals.active }}
        </dd>
      </div>
      <div>
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Занятий в неделю</dt>
        <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ totals.lessons }}
        </dd>
      </div>
      <div v-if="totals.seats" class="min-w-[10rem] flex-1">
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">
          Свободно мест:
          <span class="font-semibold text-gray-900 dark:text-white">{{ totals.free }}</span>
        </dt>
        <dd class="mt-2">
          <OccupancyMeter :current="totals.taken" :max="totals.seats" :caption="false" />
        </dd>
      </div>
    </dl>

    <p
      v-if="actionError"
      class="mb-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
      role="alert"
    >
      {{ actionError }}
    </p>

    <section v-if="activeView === 'schedule'" :class="[panel, 'relative mb-6']">
      <div :class="panelHeader">
        <div>
          <h2 :class="panelTitle">Неделя</h2>
          <p :class="panelHint">
            {{ formatDayMonth(week[0].date) }} - {{ formatDayMonth(week[6].date) }}. Группы с
            одинаковым временем показаны в одном временном блоке.
          </p>
        </div>
      </div>

      <StateBlock
        :state="state"
        :error="loadError"
        :rows="4"
        empty-title="Расписание пустое"
        empty-hint="Создайте первую группу, чтобы бот мог предложить родителям время."
        @retry="load"
      >
        <template #icon><CalendarDays class="h-5 w-5" aria-hidden="true" /></template>

        <div class="hidden grid-cols-7 divide-x divide-gray-200 dark:divide-gray-800 lg:grid">
          <div v-for="day in week" :key="day.index" class="min-w-0 px-3 py-4">
            <div class="mb-3 flex items-baseline justify-between gap-1">
              <span
                class="text-theme-xs font-bold uppercase"
                :class="
                  day.today
                    ? 'text-pitch-700 dark:text-pitch-400'
                    : 'text-gray-700 dark:text-gray-300'
                "
              >
                {{ day.short }}
              </span>
              <span
                class="text-theme-xs tabular-nums"
                :class="
                  day.today
                    ? 'font-semibold text-pitch-700 dark:text-pitch-400'
                    : 'text-gray-500 dark:text-gray-400'
                "
              >
                {{ day.dateLabel }}
              </span>
            </div>

            <div v-if="day.buckets.length" class="space-y-3">
              <div v-for="bucket in day.buckets" :key="bucket.key">
                <div
                  class="mb-1.5 flex items-center gap-1.5 text-theme-xs font-bold tabular-nums text-gray-900 dark:text-white"
                >
                  <Clock3 class="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                  {{ formatTimeRange(bucket.start, bucket.end) }}
                </div>
                <div class="space-y-2">
                  <button
                    v-for="entry in bucket.entries"
                    :key="`${entry.group.key}-${entry.lesson.dayLabel}-${entry.lesson.start}`"
                    type="button"
                    :aria-pressed="entry.group.key === scheduleSelectedGroup?.key"
                    :class="[
                      scheduleCardClass,
                      entry.group.key === scheduleSelectedGroup?.key
                        ? 'border-pitch-500 bg-pitch-50 dark:border-pitch-500 dark:bg-pitch-500/15'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:hover:bg-white/[0.04]',
                      entry.group.active === false ? 'opacity-60' : '',
                    ]"
                    @click="selectScheduleGroup(entry.group)"
                  >
                    <span
                      class="block truncate text-theme-xs font-semibold text-gray-900 dark:text-white"
                    >
                      {{ entry.group.name }}
                    </span>
                    <span class="mt-1 block">
                      <OccupancyMeter
                        :current="entry.group.currentCap"
                        :max="entry.group.maxCap"
                        :caption="false"
                        size="sm"
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="text-theme-xs text-gray-500 dark:text-gray-500">Нет занятий</p>
          </div>
        </div>

        <div class="lg:hidden">
          <div
            role="tablist"
            aria-label="День недели"
            class="flex gap-1 overflow-x-auto border-b border-gray-200 px-5 py-3 no-scrollbar dark:border-gray-800 sm:px-6"
          >
            <button
              v-for="day in week"
              :key="day.index"
              type="button"
              role="tab"
              :aria-selected="activeDay === day.index"
              class="focus-ring flex min-w-[3.25rem] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors duration-150"
              :class="
                activeDay === day.index
                  ? 'bg-pitch-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]'
              "
              @click="activeDay = day.index"
            >
              <span class="text-theme-xs font-bold">{{ day.short }}</span>
              <span class="text-[10px] tabular-nums opacity-80">{{
                day.entries.length || '-'
              }}</span>
            </button>
          </div>

          <div class="divide-y divide-gray-100 dark:divide-gray-800/70">
            <div
              v-for="bucket in week[activeDay].buckets"
              :key="bucket.key"
              class="px-5 py-3.5 sm:px-6"
            >
              <p
                class="mb-2 flex items-center gap-1.5 text-theme-xs font-bold tabular-nums text-gray-900 dark:text-white"
              >
                <Clock3 class="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                {{ formatTimeRange(bucket.start, bucket.end) }}
              </p>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  v-for="entry in bucket.entries"
                  :key="`${entry.group.key}-${entry.lesson.start}`"
                  type="button"
                  :class="[
                    scheduleCardClass,
                    entry.group.key === scheduleSelectedGroup?.key
                      ? 'border-pitch-500 bg-pitch-50 dark:border-pitch-500 dark:bg-pitch-500/15'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-transparent',
                  ]"
                  @click="selectScheduleGroup(entry.group)"
                >
                  <span
                    class="block truncate text-theme-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ entry.group.name }}
                  </span>
                  <span class="mt-1 block">
                    <OccupancyMeter
                      :current="entry.group.currentCap"
                      :max="entry.group.maxCap"
                      size="sm"
                    />
                  </span>
                </button>
              </div>
            </div>
            <p
              v-if="!week[activeDay].entries.length"
              class="px-5 py-8 text-center text-theme-sm text-gray-600 dark:text-gray-400 sm:px-6"
            >
              В этот день занятий нет.
            </p>
          </div>
        </div>

        <div
          v-if="unscheduled.length"
          class="flex flex-wrap items-center gap-2 border-t border-warning-200 bg-warning-50 px-5 py-3 dark:border-warning-500/30 dark:bg-warning-500/10 sm:px-6"
        >
          <TriangleAlert
            class="h-4 w-4 shrink-0 text-warning-700 dark:text-warning-400"
            aria-hidden="true"
          />
          <p class="text-theme-xs text-warning-800 dark:text-warning-200">
            День занятия не распознан у групп:
            <button
              v-for="entry in unscheduled"
              :key="`${entry.group.key}-${entry.lesson.dayLabel}`"
              type="button"
              class="focus-ring mx-0.5 rounded font-semibold underline"
              @click="selectScheduleGroup(entry.group)"
            >
              {{ entry.group.name }} ({{ entry.lesson.dayLabel }})
            </button>
          </p>
        </div>
      </StateBlock>

      <div
        v-if="scheduleSelectedGroup"
        class="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <span
          class="max-w-[12rem] truncate text-theme-sm font-semibold text-gray-900 dark:text-white"
        >
          {{ scheduleSelectedGroup.name }}
        </span>
        <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="viewScheduleDetails">
          <Eye class="h-3.5 w-3.5" aria-hidden="true" />
          View details
        </button>
      </div>
    </section>

    <section v-else class="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div :class="panel">
        <div :class="panelHeader">
          <div>
            <h2 :class="panelTitle">Список групп</h2>
            <p :class="panelHint">Выберите группу, чтобы увидеть расписание и состав.</p>
          </div>
          <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="openCreate">
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
            Создать
          </button>
        </div>

        <StateBlock
          :state="state"
          :error="loadError"
          :rows="5"
          empty-title="Групп пока нет"
          empty-hint="Создайте первую группу и задайте её расписание."
          @retry="load"
        >
          <template #icon><Users class="h-5 w-5" aria-hidden="true" /></template>
          <div class="divide-y divide-gray-100 dark:divide-gray-800/70">
            <button
              v-for="group in paginatedGroups"
              :key="group.key"
              type="button"
              class="focus-ring-inset flex w-full items-start gap-3 px-5 py-4 text-left transition-colors sm:px-6"
              :class="
                group.key === selectedGroup?.key
                  ? 'bg-pitch-50 dark:bg-pitch-500/10'
                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
              "
              @click="selectGroup(group)"
            >
              <span class="min-w-0 flex-1">
                <span
                  class="block truncate text-theme-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ group.name }}
                </span>
                <span class="mt-1 block text-theme-xs text-gray-600 dark:text-gray-400">
                  {{ lessonsPerWeek(group) }}
                </span>
                <span class="mt-2 block">
                  <OccupancyMeter :current="group.currentCap" :max="group.maxCap" size="sm" />
                </span>
              </span>
              <StatusPill v-if="group.active === false" tone="warning">Отключена</StatusPill>
              <StatusPill v-else tone="pitch" dot>Активна</StatusPill>
            </button>
          </div>

          <div
            v-if="totalGroupPages > 1"
            class="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-800 sm:px-6"
          >
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="groupsPage === 1"
              @click="groupsPage = Math.max(1, groupsPage - 1)"
            >
              Назад
            </button>
            <span class="text-theme-xs font-medium text-gray-600 dark:text-gray-400">
              {{ groupsPage }} / {{ totalGroupPages }}
            </span>
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="groupsPage === totalGroupPages"
              @click="groupsPage = Math.min(totalGroupPages, groupsPage + 1)"
            >
              Вперёд
            </button>
          </div>
        </StateBlock>
      </div>

      <div v-if="selectedGroup" :class="panel">
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-bold text-gray-900 dark:text-white">
                {{ selectedGroup.name }}
              </h2>
              <p class="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">
                {{ lessonsPerWeek(selectedGroup) }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                :class="[buttonSecondary, buttonSize.sm]"
                @click="openEdit(selectedGroup)"
              >
                <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
                Изменить
              </button>
              <button
                type="button"
                :class="[buttonPrimary, buttonSize.sm]"
                @click="openAssign(selectedGroup)"
              >
                <UserPlus class="h-3.5 w-3.5" aria-hidden="true" />
                Назначить ученика
              </button>
              <button
                type="button"
                :class="[buttonDanger, buttonSize.sm]"
                @click="openDeleteConfirm(selectedGroup)"
              >
                <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                Отключить
              </button>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <StatusPill v-if="selectedGroup.ageRange" tone="info">{{
              selectedGroup.ageRange
            }}</StatusPill>
            <StatusPill v-if="selectedGroup.shift" tone="neutral"
              >Смена: {{ selectedGroup.shift }}</StatusPill
            >
            <StatusPill v-if="selectedGroup.active === false" tone="warning">Отключена</StatusPill>
            <StatusPill v-else tone="pitch" dot>Активна</StatusPill>
          </div>
        </div>

        <div class="grid gap-5 px-5 py-4 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div>
            <p class="text-theme-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
              Заполненность
            </p>
            <div class="mt-2">
              <OccupancyMeter :current="selectedGroup.currentCap" :max="selectedGroup.maxCap" />
            </div>
          </div>
          <div>
            <p class="text-theme-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
              Занятия
            </p>
            <ul class="mt-2 grid gap-2 sm:grid-cols-2">
              <li
                v-for="lesson in selectedGroup.lessons"
                :key="`${lesson.dayLabel}-${lesson.start}`"
                class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-theme-sm text-gray-800 dark:border-gray-800 dark:text-gray-200"
              >
                <CalendarDays class="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ lesson.dayLabel }}</span>
                <Clock3 class="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                <span class="tabular-nums">{{ formatTimeRange(lesson.start, lesson.end) }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-800">
          <div :class="panelHeader">
            <div>
              <h3 :class="panelTitle">Ученики группы</h3>
              <p :class="panelHint">Существующие ученики, закреплённые за этой группой.</p>
            </div>
            <StatusPill tone="neutral" size="md">{{ selectedRoster.length }}</StatusPill>
          </div>

          <StateBlock
            :state="selectedRoster.length ? 'ready' : 'empty'"
            :rows="4"
            empty-title="В группе пока никого"
            empty-hint="Нажмите «Назначить ученика», чтобы добавить существующего ученика."
          >
            <template #icon><Users class="h-5 w-5" aria-hidden="true" /></template>
            <table class="hidden w-full lg:table">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-800">
                  <th :class="th">Ребёнок</th>
                  <th :class="th">Контакт родителя</th>
                  <th :class="[th, 'text-right']">Пробных</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="student in selectedRoster"
                  :key="student.id"
                  class="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/70 dark:hover:bg-white/[0.02]"
                >
                  <td :class="td">
                    <PersonCell
                      :name="student.name"
                      :age="student.age"
                      :birthdate="student.birthdate"
                    />
                  </td>
                  <td :class="td"><ContactActions :phone="phoneOf(student)" /></td>
                  <td
                    :class="[
                      td,
                      'text-right tabular-nums text-theme-sm text-gray-800 dark:text-gray-200',
                    ]"
                  >
                    {{ student.total_trials ?? 0 }}
                  </td>
                </tr>
              </tbody>
            </table>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
              <li
                v-for="student in selectedRoster"
                :key="student.id"
                class="flex flex-col gap-2 px-5 py-3.5 sm:px-6"
              >
                <PersonCell
                  :name="student.name"
                  :age="student.age"
                  :birthdate="student.birthdate"
                />
                <ContactActions :phone="phoneOf(student)" />
              </li>
            </ul>
          </StateBlock>
        </div>
      </div>
    </section>

    <Modal v-if="groupForm.open" :fullScreenBackdrop="true" @close="closeGroupForm">
      <template #body>
        <form
          class="relative z-10 mx-4 my-4 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:my-8 sm:p-6"
          @submit.prevent="saveGroup"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ groupForm.mode === 'create' ? 'Создать группу' : 'Изменить группу' }}
              </h2>
              <p class="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                {{
                  groupForm.mode === 'create'
                    ? 'Форма готова под будущую ручку создания.'
                    : 'Сохраняются поля, которые сейчас принимает API.'
                }}
              </p>
            </div>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeGroupForm">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label :class="labelClass" for="group-name">Название группы</label>
              <input id="group-name" v-model="groupForm.name" type="text" :class="input" />
            </div>
            <div>
              <label :class="labelClass" for="group-cap">Вместимость</label>
              <input
                id="group-cap"
                v-model.number="groupForm.maxCap"
                type="number"
                min="0"
                step="1"
                :class="input"
              />
            </div>
            <div>
              <label :class="labelClass" for="group-age-min">Возраст от</label>
              <input
                id="group-age-min"
                v-model.number="groupForm.ageMin"
                type="number"
                min="0"
                step="1"
                :class="input"
              />
            </div>
            <div>
              <label :class="labelClass" for="group-age-max">Возраст до</label>
              <input
                id="group-age-max"
                v-model.number="groupForm.ageMax"
                type="number"
                min="0"
                step="1"
                :class="input"
              />
            </div>
            <div class="sm:col-span-2">
              <label :class="labelClass" for="group-shift">Смена</label>
              <select id="group-shift" v-model="groupForm.shift" :class="select">
                <option value="">Не указана</option>
                <option value="morning">Утро</option>
                <option value="afternoon">После обеда</option>
                <option value="any">Любая</option>
              </select>
            </div>
            <label
              class="flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200 sm:col-span-2"
            >
              <input
                v-model="groupForm.active"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-pitch-600 focus:ring-pitch-500"
              />
              Активная группа
            </label>
          </div>

          <div class="mt-5 border-t border-gray-200 pt-5 dark:border-gray-800">
            <p :class="labelClass">Дни тренировок</p>
            <div class="grid grid-cols-7 gap-2">
              <button
                v-for="day in WEEKDAYS"
                :key="day.index"
                type="button"
                :aria-pressed="groupForm.selectedDays.includes(day.index)"
                class="focus-ring flex min-h-12 flex-col items-center justify-center rounded-lg border py-2 text-theme-sm font-bold transition-colors"
                :class="
                  groupForm.selectedDays.includes(day.index)
                    ? 'border-pitch-600 bg-pitch-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.04]'
                "
                @click="toggleTrainingDay(day.index)"
              >
                <span>{{ day.short.slice(0, 1) }}</span>
                <span class="mt-0.5 text-[10px] font-medium opacity-75">{{ day.short }}</span>
              </button>
            </div>

            <div
              class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="focus-ring rounded-lg border px-3 py-3 text-left transition-colors"
                  :class="
                    groupForm.timeMode === 'general'
                      ? 'border-pitch-600 bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
                      : 'border-transparent text-gray-600 hover:bg-white dark:text-gray-400 dark:hover:bg-white/[0.04]'
                  "
                  @click="setTimeMode('general')"
                >
                  <span class="block text-theme-sm font-semibold">Same time</span>
                  <span class="mt-0.5 block text-[11px]">one time for all days</span>
                </button>
                <button
                  type="button"
                  class="focus-ring rounded-lg border px-3 py-3 text-left transition-colors"
                  :class="
                    groupForm.timeMode === 'custom'
                      ? 'border-pitch-600 bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
                      : 'border-transparent text-gray-600 hover:bg-white dark:text-gray-400 dark:hover:bg-white/[0.04]'
                  "
                  @click="setTimeMode('custom')"
                >
                  <span class="block text-theme-sm font-semibold">Different by day</span>
                  <span class="mt-0.5 block text-[11px]">set each day manually</span>
                </button>
              </div>

              <div
                class="mt-4 grid gap-3"
                :class="
                  groupForm.timeMode === 'custom'
                    ? 'sm:grid-cols-[1fr_1fr_auto] sm:items-end'
                    : 'sm:grid-cols-[1fr_1fr]'
                "
              >
                <div>
                  <label :class="labelClass" for="group-general-start">
                    {{ groupForm.timeMode === 'general' ? 'Start time' : 'Copy start' }}
                  </label>
                  <input
                    id="group-general-start"
                    v-model="groupForm.generalStart"
                    type="time"
                    :class="input"
                  />
                </div>
                <div>
                  <label :class="labelClass" for="group-general-end">
                    {{ groupForm.timeMode === 'general' ? 'End time' : 'Copy end' }}
                  </label>
                  <input
                    id="group-general-end"
                    v-model="groupForm.generalEnd"
                    type="time"
                    :class="input"
                  />
                </div>
                <button
                  v-if="groupForm.timeMode === 'custom'"
                  type="button"
                  :class="[buttonSecondary, buttonSize.md, 'w-full sm:w-auto']"
                  :disabled="
                    !groupForm.selectedDays.length ||
                    !groupForm.generalStart ||
                    !groupForm.generalEnd
                  "
                  @click="applyGeneralTime"
                >
                  Apply
                </button>
              </div>
            </div>

            <div v-if="groupForm.timeMode === 'general'" class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="weekday in groupForm.selectedDays"
                :key="weekday"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-theme-xs font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                {{ WEEKDAYS[weekday].short }}
                <span class="tabular-nums text-gray-500">
                  {{ groupForm.generalStart || '--:--' }} - {{ groupForm.generalEnd || '--:--' }}
                </span>
              </span>
            </div>

            <div v-else class="mt-4 space-y-3">
              <div
                v-for="weekday in groupForm.selectedDays"
                :key="weekday"
                class="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
              >
                <div
                  class="mb-3 flex items-center justify-between gap-2 text-theme-sm font-semibold text-gray-900 dark:text-white"
                >
                  <span>{{ WEEKDAYS[weekday].long }}</span>
                  <button
                    type="button"
                    :class="[buttonGhost, buttonSize.sm]"
                    @click="toggleTrainingDay(weekday)"
                  >
                    <X class="h-3.5 w-3.5" aria-hidden="true" />
                    Убрать
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label :class="labelClass" :for="`group-day-${weekday}-start`">Начало</label>
                    <input
                      :id="`group-day-${weekday}-start`"
                      v-model="groupForm.dayTimes[weekday].start"
                      type="time"
                      :class="input"
                    />
                  </div>
                  <div>
                    <label :class="labelClass" :for="`group-day-${weekday}-end`">Окончание</label>
                    <input
                      :id="`group-day-${weekday}-end`"
                      v-model="groupForm.dayTimes[weekday].end"
                      type="time"
                      :class="input"
                    />
                  </div>
                </div>
              </div>
              <p
                v-if="!groupForm.selectedDays.length"
                class="rounded-lg border border-gray-200 px-3 py-4 text-center text-theme-sm text-gray-600 dark:border-gray-800 dark:text-gray-400"
              >
                Выберите дни выше.
              </p>
            </div>
          </div>

          <p
            v-if="groupForm.error"
            class="mt-4 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ groupForm.error }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="groupForm.saving"
              @click="closeGroupForm"
            >
              Отмена
            </button>
            <button
              type="submit"
              :class="[buttonPrimary, buttonSize.sm]"
              :disabled="groupForm.saving"
            >
              <LoaderCircle
                v-if="groupForm.saving"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <Check v-else class="h-3.5 w-3.5" aria-hidden="true" />
              Сохранить
            </button>
          </div>
        </form>
      </template>
    </Modal>

    <Modal v-if="deleteTarget" :fullScreenBackdrop="true" @close="closeDeleteConfirm">
      <template #body>
        <div
          class="relative z-10 mx-4 my-8 w-full max-w-md rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-6"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300"
            >
              <Trash2 class="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Отключить группу?</h2>
              <p class="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                {{ deleteTarget.name }} станет неактивной и не должна предлагаться ботом.
              </p>
            </div>
          </div>

          <p
            v-if="deleteError"
            class="mt-4 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ deleteError }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="deleteSaving"
              @click="closeDeleteConfirm"
            >
              Отмена
            </button>
            <button
              type="button"
              :class="[buttonDanger, buttonSize.sm]"
              :disabled="deleteSaving"
              @click="disableGroup"
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

    <Modal v-if="assignModal.open && selectedGroup" :fullScreenBackdrop="true" @close="closeAssign">
      <template #body>
        <div
          class="relative z-10 mx-4 my-8 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-6"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Назначить ученика</h2>
              <p class="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                {{ selectedGroup.name }}
              </p>
            </div>
            <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="closeAssign">
              <X class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="relative mb-4">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />
            <input
              v-model="assignQuery"
              type="search"
              placeholder="Имя, телефон, текущая группа"
              :class="[inputSm, 'pl-9']"
            />
          </div>

          <p
            v-if="assignModal.error"
            class="mb-3 text-theme-sm text-error-700 dark:text-error-400"
            role="alert"
          >
            {{ assignModal.error }}
          </p>

          <div
            class="max-h-[24rem] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <div
              v-for="student in availableStudents"
              :key="student.id"
              class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
            >
              <div class="min-w-0">
                <PersonCell
                  :name="student.name"
                  :age="student.age"
                  :birthdate="student.birthdate"
                />
                <p class="mt-1 truncate text-theme-xs text-gray-600 dark:text-gray-400">
                  {{ groupNameOf(student) || 'Группа не назначена' }}
                </p>
              </div>
              <button
                type="button"
                :class="[buttonPrimary, buttonSize.sm]"
                :disabled="assignModal.savingId === student.id"
                @click="assignStudent(student)"
              >
                <LoaderCircle
                  v-if="assignModal.savingId === student.id"
                  class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Добавить
              </button>
            </div>
            <p
              v-if="!availableStudents.length"
              class="px-4 py-8 text-center text-theme-sm text-gray-600 dark:text-gray-400"
            >
              Подходящих учеников нет.
            </p>
          </div>
        </div>
      </template>
    </Modal>
  </AdminLayout>
</template>
