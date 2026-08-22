/**
 * Разбор расписания академии.
 *
 * Бэкенд отдаёт день занятия то подписью («Сәрсенбі», «Среда»), то числом
 * (`training_day_value`), а у пробного (`trial_day`) — иногда датой. Разбирать
 * это по месту в каждом компоненте — верный способ развести три страницы в
 * трёх разных трактовках, поэтому вся логика дня и времени живёт здесь.
 */

export interface Weekday {
  /** 0 = понедельник … 6 = воскресенье (неделя начинается с понедельника). */
  index: number
  short: string
  long: string
}

export const WEEKDAYS: Weekday[] = [
  { index: 0, short: 'Пн', long: 'Понедельник' },
  { index: 1, short: 'Вт', long: 'Вторник' },
  { index: 2, short: 'Ср', long: 'Среда' },
  { index: 3, short: 'Чт', long: 'Четверг' },
  { index: 4, short: 'Пт', long: 'Пятница' },
  { index: 5, short: 'Сб', long: 'Суббота' },
  { index: 6, short: 'Вс', long: 'Воскресенье' },
]

/** Подписи дней на трёх языках — бэкенд может прислать любую из них. */
const DAY_ALIASES: Record<number, string[]> = {
  0: ['пн', 'понедельник', 'дүйсенбі', 'дуйсенби', 'mon', 'monday'],
  1: ['вт', 'вторник', 'сейсенбі', 'сейсенби', 'tue', 'tuesday'],
  2: ['ср', 'среда', 'сәрсенбі', 'сарсенби', 'wed', 'wednesday'],
  3: ['чт', 'четверг', 'бейсенбі', 'бейсенби', 'thu', 'thursday'],
  4: ['пт', 'пятница', 'жұма', 'жума', 'fri', 'friday'],
  5: ['сб', 'суббота', 'сенбі', 'сенби', 'sat', 'saturday'],
  6: ['вс', 'воскресенье', 'жексенбі', 'жексенби', 'sun', 'sunday'],
}

/**
 * День недели из подписи или числа. Подпись надёжнее: нумерация у бэкенда не
 * зафиксирована, поэтому число трактуем эвристикой (0…6 и 1…7 — обе с
 * понедельника) и только когда подпись не разобралась.
 */
export function resolveWeekday(label?: string | null, value?: number | null): number | null {
  const normalized = (label ?? '').trim().toLowerCase()
  if (normalized) {
    for (const [index, aliases] of Object.entries(DAY_ALIASES)) {
      if (aliases.some((alias) => normalized.startsWith(alias))) return Number(index)
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value <= 6) return value
    if (value === 7) return 6
  }

  return null
}

export function weekdayShort(index: number | null): string {
  return index === null ? '—' : WEEKDAYS[index].short
}

export function weekdayLong(index: number | null): string {
  return index === null ? 'День не указан' : WEEKDAYS[index].long
}

/** 'HH:mm[:ss]' → минуты от начала суток; мусор → null. */
export function parseTimeToMinutes(value?: string | null): number | null {
  const match = (value ?? '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** 'HH:mm:ss' → 'HH:mm'. */
export function formatTime(value?: string | null): string {
  const minutes = parseTimeToMinutes(value)
  if (minutes === null) return value || '—'
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  const from = formatTime(start)
  const to = formatTime(end)
  if (from === '—' && to === '—') return '—'
  if (to === '—') return from
  return `${from}–${to}`
}

/** Явная дата из строки: ISO, 'YYYY-MM-DD' или 'DD.MM.YYYY'. */
export function parseExplicitDate(value?: string | null): Date | null {
  const raw = (value ?? '').trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  }

  const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dotted) {
    return new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]))
  }

  return null
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Понедельник недели, в которую попадает `date`. */
export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date)
  // getDay(): 0 = воскресенье, поэтому воскресенье относим к предыдущей неделе.
  const shift = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - shift)
  return copy
}

/** Дата этого дня недели в текущей неделе, со временем начала занятия. */
export function occurrenceInCurrentWeek(
  weekday: number,
  startMinutes: number | null,
  now: Date,
): Date {
  const date = startOfWeek(now)
  date.setDate(date.getDate() + weekday)
  if (startMinutes !== null) {
    date.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
  }
  return date
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const dayMonthFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

export function formatDayMonth(date: Date): string {
  return dayMonthFormat.format(date)
}

/** «Сегодня» / «Завтра» / «Вчера» / «Ср, 26 авг.» */
export function relativeDayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Сегодня'
  if (isSameDay(date, addDays(now, 1))) return 'Завтра'
  if (isSameDay(date, addDays(now, -1))) return 'Вчера'
  return `${weekdayShort(((date.getDay() + 6) % 7))}, ${formatDayMonth(date)}`
}

// ── Время пробного занятия ──────────────────────────────────────────

export interface TrialTiming {
  /** День недели занятия, если удалось определить. */
  weekday: number | null
  /** Дата занятия: явная из ответа либо ближайшая в текущей неделе. */
  date: Date | null
  /** Дата пришла из ответа, а не вычислена по дню недели. */
  exact: boolean
  /** Занятие уже закончилось — значит отметку о посещении ждут. */
  past: boolean
  /** Занятие сегодня. */
  today: boolean
}

/**
 * Когда состоится (или состоялось) пробное занятие.
 *
 * Если бэкенд дал дату — считаем по ней. Если только день недели, берём его
 * вхождение в текущей неделе: для отметки посещаемости важно ровно одно —
 * занятие уже прошло или ещё нет.
 */
export function trialTiming(
  input: { trial_day?: string | null; start_time?: string | null; end_time?: string | null },
  now: Date = new Date(),
): TrialTiming {
  const startMinutes = parseTimeToMinutes(input.start_time)
  const endMinutes = parseTimeToMinutes(input.end_time) ?? startMinutes
  const explicit = parseExplicitDate(input.trial_day)

  const date = explicit
    ? (() => {
        const withTime = new Date(explicit)
        if (startMinutes !== null) {
          withTime.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
        }
        return withTime
      })()
    : (() => {
        const weekday = resolveWeekday(input.trial_day)
        return weekday === null ? null : occurrenceInCurrentWeek(weekday, startMinutes, now)
      })()

  const weekday = explicit
    ? (explicit.getDay() + 6) % 7
    : resolveWeekday(input.trial_day)

  if (!date) {
    return { weekday, date: null, exact: false, past: false, today: false }
  }

  const finish = new Date(date)
  if (endMinutes !== null) {
    finish.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)
  }

  return {
    weekday,
    date,
    exact: Boolean(explicit),
    past: finish.getTime() < now.getTime(),
    today: isSameDay(date, now),
  }
}

/** Ключ и подпись для группировки списка пробных по дням. */
export function dayBucket(
  timing: TrialTiming,
  now: Date,
): { key: string; label: string; order: number } {
  if (!timing.date) {
    return { key: 'unknown', label: 'День не указан', order: Number.MAX_SAFE_INTEGER }
  }

  const day = startOfDay(timing.date)
  return {
    key: day.toISOString().slice(0, 10),
    label: relativeDayLabel(day, now),
    order: day.getTime(),
  }
}
