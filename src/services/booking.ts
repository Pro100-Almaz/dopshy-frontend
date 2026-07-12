import type {
  Field,
  Slot,
  SlotStatus,
  BookingDraft,
  BookingConfirmation,
  Booking,
  BookingApi,
  BookingStatus,
  BookingPeriod,
} from '@/types'
import { apiFetch } from './api'

// ── Геолокация арены (для карты / маршрута) ─────────
export const ARENA = {
  address: 'Алматы, ул. Спортивная 12',
  lat: 43.238949,
  lng: 76.889709,
}

export function directionsUrl(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${ARENA.lat},${ARENA.lng}`
}

// Известные рабочие изображения (уже используются в проекте) — не гадаем ID.
const IMG = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`
const P1 = IMG('photo-1518063319789-7217e6706b04')
const P2 = IMG('photo-1508344928928-7165b67de128')
const P3 = IMG('photo-1579952363873-27f3bade9f55')

const AMENITIES = {
  locker: 'Раздевалки',
  shower: 'Душ',
  parking: 'Парковка',
  lighting: 'Освещение',
  gear: 'Аренда инвентаря',
  cafe: 'Кафе',
}

const FIELDS: Field[] = [
  {
    id: 'central-5',
    name: 'Поле 5×5 «Центральное»',
    type: '5x5',
    indoor: false,
    surface: 'Искусственный газон 4G',
    pricePerHour: 12000,
    capacity: 'до 10 игроков',
    sizeMeters: '40 × 20 м',
    photos: [P1, P3],
    amenities: [AMENITIES.locker, AMENITIES.shower, AMENITIES.parking, AMENITIES.lighting],
    description:
      'Флагманское поле арены с газоном стандарта FIFA и профессиональным освещением 500 люкс. Идеально для вечерних матчей 5×5.',
  },
  {
    id: 'arena-7',
    name: 'Поле 7×7 «Арена»',
    type: '7x7',
    indoor: false,
    surface: 'Искусственный газон 4G',
    pricePerHour: 18000,
    capacity: 'до 14 игроков',
    sizeMeters: '55 × 35 м',
    photos: [P2, P1],
    amenities: [
      AMENITIES.locker,
      AMENITIES.shower,
      AMENITIES.parking,
      AMENITIES.lighting,
      AMENITIES.gear,
    ],
    description:
      'Просторное поле для формата 7×7 с трибунами и полноразмерными воротами. Подходит для турниров и корпоративных матчей.',
  },
  {
    id: 'indoor-5',
    name: 'Крытое поле 5×5',
    type: '5x5',
    indoor: true,
    surface: 'Профессиональный паркет-мультиспорт',
    pricePerHour: 15000,
    capacity: 'до 10 игроков',
    sizeMeters: '38 × 18 м',
    photos: [P3, P2],
    amenities: [AMENITIES.locker, AMENITIES.shower, AMENITIES.lighting, AMENITIES.cafe],
    description:
      'Всепогодное крытое поле с климат-контролем — играйте вне зависимости от дождя и мороза.',
  },
  {
    id: 'premium-8',
    name: 'Поле 8×8 «Премиум»',
    type: '8x8',
    indoor: false,
    surface: 'Гибридный газон нового поколения',
    pricePerHour: 22000,
    capacity: 'до 16 игроков',
    sizeMeters: '60 × 40 м',
    photos: [P1, P2],
    amenities: [
      AMENITIES.locker,
      AMENITIES.shower,
      AMENITIES.parking,
      AMENITIES.lighting,
      AMENITIES.gear,
      AMENITIES.cafe,
    ],
    description:
      'Наше самое большое поле с премиальным покрытием и полной инфраструктурой для серьёзных матчей.',
  },
  {
    id: 'junior-5',
    name: 'Поле 5×5 «Юниор»',
    type: '5x5',
    indoor: false,
    surface: 'Искусственный газон 3G',
    pricePerHour: 10000,
    capacity: 'до 10 игроков',
    sizeMeters: '36 × 18 м',
    photos: [P2, P3],
    amenities: [AMENITIES.locker, AMENITIES.parking, AMENITIES.lighting],
    description:
      'Компактное поле для тренировок и детских команд. Доступная цена в дневное время.',
  },
  {
    id: 'night-7',
    name: 'Поле 7×7 «Ночное»',
    type: '7x7',
    indoor: false,
    surface: 'Искусственный газон 4G',
    pricePerHour: 16000,
    capacity: 'до 14 игроков',
    sizeMeters: '54 × 34 м',
    photos: [P3, P1],
    amenities: [AMENITIES.locker, AMENITIES.shower, AMENITIES.parking, AMENITIES.lighting],
    description:
      'Поле с усиленным освещением специально для поздних матчей. Открыто до 02:00.',
  },
]

// Детерминированный псевдо-хеш — доступность слотов стабильна между рендерами.
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function listFields(): Promise<Field[]> {
  return delay(FIELDS.slice())
}

export function getField(id: string): Promise<Field | undefined> {
  return delay(
    FIELDS.find((f) => f.id === id),
    300,
  )
}

const OPEN_HOUR = 8
const CLOSE_HOUR = 24 // последний старт в 23:00

const pad = (n: number) => String(n).padStart(2, '0')

/** Один детерминированный слот: доступность и цена стабильны между рендерами. */
function makeSlot(field: Field, date: string, hour: number, now: Date): Slot {
  const isPeak = hour >= 18
  const price = isPeak ? Math.round(field.pricePerHour * 1.2) : field.pricePerHour
  const booked = hash(`${field.id}|${date}|${hour}`) % 10 < 3 // ~30% занято
  const todayIso = toISO(now)
  const past = date < todayIso || (date === todayIso && hour <= now.getHours())
  const status: SlotStatus = past ? 'past' : booked ? 'booked' : 'available'
  return {
    id: `${field.id}__${date}__${hour}`,
    fieldId: field.id,
    date,
    start: `${pad(hour)}:00`,
    end: `${pad(hour + 1)}:00`,
    price,
    status,
  }
}

export interface WeekDay {
  iso: string
  label: { weekday: string; day: string; month: string }
}

export interface WeekSlots {
  days: WeekDay[]
  rows: { hour: number; label: string; cells: Slot[] }[]
}

/** 7 дат начиная с `startISO`. */
export function getWeekDays(startISO: string): WeekDay[] {
  const [y, m, d] = startISO.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(base)
    dd.setDate(base.getDate() + i)
    const iso = toISO(dd)
    return { iso, label: formatDayLabel(iso) }
  })
}

/**
 * Недельная сетка: строки — часы (вертикально), столбцы — 7 дней.
 * Идеально для расписания в модальном окне.
 */
export function getWeekSlots(
  fieldId: string,
  startISO: string,
  now: Date = new Date(),
): Promise<WeekSlots> {
  const field = FIELDS.find((f) => f.id === fieldId)
  if (!field) return delay({ days: [], rows: [] }, 300)

  const days = getWeekDays(startISO)
  const rows: WeekSlots['rows'] = []
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    rows.push({
      hour: h,
      label: `${pad(h)}:00`,
      cells: days.map((d) => makeSlot(field, d.iso, h, now)),
    })
  }
  return delay({ days, rows }, 350)
}

export interface BookingPayload extends BookingDraft {
  cardNumber: string
}

/** Слоты, сгруппированные по дате — для сводок и подтверждения. */
export interface DateGroup {
  date: string
  label: string
  slots: Slot[]
  subtotal: number
}

export function dayFullLabel(iso: string): string {
  const { day, month, weekday } = formatDayLabel(iso)
  return `${day} ${month}, ${weekday}`
}

export function groupSlotsByDate(slots: Slot[]): DateGroup[] {
  const sorted = [...slots].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  )
  const map = new Map<string, Slot[]>()
  for (const s of sorted) {
    if (!map.has(s.date)) map.set(s.date, [])
    map.get(s.date)!.push(s)
  }
  return [...map.entries()].map(([date, items]) => ({
    date,
    label: dayFullLabel(date),
    slots: items,
    subtotal: items.reduce((sum, s) => sum + s.price, 0),
  }))
}

/**
 * Симуляция оплаты + бронирования. Честная: карта, оканчивающаяся на «0000»,
 * имитирует отказ банка, остальные — успех. Готово к замене на реальный шлюз.
 * Принимает полные слоты — бронь может охватывать несколько дней недели.
 */
export function submitBooking(payload: BookingPayload): Promise<BookingConfirmation> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const digits = payload.cardNumber.replace(/\D/g, '')
      if (digits.endsWith('0000')) {
        reject(new Error('Платёж отклонён банком'))
        return
      }
      const field = FIELDS.find((f) => f.id === payload.fieldId)
      if (!field) {
        reject(new Error('Поле не найдено'))
        return
      }
      if (payload.slots.length === 0) {
        reject(new Error('Не выбраны слоты'))
        return
      }
      const slots = [...payload.slots].sort((a, b) =>
        a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
      )
      const total = slots.reduce((sum, s) => sum + s.price, 0)
      const ref =
        'DA-' +
        (hash(slots.map((s) => s.id).join('') + payload.phone) % 100000).toString().padStart(5, '0')
      resolve({ ref, field, slots, total, name: payload.name, phone: payload.phone })
    }, 900)
  })
}

// ── Утилиты форматирования ────────────────────────
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₸'
}

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MO = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function formatDayLabel(iso: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { weekday: WD[date.getDay()], day: String(d), month: MO[m - 1] }
}

export const FIELD_TYPE_LABEL: Record<string, string> = {
  '5x5': '5×5',
  '7x7': '7×7',
  '8x8': '8×8',
}

// ── Бронирования ──────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

// Backend booking states → the four statuses the admin table understands.
const STATE_TO_STATUS: Record<string, BookingStatus> = {
  awaiting_payment: 'pending',
  pending: 'pending',
  confirmed: 'confirmed',
  paid: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
}

// 'HH:mm:ss' → 'HH:mm' (the table only shows hours and minutes).
function trimSeconds(time: string): string {
  return time.slice(0, 5)
}

/** Adapt a raw GET /bookings row to the Booking shape the page renders. */
function mapBooking(api: BookingApi): Booking {
  return {
    id: String(api.id),
    ref: `BK-${api.id}`,
    customerName: api.customer_name,
    customerPhone: api.phone,
    fieldId: String(api.field),
    fieldName: `Поле №${api.field}`,
    date: api.date,
    start: trimSeconds(api.time_start),
    end: trimSeconds(api.time_end),
    total: Number(api.price_total),
    status: STATE_TO_STATUS[api.state] ?? 'pending',
    createdAt: api.created_at,
  }
}

/** GET /bookings — all bookings from the backend, newest first. */
export async function listBookings(): Promise<Booking[]> {
  const rows = await apiFetch<BookingApi[]>('/bookings')
  return rows.map(mapBooking).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const mondayIndex = (x.getDay() + 6) % 7 // Mon = 0 … Sun = 6
  x.setDate(x.getDate() - mondayIndex)
  return x
}

/** True if the booking's date falls within the given period relative to `now`. */
export function isBookingInPeriod(
  booking: Booking,
  period: BookingPeriod,
  now: Date = new Date(),
): boolean {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${booking.date}T00:00:00`)

  if (period === 'today') {
    return booking.date === toISO(today)
  }
  if (period === 'week') {
    const start = startOfWeek(today)
    const end = addDays(start, 6)
    return date >= start && date <= end
  }
  // month
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: 'Подтверждено',
  pending: 'Ожидает',
  completed: 'Завершено',
  cancelled: 'Отменено',
}
