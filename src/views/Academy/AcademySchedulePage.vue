<script setup lang="ts">
/**
 * Расписание и группы.
 *
 * ТЗ §2.2 и §4.1: бот не придумывает время сам — он предлагает родителю только
 * те слоты, что заданы здесь, подбирая группу по возрасту и смене ребёнка.
 * Значит расписание и есть главный экран, а не список карточек: неделя видна
 * целиком, занятая и свободная ёмкость — сразу.
 *
 * Правка времени в API идёт без указания дня (PATCH принимает только
 * `start_time`/`end_time` для группы), поэтому форма говорит об этом прямо и
 * предупреждает, когда у дней группы сейчас разное время.
 */
import { computed, onMounted, ref, watch } from 'vue'
import {
  CalendarDays,
  Clock3,
  LoaderCircle,
  Pencil,
  RefreshCw,
  TriangleAlert,
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
import {
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  input,
  label as labelClass,
  panel,
  panelHeader,
  panelHint,
  panelTitle,
  td,
  th,
} from '@/components/academy/ui'
import {
  listGroups,
  listStudents,
  shiftLabel,
  updateGroup,
  type AcademyGroup,
  type AcademyStudent,
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
} from '@/utils/schedule'
import { pluralize } from '@/utils/plural'

const props = defineProps<{ sport: SportKey }>()

const rawGroups = ref<AcademyGroup[]>([])
const students = ref<AcademyStudent[]>([])
const loading = ref(true)
const loadError = ref('')
const selectedKey = ref('')
const now = ref(new Date())
/** Мобильный вид: одна колонка недели за раз. */
const activeDay = ref(0)

// ── Модель расписания ───────────────────────────────────────────────

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
  shift: string | null
  /** `is_active` приходит не всегда; null — поля в ответе нет. */
  active: boolean | null
  /** У дней группы разное время — правка времени его выровняет. */
  mixedTimes: boolean
}

function groupKeyOf(group: AcademyGroup): string {
  return String(group.group_id ?? group.id)
}

function ageRangeOf(group: AcademyGroup): string | null {
  const min = group.age_min
  const max = group.age_max
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min}–${max} лет`
  if (min != null) return `от ${min} лет`
  return `до ${max} лет`
}

const groups = computed<GroupView[]>(() => {
  const byKey = new Map<string, GroupView>()

  for (const row of rawGroups.value) {
    const key = groupKeyOf(row)
    const weekday = resolveWeekday(row.training_day_label || row.training_day, row.training_day_value)
    const lesson: Lesson = {
      groupKey: key,
      weekday,
      dayLabel: row.training_day_label || row.training_day || 'День не указан',
      start: formatTime(row.start_time),
      end: formatTime(row.end_time),
      startMinutes: parseTimeToMinutes(row.start_time) ?? 0,
    }

    const existing = byKey.get(key)
    if (existing) {
      existing.lessons.push(lesson)
      // Ёмкость приходит в каждой строке — берём максимум как самую свежую.
      existing.currentCap = Math.max(existing.currentCap ?? 0, row.curr_cap ?? 0)
      existing.maxCap = row.max_cap ?? existing.maxCap
      continue
    }

    byKey.set(key, {
      key,
      groupId: key,
      name: row.group_name || 'Без названия',
      type: row.group_type || '',
      currentCap: row.curr_cap,
      maxCap: row.max_cap,
      lessons: [lesson],
      ageRange: ageRangeOf(row),
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
  }

  return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})

/** Колонки недели с датами текущей недели — «когда именно» важнее абстрактного «Ср». */
const week = computed(() => {
  const monday = startOfWeek(now.value)
  return WEEKDAYS.map((day) => {
    const date = addDays(monday, day.index)
    const lessons = groups.value
      .flatMap((group) =>
        group.lessons
          .filter((lesson) => lesson.weekday === day.index)
          .map((lesson) => ({ lesson, group })),
      )
      .sort((a, b) => a.lesson.startMinutes - b.lesson.startMinutes)

    return {
      ...day,
      date,
      dateLabel: formatDayMonth(date),
      today: isSameDay(date, now.value),
      lessons,
    }
  })
})

/** Группы, у которых день не распознан — их надо увидеть, а не потерять. */
const unscheduled = computed(() =>
  groups.value.flatMap((group) =>
    group.lessons.filter((lesson) => lesson.weekday === null).map((lesson) => ({ lesson, group })),
  ),
)

const selectedGroup = computed<GroupView | undefined>(
  () => groups.value.find((group) => group.key === selectedKey.value) ?? groups.value[0],
)

const roster = computed(() => {
  const group = selectedGroup.value
  if (!group) return []
  return students.value.filter(
    (student) =>
      String(student.assigned_group_id ?? '') === group.key ||
      student.assigned_group_name === group.name ||
      student.assigned_group === group.name,
  )
})

const totals = computed(() => {
  const withLimit = groups.value.filter((group) => (group.maxCap ?? 0) > 0)
  const seats = withLimit.reduce((sum, group) => sum + (group.maxCap ?? 0), 0)
  const taken = withLimit.reduce((sum, group) => sum + (group.currentCap ?? 0), 0)
  return {
    groups: groups.value.length,
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

// ── Загрузка ────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  try {
    now.value = new Date()
    activeDay.value = (now.value.getDay() + 6) % 7
    const [nextGroups, nextStudents] = await Promise.all([
      listGroups(props.sport),
      listStudents(props.sport, true),
    ])
    rawGroups.value = nextGroups
    students.value = nextStudents
    if (!nextGroups.some((group) => groupKeyOf(group) === selectedKey.value)) {
      selectedKey.value = nextGroups[0] ? groupKeyOf(nextGroups[0]) : ''
    }
    loadError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить расписание'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.sport, load)

// ── Правка группы ───────────────────────────────────────────────────

const editing = ref(false)
const editName = ref('')
const editMaxCap = ref<number | null>(null)
const editStart = ref('')
const editEnd = ref('')
const editError = ref('')
const saving = ref(false)

function openEdit() {
  const group = selectedGroup.value
  if (!group) return
  editName.value = group.name
  editMaxCap.value = group.maxCap
  editStart.value = group.lessons[0]?.start ?? ''
  editEnd.value = group.lessons[0]?.end ?? ''
  editError.value = ''
  editing.value = true
}

function closeEdit() {
  if (saving.value) return
  editing.value = false
  editError.value = ''
}

async function save() {
  const group = selectedGroup.value
  if (!group) return

  const payload: UpdateGroupPayload = {}
  const name = editName.value.trim()

  if (!name) {
    editError.value = 'Название группы не может быть пустым.'
    return
  }
  if (name !== group.name) payload.group_name = name

  if (editMaxCap.value !== null && editMaxCap.value !== group.maxCap) {
    if (!Number.isInteger(editMaxCap.value) || editMaxCap.value < 0) {
      editError.value = 'Вместимость — целое число не меньше нуля.'
      return
    }
    if (group.currentCap !== null && editMaxCap.value < group.currentCap) {
      editError.value = `В группе уже ${group.currentCap} учеников — вместимость не может быть меньше.`
      return
    }
    payload.max_cap = editMaxCap.value
  }

  const startMinutes = parseTimeToMinutes(editStart.value)
  const endMinutes = parseTimeToMinutes(editEnd.value)
  if (editStart.value && startMinutes === null) {
    editError.value = 'Время начала указано неверно.'
    return
  }
  if (editEnd.value && endMinutes === null) {
    editError.value = 'Время окончания указано неверно.'
    return
  }
  if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
    editError.value = 'Занятие должно заканчиваться позже, чем начинается.'
    return
  }

  const currentStart = group.lessons[0]?.start ?? ''
  const currentEnd = group.lessons[0]?.end ?? ''
  if (editStart.value && editStart.value !== currentStart) payload.start_time = editStart.value
  if (editEnd.value && editEnd.value !== currentEnd) payload.end_time = editEnd.value
  // Разное время у дней выравнивается — отправляем обе границы целиком.
  if (group.mixedTimes && (payload.start_time || payload.end_time)) {
    payload.start_time = editStart.value
    payload.end_time = editEnd.value
  }

  if (!Object.keys(payload).length) {
    editError.value = 'Изменений нет — поправьте название, вместимость или время.'
    return
  }

  saving.value = true
  editError.value = ''
  try {
    await updateGroup(group.groupId, payload)
    await load()
    editing.value = false
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Не удалось сохранить группу.'
  } finally {
    saving.value = false
  }
}

/** «2 занятия в неделю» — вместо технического group_type под названием. */
function lessonsPerWeek(group: GroupView): string {
  return `${pluralize(group.lessons.length, 'занятие', 'занятия', 'занятий')} в неделю`
}

function selectGroup(key: string) {
  selectedKey.value = key
  editing.value = false
}

const chipBase =
  'focus-ring block w-full rounded-xl border px-2.5 py-2 text-left transition-colors duration-150'
</script>

<template>
  <AdminLayout>
    <AcademyHeader
      :sport="sport"
      title="Расписание и группы"
      subtitle="Бот предлагает родителям только те слоты, что заданы здесь, и подбирает группу по возрасту ребёнка."
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

    <!-- Итоги недели: одна строка, а не пять одинаковых плиток. -->
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
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Занятий в неделю</dt>
        <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ totals.lessons }}
        </dd>
      </div>
      <div v-if="totals.seats">
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Мест занято</dt>
        <dd class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
          {{ totals.taken }}<span class="text-gray-500 dark:text-gray-400">/{{ totals.seats }}</span>
        </dd>
      </div>
      <div v-if="totals.seats" class="min-w-[10rem] flex-1">
        <dt class="text-theme-xs text-gray-600 dark:text-gray-400">
          Свободно мест: <span class="font-semibold text-gray-900 dark:text-white">{{ totals.free }}</span>
        </dt>
        <dd class="mt-2">
          <OccupancyMeter :current="totals.taken" :max="totals.seats" :caption="false" />
        </dd>
      </div>
    </dl>

    <section :class="[panel, 'mb-6']">
      <div :class="panelHeader">
        <div>
          <h2 :class="panelTitle">Неделя</h2>
          <p :class="panelHint">
            {{ formatDayMonth(week[0].date) }} — {{ formatDayMonth(week[6].date) }}. Выберите
            занятие, чтобы открыть группу.
          </p>
        </div>
      </div>

      <StateBlock
        :state="state"
        :error="loadError"
        :rows="4"
        empty-title="Расписание пустое"
        empty-hint="Пока в академии нет ни одной группы. Бот не сможет предложить родителям время, пока расписание не заполнено."
        @retry="load"
      >
        <template #icon><CalendarDays class="h-5 w-5" aria-hidden="true" /></template>

        <!-- Сетка недели: десктоп -->
        <div class="hidden grid-cols-7 divide-x divide-gray-200 dark:divide-gray-800 lg:grid">
          <div v-for="day in week" :key="day.index" class="min-w-0 px-3 py-4">
            <div class="mb-3 flex items-baseline justify-between gap-1">
              <span
                class="text-theme-xs font-bold uppercase tracking-wide"
                :class="
                  day.today ? 'text-pitch-700 dark:text-pitch-400' : 'text-gray-700 dark:text-gray-300'
                "
              >
                {{ day.short }}
              </span>
              <span
                class="text-theme-xs tabular-nums"
                :class="
                  day.today ? 'font-semibold text-pitch-700 dark:text-pitch-400' : 'text-gray-500 dark:text-gray-400'
                "
              >
                {{ day.dateLabel }}
              </span>
            </div>

            <div v-if="day.lessons.length" class="space-y-2">
              <button
                v-for="entry in day.lessons"
                :key="`${entry.group.key}-${entry.lesson.start}`"
                type="button"
                :aria-pressed="entry.group.key === selectedGroup?.key"
                :class="[
                  chipBase,
                  entry.group.key === selectedGroup?.key
                    ? 'border-pitch-500 bg-pitch-50 dark:border-pitch-500 dark:bg-pitch-500/15'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:hover:bg-white/[0.04]',
                  entry.group.active === false ? 'opacity-60' : '',
                ]"
                @click="selectGroup(entry.group.key)"
              >
                <span class="block text-theme-xs font-bold tabular-nums text-gray-900 dark:text-white">
                  {{ entry.lesson.start }}
                </span>
                <span class="mt-0.5 block truncate text-theme-xs text-gray-700 dark:text-gray-300">
                  {{ entry.group.name }}
                </span>
                <span class="mt-1.5 block">
                  <OccupancyMeter
                    :current="entry.group.currentCap"
                    :max="entry.group.maxCap"
                    :caption="false"
                    size="sm"
                  />
                </span>
              </button>
            </div>
            <p v-else class="text-theme-xs text-gray-500 dark:text-gray-500">Нет занятий</p>
          </div>
        </div>

        <!-- Сетка недели: планшет и мобильный — один день за раз -->
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
              <span class="text-[10px] tabular-nums opacity-80">
                {{ day.lessons.length || '—' }}
              </span>
            </button>
          </div>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800/70">
            <li
              v-for="entry in week[activeDay].lessons"
              :key="`${entry.group.key}-${entry.lesson.start}`"
            >
              <button
                type="button"
                class="focus-ring-inset flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors sm:px-6"
                :class="
                  entry.group.key === selectedGroup?.key
                    ? 'bg-pitch-50 dark:bg-pitch-500/10'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                "
                @click="selectGroup(entry.group.key)"
              >
                <span
                  class="w-14 shrink-0 text-theme-sm font-bold tabular-nums text-gray-900 dark:text-white"
                >
                  {{ entry.lesson.start }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-theme-sm font-medium text-gray-900 dark:text-white">
                    {{ entry.group.name }}
                  </span>
                  <span class="mt-1 block max-w-[12rem]">
                    <OccupancyMeter
                      :current="entry.group.currentCap"
                      :max="entry.group.maxCap"
                      size="sm"
                    />
                  </span>
                </span>
              </button>
            </li>
            <li
              v-if="!week[activeDay].lessons.length"
              class="px-5 py-8 text-center text-theme-sm text-gray-600 dark:text-gray-400 sm:px-6"
            >
              В этот день занятий нет.
            </li>
          </ul>
        </div>

        <!-- Занятия без распознанного дня -->
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
              @click="selectGroup(entry.group.key)"
            >
              {{ entry.group.name }} ({{ entry.lesson.dayLabel }})
            </button>
          </p>
        </div>
      </StateBlock>
    </section>

    <!-- Детали выбранной группы -->
    <section v-if="selectedGroup" class="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div :class="panel">
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-bold text-gray-900 dark:text-white">
                {{ selectedGroup.name }}
              </h2>
              <p class="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">
                {{ lessonsPerWeek(selectedGroup) }}
              </p>
            </div>
            <button
              v-if="!editing"
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              @click="openEdit"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
              Изменить
            </button>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <StatusPill v-if="selectedGroup.ageRange" tone="info">
              {{ selectedGroup.ageRange }}
            </StatusPill>
            <StatusPill v-if="selectedGroup.shift" tone="neutral">
              Смена: {{ selectedGroup.shift }}
            </StatusPill>
            <StatusPill v-if="selectedGroup.active === false" tone="warning">
              Не активна — бот не предлагает
            </StatusPill>
            <StatusPill v-else-if="selectedGroup.active === true" tone="pitch" dot>
              Активна
            </StatusPill>
          </div>
        </div>

        <!-- Форма правки -->
        <form v-if="editing" class="space-y-4 px-5 py-4 sm:px-6" @submit.prevent="save">
          <div>
            <label :class="labelClass" for="group-name">Название группы</label>
            <input id="group-name" v-model="editName" type="text" :class="input" />
          </div>

          <div>
            <label :class="labelClass" for="group-cap">Вместимость</label>
            <input
              id="group-cap"
              v-model.number="editMaxCap"
              type="number"
              min="0"
              step="1"
              :class="input"
            />
            <p class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
              Сейчас записано: {{ selectedGroup.currentCap ?? 0 }}.
            </p>
          </div>

          <fieldset>
            <legend :class="labelClass">Время занятия</legend>
            <div class="grid grid-cols-2 gap-3">
              <input v-model="editStart" type="time" :class="input" aria-label="Начало" />
              <input v-model="editEnd" type="time" :class="input" aria-label="Окончание" />
            </div>
            <p class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
              Время задаётся для группы целиком — API не хранит отдельное время для каждого дня.
            </p>
            <p
              v-if="selectedGroup.mixedTimes"
              class="mt-2 flex items-start gap-1.5 rounded-lg bg-warning-50 px-3 py-2 text-theme-xs text-warning-800 dark:bg-warning-500/10 dark:text-warning-200"
            >
              <TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Сейчас у дней группы разное время. Сохранение выставит одно время всем занятиям.
            </p>
          </fieldset>

          <p v-if="editError" class="text-theme-sm text-error-700 dark:text-error-400" role="alert">
            {{ editError }}
          </p>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              :class="[buttonSecondary, buttonSize.sm]"
              :disabled="saving"
              @click="closeEdit"
            >
              <X class="h-3.5 w-3.5" aria-hidden="true" />
              Отмена
            </button>
            <button type="submit" :class="[buttonPrimary, buttonSize.sm]" :disabled="saving">
              <LoaderCircle
                v-if="saving"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Сохранить
            </button>
          </div>
        </form>

        <!-- Обычный вид -->
        <div v-else class="space-y-4 px-5 py-4 sm:px-6">
          <div>
            <p class="text-theme-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              Заполненность
            </p>
            <div class="mt-2">
              <OccupancyMeter
                :current="selectedGroup.currentCap"
                :max="selectedGroup.maxCap"
              />
            </div>
          </div>

          <div>
            <p class="text-theme-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              Занятия
            </p>
            <ul class="mt-2 space-y-1.5">
              <li
                v-for="lesson in selectedGroup.lessons"
                :key="`${lesson.dayLabel}-${lesson.start}`"
                class="flex items-center gap-2 text-theme-sm text-gray-800 dark:text-gray-200"
              >
                <CalendarDays class="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                <span class="min-w-[7rem]">{{ lesson.dayLabel }}</span>
                <Clock3 class="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                <span class="tabular-nums">{{ formatTimeRange(lesson.start, lesson.end) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Состав группы -->
      <div :class="panel">
        <div :class="panelHeader">
          <div>
            <h2 :class="panelTitle">Состав группы</h2>
            <p :class="panelHint">Ученики с оформленным абонементом, закреплённые за группой.</p>
          </div>
          <StatusPill tone="neutral" size="md">{{ roster.length }}</StatusPill>
        </div>

        <StateBlock
          :state="roster.length ? 'ready' : 'empty'"
          :rows="4"
          empty-title="В группе пока никого"
          empty-hint="Ученики появляются здесь после того, как менеджер оформил абонемент на экране «Пробные»."
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
                v-for="student in roster"
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
                <td :class="td">
                  <ContactActions :phone="student.parent_phone" />
                </td>
                <td :class="[td, 'text-right tabular-nums text-theme-sm text-gray-800 dark:text-gray-200']">
                  {{ student.total_trials }}
                </td>
              </tr>
            </tbody>
          </table>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
            <li
              v-for="student in roster"
              :key="student.id"
              class="flex flex-col gap-2 px-5 py-3.5 sm:px-6"
            >
              <PersonCell :name="student.name" :age="student.age" :birthdate="student.birthdate" />
              <ContactActions :phone="student.parent_phone" />
            </li>
          </ul>
        </StateBlock>
      </div>
    </section>

    <p v-else-if="state === 'ready'" class="text-theme-sm text-gray-600 dark:text-gray-400">
      Выберите занятие в сетке недели, чтобы открыть группу.
    </p>
  </AdminLayout>
</template>
