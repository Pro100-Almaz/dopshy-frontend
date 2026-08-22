/**
 * Короткая сводка по академии для панели управления: занятия сегодня, долг по
 * отметкам, оплаченные абонементы — по каждому направлению.
 *
 * Загружается один раз при открытии панели, а не в пятисекундном поллинге:
 * список пробных бэкенд собирает обходом всех групп, и держать его в опросе
 * дорого без всякой пользы.
 */
import { ref } from 'vue'

import {
  listGroups,
  listStudents,
  listTrials,
  SPORT_KEYS,
  SPORTS,
  type SportKey,
} from '@/services/academy'
import { useAcademyStore } from '@/stores/academy'
import { resolveWeekday, trialTiming } from '@/utils/schedule'
import { trialOutcome } from '@/utils/trialOutcome'

export interface AcademyDigest {
  sport: SportKey
  title: string
  label: string
  lessonsToday: number
  trialsToday: number
  unmarked: number
  subscribed: number
  /** Направление не ответило — показываем это, а не нули. */
  failed: boolean
}

export function useAcademyDigest() {
  const academy = useAcademyStore()
  const digests = ref<AcademyDigest[]>([])
  const loading = ref(false)

  async function digestFor(sport: SportKey): Promise<AcademyDigest> {
    const base = {
      sport,
      title: SPORTS[sport].title,
      label: SPORTS[sport].label,
    }

    try {
      const now = new Date()
      const todayIndex = (now.getDay() + 6) % 7
      const [groups, trials, students] = await Promise.all([
        listGroups(sport),
        listTrials(sport),
        listStudents(sport, true),
      ])

      return {
        ...base,
        lessonsToday: groups.filter(
          (group) =>
            resolveWeekday(
              group.training_day_label || group.training_day,
              group.training_day_value,
            ) === todayIndex,
        ).length,
        trialsToday: trials.filter((trial) => trialTiming(trial, now).today).length,
        unmarked: trials.filter(
          (trial) =>
            trialOutcome(trial, {
              markedMissed: academy.isMarkedMissed(sport, trial.trial_id),
              now,
            }).outcome === 'unmarked',
        ).length,
        subscribed: students.length,
        failed: false,
      }
    } catch {
      return {
        ...base,
        lessonsToday: 0,
        trialsToday: 0,
        unmarked: 0,
        subscribed: 0,
        failed: true,
      }
    }
  }

  async function load() {
    loading.value = true
    try {
      digests.value = await Promise.all(SPORT_KEYS.map(digestFor))
    } finally {
      loading.value = false
    }
  }

  return { digests, loading, load }
}
