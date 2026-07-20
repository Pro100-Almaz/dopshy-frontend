export type UserRole = 'super_admin' | 'manager' | 'coach' | 'accountant' | 'staff'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatar?: string
}

export interface DashboardSummary {
  todayBookings: number
  occupancyPercent: number
  unpaidBookings: number
  activeStudents: number
  onShiftWorkers: number
}

export interface ScheduleSlot {
  id: number
  field: string
  time: string
  type: 'booking' | 'lesson'
  title: string
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
}

export interface Payment {
  id: number
  client: string
  type: 'booking' | 'lesson' | 'membership'
  amount: number
  date: string
  status: 'paid' | 'pending' | 'overdue'
}

export interface Lesson {
  id: number
  title: string
  coach: string
  time: string
  students: number
  field: string
}

export interface Worker {
  id: number
  name: string
  role: string
  shift: string
  status: 'active' | 'break' | 'off'
}

// ── Публичное бронирование полей ──────────────────
export type FieldType = '5x5' | '6x6' | '7x7' | '8x8'

export type PricingType =
  | 'morning_day'
  | 'evening'
  | 'late_night'
  | 'after_midnight'
  | 'weekend_holiday'
export type PriceTable = Partial<Record<PricingType, number>>

export interface Field {
  id: string
  name: string
  type: FieldType
  indoor: boolean
  surface: string
  pricePerHour: number // базовая цена, ₸/час
  capacity: string
  sizeMeters: string
  photos: string[]
  amenities: string[]
  description: string
  pricing?: PriceTable
}

export type SlotStatus = 'available' | 'booked' | 'past'

// Режим повтора интервала (как в календаре): без повтора / ежедневно / еженедельно / ежемесячно.
export type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly'

/**
 * Правило повтора, привязанное к исходному интервалу выбора. Живёт в сторе и
 * переживает переключение недель — производные ячейки на будущих неделях
 * перерисовываются из него. `mode` здесь всегда ≠ 'none' (иначе правило удаляется).
 */
export interface RepeatRule {
  id: string // `${fieldId}|${date}|${start}|${end}` исходного интервала
  fieldId: string
  date: string // дата исходного интервала = дата старта повтора, 'yyyy-mm-dd'
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  mode: Exclude<RepeatMode, 'none'>
  until: string // 'yyyy-mm-dd' — включительно
}

/** Слитный интервал из смежных 30-мин слотов (то, что уходит на бэкенд). */
export interface SlotInterval {
  id: string // совпадает с RepeatRule.id для того же интервала
  fieldId: string
  date: string
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  price: number // сумма цен вошедших слотов
}

export interface SlotBooking {
  id: number
  customerName: string
  phone: string
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  total: number
  state: string
  notes?: string
}

export interface Slot {
  id: string
  fieldId: string
  date: string // ISO yyyy-mm-dd
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  price: number
  status: SlotStatus
  booking?: SlotBooking // присутствует, когда status === 'booked'
}

export interface BookingDraft {
  fieldId: string
  slots: Slot[]
  name: string
  phone: string
}

export interface BookingConfirmation {
  ref: string
  field: Field
  slots: Slot[]
  total: number
  name: string
  phone: string
}

export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled'

// Сырые статусы брони на бэкенде (значения enum) — используются при редактировании.
export type BookingState =
  | 'draft'
  | 'awaiting_payment'
  | 'confirmed'
  | 'cancelled'
  | 'unpaid'

export interface Booking {
  id: string
  ref: string // human-readable reference, e.g. 'BK-1042'
  customerName: string
  customerPhone: string
  fieldId: string
  fieldName: string
  fieldType?: FieldType // unknown for backend rows that only carry a numeric field id
  date: string // ISO yyyy-mm-dd
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  total: number // ₸
  status: BookingStatus
  state: string // сырой статус с бэкенда (для редактирования)
  createdAt: string // ISO datetime
  source?: string
  // Оплаты, ₸. С бэкенда приходят строками (см. BookingApi) — здесь уже числа.
  paidBot: number
  paidKaspiQr: number
  paidCash: number
  paidAvans: number
  paidTotal: number // сумма всех paid_* — вычисляется при маппинге
}

export type BookingPeriod = 'today' | 'week' | 'month' | 'all_time'

// ── Manager: GET /api/manager/fields/ → { ok, data: FieldsInfoApi } ──
export interface FieldApi {
  id: number
  name: string
  format: string // joins to FieldPriceApi.format_name, e.g. '5x5'
  capacity: number | string | null
  description: string | null
}

export interface FieldPriceApi {
  format_name: string
  pricing_type: string
  price_per_hour: number | string
}

export interface FieldsInfoApi {
  prices: FieldPriceApi[]
  fields: FieldApi[]
}

export interface BookingApi {
  id: number
  field: number
  customer_name: string
  phone: string
  time_start: string // 'HH:mm:ss'
  time_end: string // 'HH:mm:ss'
  price_total: string | null // decimal-строка, напр. "10000.00"
  state: string
  source: string
  notes: string | null
  date: string // ISO yyyy-mm-dd
  // Оплаты — decimal-строки ("0" / "10000.00"), могут быть null. Приводить через Number().
  paid_bot: string | null
  paid_kaspi_qr: string | null
  paid_cash: string | null
  paid_avans: string | null // предоплата / аванс
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
}

// ── Бот-ассистент: пауза для передачи диалога менеджеру ──────────────
// Почему пауза выставлена: вручную менеджером ('manual') или автоматически
// системой, когда менеджер ответил клиенту напрямую в WhatsApp ('auto').
export type PausedReason = 'manual' | 'auto' | null

// Полный статус (GET /bot-status/:phone, POST /batch).
export interface BotStatus {
  phone?: string
  paused: boolean
  paused_reason: PausedReason
}

// Ответ pause/resume — только флаг паузы, без причины.
export interface BotToggleResult {
  phone: string
  paused: boolean
}

// WhatsApp-контакт — главная сущность списка (GET /bot-status/contacts).
// Это любой, кто писал боту; может иметь или не иметь брони.
export interface Contact {
  phone: string // канонический id: международные цифры без «+»
  name: string // имя из броней; '' у контактов только-написавших → показываем телефон
  texted: boolean // писал боту в WhatsApp
  has_booking: boolean // есть хотя бы одна бронь
  paused: boolean // true = бот выключен для контакта
  paused_reason: PausedReason
  last_activity: string // ISO datetime; список приходит отсортированным (новые сверху)
}
