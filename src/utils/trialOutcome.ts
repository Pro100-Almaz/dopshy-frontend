/**
 * Статус пробного занятия и последствия отметки менеджера.
 *
 * ТЗ §2.3: сообщение родителю уходит только после того, как менеджер отметил
 * «келді / келмеді», и текст сообщения зависит от отметки и от наличия
 * абонемента. Поэтому отметка — не галочка в таблице, а действие с видимым
 * последствием, и интерфейс показывает, что именно уйдёт в WhatsApp.
 *
 * Ограничение API: `attended` — булево, поэтому «не пришёл» и «ещё не
 * отмечено» на бэкенде выглядят одинаково. Пока бэкенд не отдаёт третье
 * состояние, факт явной отметки «не пришёл» помним на клиенте
 * (см. `stores/academy.ts`), а список пробных дополнительно опирается на
 * время занятия: пока занятие не прошло, отметку не требуем.
 */
import type { AcademyTrial } from '@/services/academy'
import { normalizeLanguage } from '@/services/academy'
import { trialTiming } from './schedule'

export type TrialOutcome =
  /** Оформлен абонемент — работа с пробным закончена. */
  | 'subscribed'
  /** Отмечен «пришёл». */
  | 'attended'
  /** Отмечен «не пришёл». */
  | 'missed'
  /** Занятие прошло, отметки нет — ждёт решения менеджера. */
  | 'unmarked'
  /** Занятие ещё впереди. */
  | 'awaiting'

export interface OutcomeMeta {
  outcome: TrialOutcome
  label: string
  tone: 'pitch' | 'warning' | 'danger' | 'neutral' | 'info'
}

const OUTCOME_META: Record<TrialOutcome, Omit<OutcomeMeta, 'outcome'>> = {
  subscribed: { label: 'Абонемент оформлен', tone: 'pitch' },
  attended: { label: 'Пришёл', tone: 'pitch' },
  missed: { label: 'Не пришёл', tone: 'danger' },
  unmarked: { label: 'Нужно отметить', tone: 'warning' },
  awaiting: { label: 'Ожидается', tone: 'neutral' },
}

export function trialOutcome(
  trial: AcademyTrial,
  options: { markedMissed?: boolean; now?: Date } = {},
): OutcomeMeta {
  const now = options.now ?? new Date()

  const outcome: TrialOutcome = trial.subscribed
    ? 'subscribed'
    : trial.attended
      ? 'attended'
      : options.markedMissed
        ? 'missed'
        : trialTiming(trial, now).past
          ? 'unmarked'
          : 'awaiting'

  return { outcome, ...OUTCOME_META[outcome] }
}

// ── Что бот отправит родителю (ТЗ §2.3) ─────────────────────────────

type BotLanguage = 'KZ' | 'RU'

const BOT_MESSAGES: Record<'missed' | 'attendedNoPlan' | 'attendedWithPlan', Record<BotLanguage, string>> = {
  missed: {
    KZ: 'Балаңыз бүгін пробный сабаққа келмеді. Қайта жазылғыңыз келе ме?',
    RU: 'Ваш ребёнок не пришёл на пробное занятие. Хотите записаться снова?',
  },
  attendedNoPlan: {
    KZ: 'Пробный сабақ қалай өтті? Не ұнамады немесе сұрақтарыңыз бар ма?',
    RU: 'Как прошло пробное занятие? Что не понравилось или остались вопросы?',
  },
  attendedWithPlan: {
    KZ: 'Рахмет! Балаңыз абонементке жазылды. Бірге табысты болайық! 🎉',
    RU: 'Спасибо! Ваш ребёнок записан на абонемент. Успехов вместе! 🎉',
  },
}

/** Язык переписки родителя; неизвестный — русский. */
export function botLanguage(trial: AcademyTrial): BotLanguage {
  return normalizeLanguage(trial.language) ?? 'RU'
}

/**
 * Текст, который бот отправит родителю после отметки. `null` — отметки нет,
 * значит бот молчит: по ТЗ он не пишет ничего до решения менеджера.
 */
export function botMessageFor(
  trial: AcademyTrial,
  outcome: TrialOutcome,
): { language: BotLanguage; text: string } | null {
  const language = botLanguage(trial)

  switch (outcome) {
    case 'subscribed':
      return { language, text: BOT_MESSAGES.attendedWithPlan[language] }
    case 'attended':
      return { language, text: BOT_MESSAGES.attendedNoPlan[language] }
    case 'missed':
      return { language, text: BOT_MESSAGES.missed[language] }
    default:
      return null
  }
}

/** Предпросмотр для кнопки: что уйдёт родителю, если нажать. */
export function botMessagePreview(
  trial: AcademyTrial,
  action: 'attended' | 'missed' | 'subscribe',
): { language: BotLanguage; text: string } {
  const language = botLanguage(trial)
  const key =
    action === 'missed'
      ? 'missed'
      : action === 'subscribe'
        ? 'attendedWithPlan'
        : 'attendedNoPlan'
  return { language, text: BOT_MESSAGES[key][language] }
}
