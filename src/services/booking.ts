import type {
  Field,
  Slot,
  SlotStatus,
  BookingDraft,
  BookingConfirmation,
} from '@/types'

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

/**
 * Слоты на день. Доступность и цена детерминированы (hash),
 * прошедшие часы для сегодняшней даты помечаются как `past`.
 * `now` передаётся снаружи, чтобы не дёргать Date в слое данных при тестах.
 */
export function getSlots(fieldId: string, date: string, now: Date = new Date()): Promise<Slot[]> {
  const field = FIELDS.find((f) => f.id === fieldId)
  if (!field) return delay([], 300)

  const todayIso = toISO(now)
  const isToday = date === todayIso
  const currentHour = now.getHours()

  const slots: Slot[] = []
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    const isPeak = h >= 18
    const price = isPeak ? Math.round(field.pricePerHour * 1.2) : field.pricePerHour
    const booked = hash(`${fieldId}|${date}|${h}`) % 10 < 3 // ~30% занято
    const past = isToday && h <= currentHour

    const status: SlotStatus = past ? 'past' : booked ? 'booked' : 'available'
    slots.push({
      id: `${fieldId}-${date}-${h}`,
      fieldId,
      date,
      start: `${String(h).padStart(2, '0')}:00`,
      end: `${String(h + 1).padStart(2, '0')}:00`,
      price,
      status,
    })
  }
  return delay(slots, 350)
}

export interface BookingPayload extends BookingDraft {
  cardNumber: string
}

/**
 * Симуляция оплаты + бронирования. Честная: карта, оканчивающаяся на «0000»,
 * имитирует отказ банка, остальные — успех. Готово к замене на реальный шлюз.
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
      // Восстанавливаем выбранные слоты из детерминированного генератора.
      const hours = payload.slotIds
        .map((id) => Number(id.split('-').pop()))
        .filter((h) => !Number.isNaN(h))
        .sort((a, b) => a - b)
      const slots: Slot[] = hours.map((h) => {
        const isPeak = h >= 18
        return {
          id: `${payload.fieldId}-${payload.date}-${h}`,
          fieldId: payload.fieldId,
          date: payload.date,
          start: `${String(h).padStart(2, '0')}:00`,
          end: `${String(h + 1).padStart(2, '0')}:00`,
          price: isPeak ? Math.round(field.pricePerHour * 1.2) : field.pricePerHour,
          status: 'available',
        }
      })
      const total = slots.reduce((sum, s) => sum + s.price, 0)
      const ref = 'DA-' + (hash(payload.slotIds.join('') + payload.phone) % 100000).toString().padStart(5, '0')
      resolve({
        ref,
        field,
        date: payload.date,
        slots,
        total,
        name: payload.name,
        phone: payload.phone,
      })
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
