/**
 * Состояние интерфейса академии, которое должно переживать переход между
 * страницами и переключение вида спорта: активное направление (по нему сайдбар
 * строит ссылки), фильтры списков и локальные отметки «не пришёл».
 */
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

import type { SportKey } from '@/services/academy'
import { isSportKey, SPORT_KEYS } from '@/services/academy'
import type { TrialOutcome } from '@/utils/trialOutcome'

const SPORT_STORAGE_KEY = 'dopsy_academy_sport'
const MISSED_STORAGE_KEY = 'dopsy_academy_missed'

export type TrialStatusFilter = 'all' | TrialOutcome
export type StudentMode = 'unsubscribed' | 'subscribed'

function readSport(): SportKey {
  try {
    const stored = localStorage.getItem(SPORT_STORAGE_KEY)
    if (isSportKey(stored)) return stored
  } catch {
    /* приватный режим или заблокированное хранилище — берём значение по умолчанию */
  }
  return 'football'
}

/**
 * Локальные отметки «не пришёл».
 *
 * PATCH `attended: false` бэкенд принимает, но на чтении «не пришёл» и «ещё не
 * отмечено» неотличимы. Пока в API нет третьего состояния, помним явное
 * решение менеджера здесь, чтобы отмеченная строка не возвращалась в очередь
 * «нужно отметить» после перезагрузки.
 */
function readMissed(): Record<SportKey, number[]> {
  const empty = SPORT_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: [] }),
    {} as Record<SportKey, number[]>,
  )

  try {
    const raw = localStorage.getItem(MISSED_STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<Record<SportKey, unknown>>
    for (const key of SPORT_KEYS) {
      const ids = parsed[key]
      if (Array.isArray(ids)) {
        empty[key] = ids.filter((id): id is number => typeof id === 'number')
      }
    }
  } catch {
    /* повреждённое хранилище не должно ломать страницу */
  }

  return empty
}

export const useAcademyStore = defineStore('academy', () => {
  const activeSport = ref<SportKey>(readSport())

  const trialFilters = reactive({
    query: '',
    groupId: 'all' as string,
    status: 'all' as TrialStatusFilter,
    language: 'all' as 'all' | 'KZ' | 'RU',
  })

  const studentFilters = reactive({
    query: '',
    mode: 'unsubscribed' as StudentMode,
    groupId: 'all' as string,
  })

  const missedBySport = ref<Record<SportKey, number[]>>(readMissed())

  watch(activeSport, (sport) => {
    try {
      localStorage.setItem(SPORT_STORAGE_KEY, sport)
    } catch {
      /* сохранять выбор не обязательно */
    }
  })

  watch(
    missedBySport,
    (value) => {
      try {
        localStorage.setItem(MISSED_STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* сохранять отметки не обязательно */
      }
    },
    { deep: true },
  )

  function setSport(sport: SportKey) {
    activeSport.value = sport
  }

  function isMarkedMissed(sport: SportKey, trialId: number): boolean {
    return missedBySport.value[sport]?.includes(trialId) ?? false
  }

  function setMarkedMissed(sport: SportKey, trialId: number, missed: boolean) {
    const current = missedBySport.value[sport] ?? []
    const next = missed
      ? current.includes(trialId)
        ? current
        : [...current, trialId]
      : current.filter((id) => id !== trialId)
    missedBySport.value = { ...missedBySport.value, [sport]: next }
  }

  const trialFiltersActive = computed(
    () =>
      trialFilters.query.trim() !== '' ||
      trialFilters.groupId !== 'all' ||
      trialFilters.status !== 'all' ||
      trialFilters.language !== 'all',
  )

  function resetTrialFilters() {
    trialFilters.query = ''
    trialFilters.groupId = 'all'
    trialFilters.status = 'all'
    trialFilters.language = 'all'
  }

  return {
    activeSport,
    setSport,
    trialFilters,
    trialFiltersActive,
    resetTrialFilters,
    studentFilters,
    isMarkedMissed,
    setMarkedMissed,
  }
})
