<script setup lang="ts">
/**
 * Сводка академии: что делать сегодня.
 *
 * Все числа считаются из тех же трёх ручек, что и остальные экраны, — никаких
 * придуманных трендов. Если показатель посчитать нельзя, его здесь нет.
 */
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Users,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import AttendanceControl from '@/components/academy/AttendanceControl.vue'
import OccupancyMeter from '@/components/academy/OccupancyMeter.vue'
import PersonCell from '@/components/academy/PersonCell.vue'
import StateBlock from '@/components/academy/StateBlock.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
import {
  buttonSecondary,
  buttonSize,
  panel,
  panelHeader,
  panelHint,
  panelTitle,
} from '@/components/academy/ui'
import {
  listGroups,
  listStudents,
  listTrials,
  setTrialAttended,
  type AcademyGroup,
  type AcademyStudent,
  type AcademyTrial,
  type SportKey,
} from '@/services/academy'
import { useAcademyStore } from '@/stores/academy'
import {
  formatTime,
  formatTimeRange,
  parseTimeToMinutes,
  resolveWeekday,
  trialTiming,
} from '@/utils/schedule'
import { trialOutcome } from '@/utils/trialOutcome'
import { setPending, type PendingMap } from '@/utils/pending'

const props = defineProps<{ sport: SportKey }>()

const academy = useAcademyStore()

const groups = ref<AcademyGroup[]>([])
const trials = ref<AcademyTrial[]>([])
const students = ref<AcademyStudent[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const savingIds = ref<PendingMap<number>>({})
const now = ref(new Date())

async function load() {
  loading.value = true
  try {
    now.value = new Date()
    const [nextGroups, nextTrials, nextStudents] = await Promise.all([
      listGroups(props.sport),
      listTrials(props.sport),
      listStudents(props.sport, true),
    ])
    groups.value = nextGroups
    trials.value = nextTrials
    students.value = nextStudents
    loadError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить сводку'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.sport, load)

const todayIndex = computed(() => (now.value.getDay() + 6) % 7)
const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now.value),
)

// ── Занятия сегодня ─────────────────────────────────────────────────

interface TodayLesson {
  key: string
  groupKey: string
  name: string
  start: string
  end: string
  startMinutes: number
  endMinutes: number
  current: number | null
  max: number | null
  trials: AcademyTrial[]
}

const todayLessons = computed<TodayLesson[]>(() => {
  const lessons = groups.value
    .filter(
      (group) =>
        resolveWeekday(group.training_day_label || group.training_day, group.training_day_value) ===
        todayIndex.value,
    )
    .map((group) => {
      const groupKey = String(group.group_id ?? group.id)
      const startMinutes = parseTimeToMinutes(group.start_time) ?? 0
      return {
        key: `${groupKey}-${startMinutes}`,
        groupKey,
        name: group.group_name || 'Без названия',
        start: formatTime(group.start_time),
        end: formatTime(group.end_time),
        startMinutes,
        endMinutes: parseTimeToMinutes(group.end_time) ?? startMinutes,
        current: group.curr_cap,
        max: group.max_cap,
        trials: trials.value.filter((trial) => {
          const timing = trialTiming(trial, now.value)
          const sameGroup =
            String(trial.assigned_group_id ?? trial.group_id ?? '') === groupKey
          return timing.today && sameGroup
        }),
      }
    })

  return lessons.sort((a, b) => a.startMinutes - b.startMinutes)
})

const nextLesson = computed(() =>
  todayLessons.value.find((lesson) => lesson.endMinutes >= nowMinutes.value),
)

function lessonState(lesson: TodayLesson): { label: string; tone: 'pitch' | 'neutral' } {
  if (nowMinutes.value >= lesson.startMinutes && nowMinutes.value <= lesson.endMinutes) {
    return { label: 'Идёт сейчас', tone: 'pitch' }
  }
  if (nowMinutes.value > lesson.endMinutes) return { label: 'Прошло', tone: 'neutral' }
  return { label: 'Впереди', tone: 'neutral' }
}

// ── Ждут отметки ────────────────────────────────────────────────────

const unmarked = computed(() =>
  trials.value
    .filter(
      (trial) =>
        trialOutcome(trial, {
          markedMissed: academy.isMarkedMissed(props.sport, trial.trial_id),
          now: now.value,
        }).outcome === 'unmarked',
    )
    .map((trial) => ({ trial, timing: trialTiming(trial, now.value) }))
    .sort((a, b) => (b.timing.date?.getTime() ?? 0) - (a.timing.date?.getTime() ?? 0)),
)

const trialsToday = computed(
  () => trials.value.filter((trial) => trialTiming(trial, now.value).today).length,
)

// ── Воронка и места ─────────────────────────────────────────────────

const funnel = computed(() => {
  const came = trials.value.filter((trial) => trial.attended || trial.subscribed).length
  const converted = trials.value.filter((trial) => trial.subscribed).length
  return {
    total: trials.value.length,
    came,
    converted,
    percent: came ? Math.round((converted / came) * 100) : null,
  }
})

const capacity = computed(() => {
  const byGroup = new Map<string, { name: string; current: number; max: number }>()
  for (const group of groups.value) {
    const key = String(group.group_id ?? group.id)
    if (!group.max_cap) continue
    const existing = byGroup.get(key)
    const current = group.curr_cap ?? 0
    if (existing) {
      existing.current = Math.max(existing.current, current)
      continue
    }
    byGroup.set(key, { name: group.group_name || 'Без названия', current, max: group.max_cap })
  }

  return Array.from(byGroup.values())
    .map((group) => ({ ...group, free: Math.max(0, group.max - group.current) }))
    .sort((a, b) => b.free - a.free)
})

const state = computed(() => {
  if (loading.value) return 'loading' as const
  if (loadError.value) return 'error' as const
  return 'ready' as const
})

// ── Отметка прямо из сводки ─────────────────────────────────────────

async function mark(trial: AcademyTrial, attended: boolean) {
  savingIds.value = setPending(savingIds.value, trial.trial_id, true)
  actionError.value = ''
  try {
    await setTrialAttended(props.sport, trial.trial_id, attended)
    trial.attended = attended
    academy.setMarkedMissed(props.sport, trial.trial_id, !attended)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось сохранить отметку'
  } finally {
    savingIds.value = setPending(savingIds.value, trial.trial_id, false)
  }
}
</script>

<template>
  <AdminLayout>
    <AcademyHeader :sport="sport" title="Сводка" :subtitle="dateLabel">
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

    <StateBlock :state="state" :error="loadError" :rows="6" @retry="load">
      <div>
        <!-- Полоса дня: числа в строке, а не пять одинаковых плиток -->
        <div
          class="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between"
        >
          <dl class="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Занятий сегодня</dt>
              <dd class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {{ todayLessons.length }}
              </dd>
            </div>
            <div>
              <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Пробных сегодня</dt>
              <dd class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {{ trialsToday }}
              </dd>
            </div>
            <div>
              <dt class="text-theme-xs text-gray-600 dark:text-gray-400">Ждут отметки</dt>
              <dd
                class="text-2xl font-bold tabular-nums"
                :class="
                  unmarked.length
                    ? 'text-warning-700 dark:text-warning-400'
                    : 'text-gray-900 dark:text-white'
                "
              >
                {{ unmarked.length }}
              </dd>
            </div>
            <div>
              <dt class="text-theme-xs text-gray-600 dark:text-gray-400">С абонементом</dt>
              <dd class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                {{ students.length }}
              </dd>
            </div>
          </dl>

          <p
            v-if="nextLesson"
            class="flex items-center gap-2 rounded-xl bg-pitch-50 px-3.5 py-2.5 text-theme-sm text-pitch-800 dark:bg-pitch-500/12 dark:text-pitch-200"
          >
            <CalendarClock class="h-4 w-4 shrink-0" aria-hidden="true" />
            Ближайшее занятие:
            <strong class="font-bold tabular-nums">{{ nextLesson.start }}</strong>
            · {{ nextLesson.name }}
          </p>
          <p v-else class="text-theme-sm text-gray-600 dark:text-gray-400">
            На сегодня занятий больше нет.
          </p>
        </div>

        <p
          v-if="actionError"
          class="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
          role="alert"
        >
          {{ actionError }}
        </p>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div class="space-y-6">
            <!-- Занятия сегодня -->
            <section :class="panel">
              <div :class="panelHeader">
                <div>
                  <h2 :class="panelTitle">Сегодня в академии</h2>
                  <p :class="panelHint">Занятия по расписанию и записанные на них пробные.</p>
                </div>
                <router-link
                  :to="`/${sport}/groups`"
                  :class="[buttonSecondary, buttonSize.sm]"
                >
                  Всё расписание
                  <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
                </router-link>
              </div>

              <StateBlock
                :state="todayLessons.length ? 'ready' : 'empty'"
                empty-title="Сегодня занятий нет"
                empty-hint="Выходной по расписанию — или день ещё не заполнен в группах."
              >
                <template #icon><CalendarDays class="h-5 w-5" aria-hidden="true" /></template>

                <ol class="divide-y divide-gray-100 dark:divide-gray-800/70">
                  <li
                    v-for="lesson in todayLessons"
                    :key="lesson.key"
                    class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div class="flex w-full items-center gap-4 sm:w-auto">
                      <span
                        class="w-14 shrink-0 text-theme-sm font-bold tabular-nums text-gray-900 dark:text-white"
                      >
                        {{ lesson.start }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
                          {{ lesson.name }}
                        </p>
                        <p class="mt-0.5 text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                          {{ formatTimeRange(lesson.start, lesson.end) }}
                          <template v-if="lesson.trials.length">
                            · пробных: {{ lesson.trials.length }}
                          </template>
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 sm:ml-auto">
                      <div class="w-28">
                        <OccupancyMeter
                          :current="lesson.current"
                          :max="lesson.max"
                          size="sm"
                        />
                      </div>
                      <StatusPill
                        :tone="lessonState(lesson).tone"
                        :dot="lessonState(lesson).label === 'Идёт сейчас'"
                      >
                        {{ lessonState(lesson).label }}
                      </StatusPill>
                    </div>
                  </li>
                </ol>
              </StateBlock>
            </section>

            <!-- Ждут отметки -->
            <section :class="panel">
              <div :class="panelHeader">
                <div>
                  <h2 :class="panelTitle">Ждут отметки</h2>
                  <p :class="panelHint">
                    Пока отметки нет, бот не пишет родителю — диалог стоит на месте.
                  </p>
                </div>
                <router-link
                  :to="`/${sport}/trials`"
                  :class="[buttonSecondary, buttonSize.sm]"
                >
                  Все пробные
                  <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
                </router-link>
              </div>

              <StateBlock
                :state="unmarked.length ? 'ready' : 'empty'"
                empty-title="Долгов нет"
                empty-hint="Все прошедшие пробные занятия отмечены — бот отработал по каждому родителю."
              >
                <template #icon><Check class="h-5 w-5" aria-hidden="true" /></template>

                <ul class="divide-y divide-gray-100 dark:divide-gray-800/70">
                  <li
                    v-for="item in unmarked.slice(0, 6)"
                    :key="item.trial.id"
                    class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <PersonCell
                      :name="item.trial.child_name"
                      :age="item.trial.child_age"
                      :meta="`${item.trial.trial_day} · ${formatTimeRange(item.trial.start_time, item.trial.end_time)}`"
                    />
                    <AttendanceControl
                      :trial="item.trial"
                      outcome="unmarked"
                      :saving="savingIds[item.trial.trial_id] === true"
                      @mark="mark(item.trial, $event)"
                    />
                  </li>
                </ul>

                <router-link
                  v-if="unmarked.length > 6"
                  :to="`/${sport}/trials`"
                  class="focus-ring block border-t border-gray-200 px-5 py-3 text-center text-theme-sm font-medium text-pitch-700 hover:bg-gray-50 dark:border-gray-800 dark:text-pitch-400 dark:hover:bg-white/[0.03] sm:px-6"
                >
                  Ещё {{ unmarked.length - 6 }} — открыть список
                </router-link>
              </StateBlock>
            </section>
          </div>

          <div class="space-y-6">
            <!-- Воронка -->
            <section :class="[panel, 'px-5 py-4 sm:px-6']">
              <h2 :class="panelTitle">Из пробного в абонемент</h2>
              <p :class="panelHint">По всем заявкам, что есть в системе.</p>

              <p class="mt-4 flex items-baseline gap-2">
                <span class="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {{ funnel.percent === null ? '—' : `${funnel.percent}%` }}
                </span>
                <span class="text-theme-xs text-gray-600 dark:text-gray-400">
                  {{
                    funnel.came
                      ? `${funnel.converted} из ${funnel.came} пришедших`
                      : 'пришедших пока нет'
                  }}
                </span>
              </p>

              <dl class="mt-4 space-y-2 text-theme-sm">
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-gray-600 dark:text-gray-400">Всего заявок</dt>
                  <dd class="font-semibold tabular-nums text-gray-900 dark:text-white">
                    {{ funnel.total }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-gray-600 dark:text-gray-400">Пришли на занятие</dt>
                  <dd class="font-semibold tabular-nums text-gray-900 dark:text-white">
                    {{ funnel.came }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-gray-600 dark:text-gray-400">Оформили абонемент</dt>
                  <dd class="font-semibold tabular-nums text-pitch-700 dark:text-pitch-400">
                    {{ funnel.converted }}
                  </dd>
                </div>
              </dl>
            </section>

            <!-- Свободные места -->
            <section :class="panel">
              <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
                <h2 :class="panelTitle">Куда есть места</h2>
                <p :class="panelHint">Группы с наибольшим запасом — туда и записывать.</p>
              </div>

              <StateBlock
                :state="capacity.length ? 'ready' : 'empty'"
                :rows="3"
                empty-title="Вместимость не задана"
                empty-hint="Укажите вместимость групп в расписании, чтобы видеть свободные места."
              >
                <template #icon><Users class="h-5 w-5" aria-hidden="true" /></template>

                <ul class="divide-y divide-gray-100 dark:divide-gray-800/70">
                  <li
                    v-for="group in capacity.slice(0, 6)"
                    :key="group.name"
                    class="px-5 py-3 sm:px-6"
                  >
                    <p class="truncate text-theme-sm font-medium text-gray-900 dark:text-white">
                      {{ group.name }}
                    </p>
                    <div class="mt-1.5">
                      <OccupancyMeter :current="group.current" :max="group.max" />
                    </div>
                  </li>
                </ul>
              </StateBlock>
            </section>

            <router-link
              :to="`/${sport}/students`"
              class="focus-ring flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-pitch-300 hover:bg-pitch-25 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-pitch-500/40 dark:hover:bg-pitch-500/[0.08]"
            >
              <span class="flex items-center gap-3">
                <GraduationCap
                  class="h-5 w-5 text-pitch-700 dark:text-pitch-400"
                  aria-hidden="true"
                />
                <span class="text-theme-sm font-semibold text-gray-900 dark:text-white">
                  Ученики и абонементы
                </span>
              </span>
              <ArrowRight class="h-4 w-4 text-gray-500" aria-hidden="true" />
            </router-link>
          </div>
        </div>
      </div>
    </StateBlock>
  </AdminLayout>
</template>
