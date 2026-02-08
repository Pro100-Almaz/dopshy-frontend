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
