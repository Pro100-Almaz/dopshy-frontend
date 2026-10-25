/**
 * Состояние интерфейса академии, которое должно переживать переход между
 * страницами и переключение вида спорта: активное направление (по нему сайдбар
 * строит ссылки) и фильтры списков.
 */
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'

import type { SportKey } from '@/services/academy'
import { isSportKey } from '@/services/academy'
import type { TrialOutcome } from '@/utils/trialOutcome'

const SPORT_STORAGE_KEY = 'dopsy_academy_sport'

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

  watch(activeSport, (sport) => {
    try {
      localStorage.setItem(SPORT_STORAGE_KEY, sport)
    } catch {
      /* сохранять выбор не обязательно */
    }
  })

  function setSport(sport: SportKey) {
    activeSport.value = sport
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
  }
})
