<script setup lang="ts">
/**
 * Пробные занятия — рабочая очередь менеджера.
 *
 * По ТЗ §2.3 бот молчит, пока менеджер не отметил «келді / келмеді», и текст
 * сообщения зависит от отметки. Поэтому экран построен как список дел по
 * дням, а не как таблица «всё подряд»: сверху то, что уже прошло и ждёт
 * отметки, дальше сегодняшние и будущие занятия, в конце — история.
 */
import { computed, onMounted, ref, watch } from 'vue'
import {
  CalendarClock,
  Inbox,
  LoaderCircle,
  RefreshCw,
  Search,
  StickyNote,
  UserPlus,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ChevronDownIcon } from '@/icons'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import AttendanceControl from '@/components/academy/AttendanceControl.vue'
import ContactActions from '@/components/academy/ContactActions.vue'
import PersonCell from '@/components/academy/PersonCell.vue'
import StateBlock from '@/components/academy/StateBlock.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
import {
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
  listTrials,
  normalizeLanguage,
  setTrialAttended,
  setTrialSubscribed,
  shiftLabel,
  SPORTS,
  type AcademyTrial,
  type SportKey,
} from '@/services/academy'
import { useAcademyStore } from '@/stores/academy'
import { dayBucket, formatTimeRange, trialTiming } from '@/utils/schedule'
import { botMessageFor, trialOutcome, type TrialOutcome } from '@/utils/trialOutcome'
import { setPending, type PendingMap } from '@/utils/pending'
import { plural, pluralize } from '@/utils/plural'

const props = defineProps<{ sport: SportKey }>()

const academy = useAcademyStore()
const filters = academy.trialFilters
const {
  load: loadHandoff,
  stateFor: handoffFor,
  isPending: handoffPending,
  toggle: toggleHandoff,
  error: handoffError,
} = useBotHandoff()

const trials = ref<AcademyTrial[]>([])
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const savingIds = ref<PendingMap<number>>({})
/** Обновляем «сейчас» при перезагрузке: от него зависит, ждём ли отметку. */
const now = ref(new Date())

// ── Загрузка ────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  try {
    now.value = new Date()
    trials.value = await listTrials(props.sport)
    loadError.value = ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить пробные занятия'
  } finally {
    loading.value = false
  }
  // Статусы бота — отдельно: экран должен работать и без сервиса бота.
  loadHandoff()
}

onMounted(load)
watch(() => props.sport, load)

// ── Производные данные ──────────────────────────────────────────────

interface TrialRow {
  trial: AcademyTrial
  outcome: TrialOutcome
  outcomeLabel: string
  tone: 'pitch' | 'warning' | 'danger' | 'neutral' | 'info'
  timeLabel: string
  groupName: string
  botMessage: { language: 'KZ' | 'RU'; text: string } | null
  past: boolean
  bucket: { key: string; label: string; order: number }
}

function groupNameOf(trial: AcademyTrial): string {
  return trial.assigned_group_name || trial.group_id || 'Группа не назначена'
}

const rows = computed<TrialRow[]>(() =>
  trials.value.map((trial) => {
    const meta = trialOutcome(trial, {
      markedMissed: academy.isMarkedMissed(props.sport, trial.trial_id),
      now: now.value,
    })
    const timing = trialTiming(trial, now.value)

    return {
      trial,
      outcome: meta.outcome,
      outcomeLabel: meta.label,
      tone: meta.tone,
      timeLabel: formatTimeRange(trial.start_time, trial.end_time),
      groupName: groupNameOf(trial),
      botMessage: botMessageFor(trial, meta.outcome),
      past: timing.past,
      bucket: dayBucket(timing, now.value),
    }
  }),
)

const groupOptions = computed(() => {
  const names = new Set<string>()
  for (const row of rows.value) names.add(row.groupName)
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'))
})

const unmarkedCount = computed(() => rows.value.filter((row) => row.outcome === 'unmarked').length)

const filtered = computed(() => {
  const query = filters.query.trim().toLowerCase()
  const digits = query.replace(/\D/g, '')

  return rows.value.filter((row) => {
    if (filters.status !== 'all' && row.outcome !== filters.status) return false
    if (filters.groupId !== 'all' && row.groupName !== filters.groupId) return false
    if (filters.language !== 'all' && normalizeLanguage(row.trial.language) !== filters.language) {
      return false
    }
    if (!query) return true

    const nameHit = row.trial.child_name.toLowerCase().includes(query)
    const groupHit = row.groupName.toLowerCase().includes(query)
    const phoneHit = digits.length > 1 && row.trial.phone.replace(/\D/g, '').includes(digits)
    return nameHit || groupHit || phoneHit
  })
})

/**
 * Порядок дней: сначала то, что ждёт отметки (прошедшее, ближайшее к
 * сегодня), затем сегодня и будущее по возрастанию, в конце — старая история.
 */
const dayGroups = computed(() => {
  const buckets = new Map<string, { label: string; order: number; rows: TrialRow[]; past: boolean }>()

  for (const row of filtered.value) {
    const existing = buckets.get(row.bucket.key)
    if (existing) {
      existing.rows.push(row)
      continue
    }
    buckets.set(row.bucket.key, {
      label: row.bucket.label,
      order: row.bucket.order,
      rows: [row],
      past: row.past,
    })
  }

  const list = Array.from(buckets.values())
  for (const bucket of list) {
    bucket.rows.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel))
  }

  const today = new Date(now.value)
  today.setHours(0, 0, 0, 0)

  return list.sort((a, b) => {
    const aFuture = a.order >= today.getTime()
    const bFuture = b.order >= today.getTime()
    // Прошедшие дни — сверху и в обратном порядке: свежий долг важнее старого.
    if (aFuture !== bFuture) return aFuture ? 1 : -1
    return aFuture ? a.order - b.order : b.order - a.order
  })
})

const state = computed(() => {
  if (loading.value) return 'loading' as const
  if (loadError.value) return 'error' as const
  if (!filtered.value.length) return 'empty' as const
  return 'ready' as const
})

const emptyHint = computed(() =>
  academy.trialFiltersActive
    ? 'Ни одна запись не подходит под фильтры. Сбросьте их, чтобы увидеть все пробные.'
    : `Заявки приходят из WhatsApp-бота ${SPORTS[props.sport].title.toLowerCase()} и появляются здесь автоматически.`,
)

// ── Действия ────────────────────────────────────────────────────────

function isSaving(trial: AcademyTrial): boolean {
  return savingIds.value[trial.trial_id] === true
}

function setSaving(trial: AcademyTrial, value: boolean) {
  savingIds.value = setPending(savingIds.value, trial.trial_id, value)
}

async function mark(trial: AcademyTrial, attended: boolean) {
  setSaving(trial, true)
  actionError.value = ''
  try {
    await setTrialAttended(props.sport, trial.trial_id, attended)
    trial.attended = attended
    // Явное «не пришёл» помним локально: в API это то же `attended: false`,
    // что и «ещё не смотрели», и без этого строка вернулась бы в очередь.
    academy.setMarkedMissed(props.sport, trial.trial_id, !attended)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось сохранить отметку'
  } finally {
    setSaving(trial, false)
  }
}

async function subscribe(trial: AcademyTrial) {
  setSaving(trial, true)
  actionError.value = ''
  try {
    await setTrialSubscribed(props.sport, trial.trial_id, true)
    trial.subscribed = true
    academy.setMarkedMissed(props.sport, trial.trial_id, false)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Не удалось оформить абонемент'
  } finally {
    setSaving(trial, false)
  }
}

function showOnlyUnmarked() {
  filters.status = 'unmarked'
  filters.query = ''
  filters.groupId = 'all'
  filters.language = 'all'
}

const STATUS_TABS: { value: 'all' | TrialOutcome; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'unmarked', label: 'Нужно отметить' },
  { value: 'awaiting', label: 'Ожидаются' },
  { value: 'attended', label: 'Пришли' },
  { value: 'missed', label: 'Не пришли' },
  { value: 'subscribed', label: 'С абонементом' },
]

const tabClass = (active: boolean) =>
  [
    'focus-ring rounded-lg px-3 py-1.5 text-theme-xs font-semibold transition-colors duration-150',
    active
      ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  ].join(' ')
</script>

<template>
  <AdminLayout>
    <AcademyHeader
      :sport="sport"
      title="Пробные занятия"
      subtitle="Отметка «пришёл / не пришёл» — это команда боту: пока её нет, родителю не уходит ничего."
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

    <!-- Долг по отметкам — единственная вещь, которую нельзя пропустить. -->
    <div
      v-if="unmarkedCount && filters.status !== 'unmarked'"
      class="mb-5 flex flex-col gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4 dark:border-warning-500/30 dark:bg-warning-500/10 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-start gap-3">
        <CalendarClock
          class="mt-0.5 h-5 w-5 shrink-0 text-warning-700 dark:text-warning-400"
          aria-hidden="true"
        />
        <div>
          <p class="text-theme-sm font-semibold text-warning-800 dark:text-warning-200">
            {{ pluralize(unmarkedCount, 'занятие', 'занятия', 'занятий') }}
            {{ plural(unmarkedCount, 'прошло', 'прошли', 'прошли') }} без отметки
          </p>
          <p class="mt-0.5 text-theme-xs text-warning-800/90 dark:text-warning-200/80">
            Бот ждёт отметки, чтобы написать родителям — без неё диалог не продолжится.
          </p>
        </div>
      </div>
      <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="showOnlyUnmarked">
        Показать только их
      </button>
    </div>

    <section :class="panel">
      <!-- Фильтры -->
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Статус пробного"
            class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
          >
            <button
              v-for="tab in STATUS_TABS"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="filters.status === tab.value"
              :class="tabClass(filters.status === tab.value)"
              @click="filters.status = tab.value"
            >
              {{ tab.label }}
              <span
                v-if="tab.value === 'unmarked' && unmarkedCount"
                class="ml-1 tabular-nums text-warning-700 dark:text-warning-400"
              >
                {{ unmarkedCount }}
              </span>
            </button>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="relative sm:w-52">
              <label class="sr-only" for="trial-group">Группа</label>
              <select id="trial-group" v-model="filters.groupId" :class="select">
                <option value="all">Все группы</option>
                <option v-for="name in groupOptions" :key="name" :value="name">{{ name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              />
            </div>

            <div class="relative sm:w-40">
              <label class="sr-only" for="trial-language">Язык</label>
              <select id="trial-language" v-model="filters.language" :class="select">
                <option value="all">Любой язык</option>
                <option value="KZ">Қазақша</option>
                <option value="RU">Русский</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              />
            </div>

            <div class="relative sm:w-64">
              <label class="sr-only" for="trial-search">Поиск</label>
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <input
                id="trial-search"
                v-model="filters.query"
                type="search"
                placeholder="Имя, телефон, группа"
                :class="[inputSm, 'pl-9']"
              />
            </div>
          </div>
        </div>

        <button
          v-if="academy.trialFiltersActive"
          type="button"
          :class="[buttonGhost, buttonSize.sm, 'mt-3']"
          @click="academy.resetTrialFilters()"
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
        empty-title="Пробных занятий нет"
        :empty-hint="emptyHint"
        @retry="load"
      >
        <template #icon><Inbox class="h-5 w-5" aria-hidden="true" /></template>

        <div>
          <div v-for="day in dayGroups" :key="day.order" class="border-b border-gray-200 last:border-0 dark:border-gray-800">
            <!-- Заголовок дня -->
            <div
              class="flex items-center justify-between gap-3 bg-gray-50 px-5 py-2.5 dark:bg-white/[0.03] sm:px-6"
            >
              <h2 class="text-theme-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                {{ day.label }}
              </h2>
              <span class="text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                {{ day.rows.length }}
              </span>
            </div>

            <!-- Таблица: десктоп -->
            <table class="hidden w-full lg:table">
              <thead class="sr-only">
                <tr>
                  <th :class="th">Ребёнок</th>
                  <th :class="th">Контакт</th>
                  <th :class="th">Занятие</th>
                  <th :class="th">Статус</th>
                  <th :class="th">Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in day.rows"
                  :key="row.trial.id"
                  class="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/70 dark:hover:bg-white/[0.02]"
                >
                  <td :class="[td, 'w-[24%]']">
                    <PersonCell
                      :name="row.trial.child_name"
                      :age="row.trial.child_age"
                      :birthdate="row.trial.birthdate"
                    />
                    <p
                      v-if="row.trial.notes"
                      class="mt-2 flex items-start gap-1.5 text-theme-xs text-gray-600 dark:text-gray-400"
                    >
                      <StickyNote class="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                      <span class="line-clamp-2">{{ row.trial.notes }}</span>
                    </p>
                  </td>

                  <td :class="[td, 'w-[19%]']">
                    <ContactActions
                      :phone="row.trial.phone"
                      :language="normalizeLanguage(row.trial.language)"
                      :handoff="handoffFor(row.trial.phone)"
                      :handoff-pending="handoffPending(row.trial.phone)"
                      @handoff="toggleHandoff(row.trial.phone)"
                    />
                  </td>

                  <td :class="[td, 'w-[19%]']">
                    <span class="block text-theme-sm font-medium text-gray-900 dark:text-white">
                      {{ row.groupName }}
                    </span>
                    <span class="mt-0.5 block text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                      {{ row.trial.trial_day }} · {{ row.timeLabel }}
                    </span>
                    <span
                      v-if="shiftLabel(row.trial.shift)"
                      class="mt-0.5 block text-theme-xs text-gray-600 dark:text-gray-400"
                    >
                      Смена: {{ shiftLabel(row.trial.shift) }}
                    </span>
                  </td>

                  <td :class="[td, 'w-[20%]']">
                    <StatusPill :tone="row.tone">{{ row.outcomeLabel }}</StatusPill>
                    <p
                      v-if="row.botMessage"
                      class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400"
                      :title="row.botMessage.text"
                    >
                      Родителю ({{ row.botMessage.language }}):
                      <span class="line-clamp-2 italic">«{{ row.botMessage.text }}»</span>
                    </p>
                    <p v-else class="mt-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
                      Бот ждёт отметки — сообщение не отправлено.
                    </p>
                  </td>

                  <td :class="[td, 'w-[18%]']">
                    <div class="flex flex-col items-start gap-2">
                      <AttendanceControl
                        :trial="row.trial"
                        :outcome="row.outcome"
                        :saving="isSaving(row.trial)"
                        @mark="mark(row.trial, $event)"
                      />
                      <button
                        v-if="row.outcome !== 'subscribed'"
                        type="button"
                        :class="[
                          row.outcome === 'attended' ? buttonPrimary : buttonSecondary,
                          buttonSize.sm,
                        ]"
                        :disabled="isSaving(row.trial)"
                        @click="subscribe(row.trial)"
                      >
                        <UserPlus class="h-3.5 w-3.5" aria-hidden="true" />
                        Оформить абонемент
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Карточки: планшет и мобильный -->
            <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
              <li v-for="row in day.rows" :key="row.trial.id" class="px-5 py-4 sm:px-6">
                <div class="flex items-start justify-between gap-3">
                  <PersonCell
                    :name="row.trial.child_name"
                    :age="row.trial.child_age"
                    :birthdate="row.trial.birthdate"
                  />
                  <StatusPill :tone="row.tone">{{ row.outcomeLabel }}</StatusPill>
                </div>

                <dl class="mt-3 space-y-1.5 text-theme-xs">
                  <div class="flex gap-2">
                    <dt class="w-20 shrink-0 text-gray-600 dark:text-gray-400">Занятие</dt>
                    <dd class="text-gray-900 dark:text-gray-200">
                      {{ row.groupName }} · {{ row.trial.trial_day }} · {{ row.timeLabel }}
                    </dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="w-20 shrink-0 text-gray-600 dark:text-gray-400">Контакт</dt>
                    <dd>
                      <ContactActions
                        :phone="row.trial.phone"
                        :language="normalizeLanguage(row.trial.language)"
                        :handoff="handoffFor(row.trial.phone)"
                        :handoff-pending="handoffPending(row.trial.phone)"
                        @handoff="toggleHandoff(row.trial.phone)"
                      />
                    </dd>
                  </div>
                  <div v-if="row.trial.notes" class="flex gap-2">
                    <dt class="w-20 shrink-0 text-gray-600 dark:text-gray-400">Заметка</dt>
                    <dd class="text-gray-900 dark:text-gray-200">{{ row.trial.notes }}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="w-20 shrink-0 text-gray-600 dark:text-gray-400">Родителю</dt>
                    <dd class="text-gray-700 dark:text-gray-300">
                      <span v-if="row.botMessage" class="italic"
                        >«{{ row.botMessage.text }}»</span
                      >
                      <span v-else>Бот ждёт отметки — сообщение не отправлено.</span>
                    </dd>
                  </div>
                </dl>

                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <AttendanceControl
                    :trial="row.trial"
                    :outcome="row.outcome"
                    :saving="isSaving(row.trial)"
                    @mark="mark(row.trial, $event)"
                  />
                  <button
                    v-if="row.outcome !== 'subscribed'"
                    type="button"
                    :class="[
                      row.outcome === 'attended' ? buttonPrimary : buttonSecondary,
                      buttonSize.sm,
                    ]"
                    :disabled="isSaving(row.trial)"
                    @click="subscribe(row.trial)"
                  >
                    <UserPlus class="h-3.5 w-3.5" aria-hidden="true" />
                    Оформить
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </StateBlock>
    </section>
  </AdminLayout>
</template>
