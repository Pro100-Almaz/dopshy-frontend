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
  unpaidPayments: number
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
export type FieldType = '5x5' | '7x7' | '8x8'

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
}

export type SlotStatus = 'available' | 'booked' | 'past'

export interface Slot {
  id: string
  fieldId: string
  date: string // ISO yyyy-mm-dd
  start: string // 'HH:mm'
  end: string // 'HH:mm'
  price: number
  status: SlotStatus
}

export interface BookingDraft {
  fieldId: string
  date: string
  slotIds: string[]
  name: string
  phone: string
}

export interface BookingConfirmation {
  ref: string
  field: Field
  date: string
  slots: Slot[]
  total: number
  name: string
  phone: string
}
