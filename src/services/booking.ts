import type {
  Field,
  FieldType,
  Slot,
  SlotStatus,
  BookingDraft,
  BookingConfirmation,
  Booking,
  BookingApi,
  BookingDetailApi,
  BookingState,
  BookingPeriod,
  FieldApi,
  FieldPriceApi,
  FieldsInfoApi,
  PriceTable,
  PricingType,
  SlotBooking,
  RepeatMode,
  RepeatRule,
  SlotInterval,
} from '@/types'
import { apiFetch, mediaUrl } from './api'

// ── Геолокация арены (для карты / маршрута) ─────────
export const ARENA = {
  address: 'Астана, ул. Сығанақ 6ф',
  lat: 51.13079357137367,
  lng:  71.36958624774051
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

const MEDIA_PHOTOS = ['img.png', 'img_2.png', 'img_3.png', 'img_4.png'].map(mediaUrl)

function mediaPhotosFor(id: string): string[] {
  const i = hash(id) % MEDIA_PHOTOS.length
  const j = (i + 1) % MEDIA_PHOTOS.length
  return [MEDIA_PHOTOS[i], MEDIA_PHOTOS[j]]
}

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
    name: 'Поле 5×5 (First)»',
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
    name: 'Поле 6×6',
    type: '6x6',
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
      'Просторное поле для формата 6×6 с трибунами и полноразмерными воротами. Подходит для турниров и корпоративных матчей.',
  },
  {
    id: 'indoor-5',
    name: 'Поле 5×5 (Second)',
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

// ── Реальные поля из бэкенда: GET /api/fields ───────────────────────
function toPriceTable(rows: FieldPriceApi[]): PriceTable {
  const table: PriceTable = {}
  for (const r of rows) {
    table[r.pricing_type as PricingType] = Number(r.price_per_hour)
  }
  return table
}

function mapManagerField(api: FieldApi, priceRows: FieldPriceApi[]): Field {
  const pricing = toPriceTable(priceRows)
  return {
    id: String(api.id),
    name: api.name,
    type: api.format as FieldType,
    indoor: false,
    surface: '',
    pricePerHour: pricing.morning_day ?? 0,
    capacity: api.capacity == null ? '' : String(api.capacity),
    sizeMeters: '',
    photos: mediaPhotosFor(String(api.id)),
    amenities: [],
    description: api.description ?? '',
    pricing,
  }
}

/** Поля + прайс из панели менеджера, сведённые в тип `Field`. */
export async function getManagerFields(): Promise<Field[]> {
  const { fields, prices } = await apiFetch<FieldsInfoApi>('/fields')

  const byFormat = new Map<string, FieldPriceApi[]>()
  for (const p of prices) {
    const arr = byFormat.get(p.format_name) ?? []
    arr.push(p)
    byFormat.set(p.format_name, arr)
  }

  return fields.map((f) => mapManagerField(f, byFormat.get(f.format) ?? []))
}

export async function getManagerField(id: string): Promise<Field | undefined> {
  const fields = await getManagerFields()
  return fields.find((f) => f.id === id)
}

export function getField(id: string): Promise<Field | undefined> {
  return delay(
    FIELDS.find((f) => f.id === id),
    300,
  )
}

const OPEN_HOUR = 0
const CLOSE_HOUR = 24
const SLOT_MINUTES = 30 // шаг сетки — получасовые слоты
const DAY_MINUTES = CLOSE_HOUR * 60 // 1440

const pad = (n: number) => String(n).padStart(2, '0')

/** 'HH:mm' из минут от полуночи. Полночь конца суток (1440) → «24:00». */
function minToTime(min: number): string {
  if (min >= DAY_MINUTES) return '24:00'
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

/** Конец слота для показа: «23:59» (как хранит бэкенд) → «24:00». */
function toDisplayEnd(time: string): string {
  return time === '23:59' ? '24:00' : time
}

/** Тарифное окно для часа (будни). Выходные/праздники обрабатываются отдельно. */
function pricingTypeForHour(hour: number): PricingType {
  if (hour < 7) return 'after_midnight'
  if (hour < 19) return 'morning_day'
  if (hour < 22) return 'evening'
  return 'late_night'
}

// TODO: праздники приходят с бэкенда — пока учитываем только сб/вс.
function isWeekend(dateISO: string): boolean {
  const [y, m, d] = dateISO.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 || day === 6
}

function resolvePrice(pricing: PriceTable, dateISO: string, hour: number): number {
  if (isWeekend(dateISO) && pricing.weekend_holiday != null) return pricing.weekend_holiday
  const type = pricingTypeForHour(hour)
  return pricing[type] ?? pricing.morning_day ?? 0
}

function makeSlot(field: Field, date: string, startMin: number, now: Date): Slot {
  const hour = Math.floor(startMin / 60)
  const perHour = field.pricing
    ? resolvePrice(field.pricing, date, hour)
    : hour >= 18
      ? Math.round(field.pricePerHour * 1.2)
      : field.pricePerHour
  // Цена слота пропорциональна его длительности (прайс задан за час).
  const price = Math.round((perHour * SLOT_MINUTES) / 60)
  const booked = field.pricing ? false : hash(`${field.id}|${date}|${startMin}`) % 10 < 3
  const todayIso = toISO(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const past = date < todayIso || (date === todayIso && startMin < nowMin)
  const status: SlotStatus = past ? 'past' : booked ? 'booked' : 'available'
  return {
    id: `${field.id}__${date}__${startMin}`,
    fieldId: field.id,
    date,
    start: minToTime(startMin),
    end: minToTime(startMin + SLOT_MINUTES),
    price,
    status,
  }
}

export function getSlots(fieldId: string, date: string, now: Date = new Date()): Promise<Slot[]> {
  const field = FIELDS.find((f) => f.id === fieldId)
  if (!field) return delay([], 300)

  const slots: Slot[] = []
  for (let m = OPEN_HOUR * 60; m < DAY_MINUTES; m += SLOT_MINUTES) {
    slots.push(makeSlot(field, date, m, now))
  }
  return delay(slots, 350)
}

export interface WeekDay {
  iso: string
  label: { weekday: string; day: string; month: string }
}

export interface WeekSlots {
  days: WeekDay[]
  rows: { startMin: number; label: string; cells: Slot[] }[]
}

/** `dayCount` дат начиная с `startISO` (по умолчанию 7 — полная неделя). */
export function getWeekDays(startISO: string, dayCount = 7): WeekDay[] {
  const [y, m, d] = startISO.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  return Array.from({ length: dayCount }, (_, i) => {
    const dd = new Date(base)
    dd.setDate(base.getDate() + i)
    const iso = toISO(dd)
    return { iso, label: formatDayLabel(iso) }
  })
}

/**
 * Недельная сетка: строки — часы (вертикально), столбцы — дни (`dayCount`).
 * По умолчанию 7 (десктоп); на мобильных передаём 4, чтобы сетка влезала в экран.
 */
export function getWeekSlots(
  field: string | Field,
  startISO: string,
  now: Date = new Date(),
  dayCount = 7,
): Promise<WeekSlots> {
  // Строка → мок-поле (публичный флоу); объект Field → реальные данные бэкенда.
  const f = typeof field === 'string' ? FIELDS.find((x) => x.id === field) : field
  if (!f) return delay({ days: [], rows: [] }, 300)

  const days = getWeekDays(startISO, dayCount)
  const rows: WeekSlots['rows'] = []
  for (let m = OPEN_HOUR * 60; m < DAY_MINUTES; m += SLOT_MINUTES) {
    rows.push({
      startMin: m,
      label: minToTime(m),
      cells: days.map((d) => makeSlot(f, d.iso, m, now)),
    })
  }
  return delay({ days, rows }, 350)
}

// ── Реальные брони: GET /api/bookings/range/{from}/{to}?field=&page= ──
// `field` и `page` — необязательные query-параметры. Страница полей (field-slots)
// всегда передаёт конкретное поле и грузит всю неделю без пагинации.
export function getBookingsInRange(
  fieldId: string,
  dateFrom: string,
  dateTo: string,
): Promise<BookingApi[]> {
  return apiFetch<BookingApi[]>(`/bookings/range/${dateFrom}/${dateTo}?field=${fieldId}`)
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

function toSlotBooking(api: BookingApi): SlotBooking {
  return {
    id: api.id,
    customerName: api.customer_name,
    phone: api.phone,
    start: trimSeconds(api.time_start),
    end: toDisplayEnd(trimSeconds(api.time_end)),
    total: toMoney(api.price_total),
    state: api.state,
    notes: api.notes ?? undefined,
  }
}

const BLOCKING = (state: string) => state !== 'cancelled'

/** Помечает ячейки сетки занятыми по пересечению [time_start, time_end) со слотом. */
function overlayBookings(week: WeekSlots, bookings: BookingApi[]): WeekSlots {
  const active = bookings.filter((b) => BLOCKING(b.state))
  for (const row of week.rows) {
    for (const cell of row.cells) {
      if (cell.status === 'past') continue
      const cellStart = toMinutes(cell.start)
      const cellEnd = toMinutes(cell.end)
      const hit = active.find(
        (b) =>
          b.date === cell.date &&
          toMinutes(b.time_start) < cellEnd &&
          toMinutes(b.time_end) > cellStart,
      )
      if (hit) {
        cell.status = 'booked'
        cell.booking = toSlotBooking(hit)
      }
    }
  }
  return week
}

/** Недельная сетка реального поля: цены из прайса + занятость из броней. */
export async function getManagerWeek(
  field: Field,
  startISO: string,
  now: Date = new Date(),
  dayCount = 7,
): Promise<WeekSlots> {
  const week = await getWeekSlots(field, startISO, now, dayCount)
  const days = week.days
  if (!days.length) return week
  try {
    const week_bookings = await getBookingsInRange(field.id, days[0].iso, days[days.length - 1].iso)
    const allowed_states = (BOOKING_STATE_ENUMS.CONFIRMED, BOOKING_STATE_ENUMS.AWAITING_PAYMENT)
    const bookings = week_bookings.filter((booking) => (allowed_states.includes(booking.state)))
    return overlayBookings(week, bookings)
  } catch {
    // Занятость недоступна (напр. публичный клиент без авторизации) — показываем
    // хотя бы реальные цены, без наложения броней.
    return week
  }
}

export interface BookingPayload extends BookingDraft {
  cardNumber: string
}

// ── Пакетное создание броней: POST /api/bookings/batch ──────────────
export interface BatchSlotIn {
  field: number
  date: string // 'yyyy-mm-dd' — дата первого вхождения (старт повтора)
  time_start: string // 'HH:mm'
  time_end: string // 'HH:mm'
  // Ручная цена брони (менеджер переопределяет расчётную). Опущено → бэкенд считает сам.
  price_total?: number
  // Повтор интервала. Бэкенд разворачивает вхождения сам (daily/weekly/monthly).
  repeat_mode?: RepeatMode // по умолчанию 'none'
  repeat_until?: string // 'yyyy-mm-dd', обязателен при repeat_mode !== 'none'
}

export interface BookingBatchPayload {
  slots: BatchSlotIn[]
  customer?: string
  phone?: string
  notes?: string
  price_total?: number
  prepayment?: number
  reserved_until?: number
  updated_by?: string
}

/**
 * TTL брони, минут. Черновик создаётся со статусом «ожидает оплаты»; если оплата
 * не пройдена за это время, бэкенд автоматически отменяет бронь. Пока платёжной
 * логики нет — TTL держит слот занятым ограниченное время и затем освобождает.
 */
export const RESERVATION_TTL_MINUTES = 20

/** Создаёт черновики броней пакетом. Пустые поля не отправляем — бэкенд подставит дефолты. */
export function createBookingsBatch(payload: BookingBatchPayload): Promise<unknown> {
  return apiFetch('/bookings/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ── Слитные интервалы и повтор ──────────────────────────────────────

/**
 * Список ISO-дат вхождений повтора от `startISO` до `untilISO` включительно.
 * `daily` — каждый день, `weekly` — раз в 7 дней (тот же день недели),
 * `monthly` — то же число месяца (короткие месяцы без нужного числа пропускаются),
 * `none` — единственная дата старта. Ограничено GUARD от зацикливания.
 */
export function computeOccurrences(
  startISO: string,
  untilISO: string,
  mode: RepeatMode,
): string[] {
  if (mode === 'none') return [startISO]
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const [uy, um, ud] = untilISO.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const until = new Date(uy, um - 1, ud)
  if (Number.isNaN(start.getTime()) || Number.isNaN(until.getTime()) || until < start) {
    return [startISO]
  }
  const out: string[] = []
  const GUARD = 1000

  if (mode === 'monthly') {
    for (let i = 0; i < GUARD; i++) {
      const firstOfMonth = new Date(sy, sm - 1 + i, 1)
      if (firstOfMonth > until) break
      const d = new Date(sy, sm - 1 + i, sd)
      if (d.getDate() !== sd) continue // в этом месяце нет такого числа
      if (d > until) continue
      out.push(toISO(d))
    }
    return out
  }

  const step = mode === 'weekly' ? 7 : 1
  const d = new Date(start)
  for (let i = 0; i < GUARD && d <= until; i++) {
    out.push(toISO(d))
    d.setDate(d.getDate() + step)
  }
  return out
}

/**
 * Сливает смежные 30-мин слоты одного поля/даты в интервалы. Разрывает слияние
 * на границах из `cutSet` (минуты от полуночи) — так «залоченные» повтором
 * интервалы остаются отдельными и не поглощают соседние слоты.
 */
export function mergeContiguousSlots(
  slots: Slot[],
  cutSet: Set<number> = new Set(),
): SlotInterval[] {
  const byKey = new Map<string, Slot[]>()
  for (const s of slots) {
    const k = `${s.fieldId}|${s.date}`
    const arr = byKey.get(k) ?? []
    arr.push(s)
    byKey.set(k, arr)
  }

  const out: SlotInterval[] = []
  for (const group of byKey.values()) {
    const sorted = [...group].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    let cur:
      | { fieldId: string; date: string; start: string; end: string; price: number; endMin: number }
      | null = null

    const flush = () => {
      if (!cur) return
      out.push({
        id: `${cur.fieldId}|${cur.date}|${cur.start}|${cur.end}`,
        fieldId: cur.fieldId,
        date: cur.date,
        start: cur.start,
        end: cur.end,
        price: cur.price,
      })
      cur = null
    }

    for (const s of sorted) {
      const sMin = toMinutes(s.start)
      const eMin = toMinutes(s.end)
      // Пропускаем случайные дубли одной ячейки.
      if (cur && sMin < cur.endMin) continue
      const contiguous = cur && cur.endMin === sMin && !cutSet.has(sMin)
      if (contiguous && cur) {
        cur.end = s.end
        cur.endMin = eMin
        cur.price += s.price
      } else {
        flush()
        cur = {
          fieldId: s.fieldId,
          date: s.date,
          start: s.start,
          end: s.end,
          price: s.price,
          endMin: eMin,
        }
      }
    }
    flush()
  }
  return out
}

export interface RepeatConflict {
  date: string
  booking: SlotBooking
}

/**
 * Проверяет интервал правила против уже существующих броней на всех датах повтора.
 * Возвращает конкретные даты-пересечения (для предупреждения менеджеру). Переиспользует
 * тот же тест пересечения, что и `overlayBookings`.
 */
export async function findRepeatConflicts(
  fieldId: string,
  rule: RepeatRule,
): Promise<RepeatConflict[]> {
  const dates = computeOccurrences(rule.date, rule.until, rule.mode)
  if (!dates.length) return []
  const from = dates[0]
  const to = dates[dates.length - 1]

  let bookings: BookingApi[]
  try {
    bookings = await getBookingsInRange(fieldId, from, to)
  } catch {
    // Не удалось получить брони — не блокируем менеджера (бэкенд проверит при создании).
    return []
  }

  const dateSet = new Set(dates)
  const rs = toMinutes(rule.start)
  const re = toMinutes(rule.end)
  const conflicts: RepeatConflict[] = []
  for (const b of bookings) {
    if (!BLOCKING(b.state)) continue
    if (!dateSet.has(b.date)) continue
    if (toMinutes(b.time_start) < re && toMinutes(b.time_end) > rs) {
      conflicts.push({ date: b.date, booking: toSlotBooking(b) })
    }
  }
  conflicts.sort((a, b) => a.date.localeCompare(b.date))
  return conflicts
}

/**
 * Строит строки для `/bookings/batch` из слитных интервалов. К интервалу с правилом
 * повтора добавляет `repeat_mode`/`repeat_until`; вхождения не разворачивает — это делает бэкенд.
 */
export function buildBatchSlots(
  intervals: SlotInterval[],
  rules: RepeatRule[],
): BatchSlotIn[] {
  const ruleById = new Map(rules.map((r) => [r.id, r]))
  return intervals.map((iv) => {
    const rule = ruleById.get(iv.id)
    const row: BatchSlotIn = {
      field: Number(iv.fieldId),
      date: iv.date,
      time_start: iv.start,
      time_end: iv.end,
      repeat_mode: rule ? rule.mode : 'none',
    }
    if (rule) row.repeat_until = rule.until
    return row
  })
}

export const REPEAT_MODE_LABEL: Record<RepeatMode, string> = {
  none: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
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
  // Неразрывный пробел перед ₸ — сумма и знак валюты не переносятся на разные строки
  // на узких колонках (напр. таблица броней на 13" экранах).
  return new Intl.NumberFormat('ru-RU').format(value) + '\u00A0₸'
}

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MO = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function formatDayLabel(iso: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { weekday: WD[date.getDay()], day: String(d), month: MO[m - 1] }
}

/** ISO datetime → «13 июл 2026, 20:35» (пустая строка при некорректной дате). */
export function formatDateTime(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const day = date.getDate()
  const month = MO[date.getMonth()]
  const year = date.getFullYear()
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${day} ${month} ${year}, ${time}`
}

export const FIELD_TYPE_LABEL: Record<string, string> = {
  '5x5': '5×5',
  '6x6': '6×6',
}

// Bookingz
function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}


const HIDDEN_BOOKING_STATES: ReadonlySet<string> = new Set(['cancelled', 'rejected', 'unpaid'])

export function isVisibleBookingState(state: string): boolean {
  return !HIDDEN_BOOKING_STATES.has(state)
}

function trimSeconds(time: string): string {
  return time.slice(0, 5)
}

/** Денежные поля бэкенда — строки ("0" / "10000.00"), числа или null. Приводим к числу; мусор → 0. */
function toMoney(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapBooking(api: BookingApi): Booking {
  const paidBot = toMoney(api.paid_bot)
  const paidKaspiQr = toMoney(api.paid_kaspi_qr)
  const paidCash = toMoney(api.paid_cash)
  const paidAvans = toMoney(api.paid_avans)
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
    total: toMoney(api.price_total),
    state: api.state,
    createdAt: api.created_at,
    source: api.source,
    notes: api.notes ?? undefined,
    paidBot,
    paidKaspiQr,
    paidCash,
    paidAvans,
    paidTotal: paidBot + paidKaspiQr + paidCash + paidAvans,
  }
}

/**
 * Все брони через GET /bookings. `page` — необязательный номер страницы пагинатора
 * бэкенда (1..N); опущен → полный список (для сводок). `search` ищет по id, имени
 * клиента и телефону (обрабатывается бэкендом). null-элементы отбрасываем.
 */
export async function listBookings(page?: number, search?: string): Promise<Booking[]> {
  const qs = buildBookingQuery({ page, search })
  const rows = await apiFetch<(BookingApi | null)[]>(`/bookings${qs}`)
  return rows
    .filter((r): r is BookingApi => r != null)
    .map(mapBooking)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Собирает query-строку броней из page/search/field, опуская пустые параметры. */
function buildBookingQuery(params: {
  page?: number
  search?: string
  field?: string | number
}): string {
  const qs = new URLSearchParams()
  if (params.field != null && params.field !== '') qs.set('field', String(params.field))
  if (params.page != null) qs.set('page', String(params.page))
  const search = params.search?.trim()
  if (search) qs.set('search', search)
  const str = qs.toString()
  return str ? `?${str}` : ''
}

/** Брони одного поля в диапазоне дат (GET /bookings/range/{from}/{to}?field=). */
export async function listFieldBookingsInRange(
  fieldId: string,
  from: string,
  to: string,
): Promise<Booking[]> {
  const rows = await getBookingsInRange(fieldId, from, to)
  return rows.map(mapBooking)
}

/** Детальная карточка одной брони (GET /api/bookings/{id}). 404 → ApiError. */
export function getBookingDetail(id: string | number): Promise<BookingDetailApi> {
  return apiFetch<BookingDetailApi>(`/bookings/${id}`)
}

// ── Редактирование брони: PATCH /api/bookings/{id} ──────────────────
export interface BookingUpdatePayload {
  field_id?: number
  customer_name?: string
  time_start?: string // 'HH:mm' / 'HH:mm:ss'
  time_end?: string
  date?: string // 'yyyy-mm-dd'
  end_date?: string
  status?: BookingState
  notes?: string
  // Оплаты, ₸ — редактируются менеджером. Бэкенд ожидает числа.
  paid_kaspi_qr?: number
  paid_cash?: number
  paid_avans?: number
}

/** Приводит 'HH:mm' к 'HH:mm:ss' — бэкенд ожидает datetime.time. */
function withSeconds(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

/** Частичное обновление брони. Отправляем только заполненные поля. */
export function updateBooking(
  id: string | number,
  payload: BookingUpdatePayload,
): Promise<unknown> {
  const body: BookingUpdatePayload = { ...payload }
  if (body.time_start) body.time_start = withSeconds(body.time_start)
  if (body.time_end) body.time_end = withSeconds(body.time_end)
  return apiFetch(`/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const mondayIndex = (x.getDay() + 6) % 7 // Mon = 0 … Sun = 6
  x.setDate(x.getDate() - mondayIndex)
  return x
}

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
  if (period === 'month') {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
  }
  // all_time — все текущие брони, без фильтра по дате
  return true
}

/**
 * Диапазон дат для запроса range-эндпоинта по периоду. `all_time` → null
 * (полный список грузится через listBookings, без ограничения по датам).
 */
export function periodRange(
  period: BookingPeriod,
  now: Date = new Date(),
): { from: string; to: string } | null {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  if (period === 'today') {
    const iso = toISO(today)
    return { from: iso, to: iso }
  }
  if (period === 'week') {
    const start = startOfWeek(today)
    return { from: toISO(start), to: toISO(addDays(start, 6)) }
  }
  if (period === 'month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { from: toISO(first), to: toISO(last) }
  }
  return null // all_time
}

/**
 * Брони в диапазоне дат через GET /bookings/range (все поля, с пагинацией).
 * `page` — номер страницы пагинатора бэкенда (1..N); опущен → без пагинации.
 * `search` ищет по id, имени клиента и телефону (обрабатывается бэкендом).
 * Порядок бэкенда (date, time_start, field) сохраняется. null-элементы отбрасываем.
 */
export async function listBookingsInRange(
  dateFrom: string,
  dateTo: string,
  page?: number,
  search?: string,
): Promise<Booking[]> {
  const qs = buildBookingQuery({ page, search })
  const rows = await apiFetch<(BookingApi | null)[]>(`/bookings/range/${dateFrom}/${dateTo}${qs}`)
  return rows.filter((r): r is BookingApi => r != null).map(mapBooking)
}


export const BOOKING_STATE_ENUMS = {
  DRAFT: 'draft',
  AWAITING_PAYMENT: 'awaiting_payment',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  UNPAID: 'unpaid',
} as const satisfies Record<string, BookingState>


// Сырые статусы брони на бэкенде — порядок = порядок в выпадающем списке.
export const BOOKING_STATE_LABEL: Record<BookingState, string> = {
  [BOOKING_STATE_ENUMS.DRAFT]: 'Черновик',
  [BOOKING_STATE_ENUMS.AWAITING_PAYMENT]: 'Ожидает оплаты',
  [BOOKING_STATE_ENUMS.CONFIRMED]: 'Подтверждено',
  [BOOKING_STATE_ENUMS.CANCELLED]: 'Отменено',
  [BOOKING_STATE_ENUMS.UNPAID]: 'Не оплачено',
}


// Человекочитаемая подпись статуса брони по сырому state с бэкенда.
// Неизвестные значения возвращаем как есть, чтобы ничего не «терялось».
export function bookingStateLabel(state: string): string {
  return BOOKING_STATE_LABEL[state as BookingState] ?? state
}

// Цвет бейджа статуса брони по сырому state с бэкенда. «Ожидает оплаты»
// (awaiting_payment) — единственное состояние с предупреждающим цветом.
const BOOKING_STATE_CLASS: Record<string, string> = {
  [BOOKING_STATE_ENUMS.DRAFT] : 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  [BOOKING_STATE_ENUMS.AWAITING_PAYMENT] : 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  [BOOKING_STATE_ENUMS.CONFIRMED]: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  [BOOKING_STATE_ENUMS.CANCELLED]: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500',
  [BOOKING_STATE_ENUMS.UNPAID]: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500',
}

const BOOKING_STATE_CLASS_DEFAULT =
  'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'

export function bookingStateClass(state: string): string {
  return BOOKING_STATE_CLASS[state] ?? BOOKING_STATE_CLASS_DEFAULT
}
