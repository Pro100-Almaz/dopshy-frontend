import type { DashboardSummary, Booking } from '@/types'
import {
  listBookings,
  getManagerFields,
  isBookingInPeriod,
} from '@/services/booking'
import { listStudents } from '@/services/academy'
import { hasPermission, permittedAcademySports } from './rbac'
import type { UserRole } from '@/types'

/** Часы, покрытые бронью (по времени начала/конца 'HH:mm'). */
function bookingHours(b: Booking): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  return Math.max(0, (toMin(b.end) - toMin(b.start)) / 60)
}

/** Бронь считается активной (не отменённой), если не в статусе cancelled/rejected. */
function isActive(b: Booking): boolean {
  return b.state !== 'cancelled' && b.state !== 'rejected'
}

/** Предоплата не внесена — сумма всех оплат 0. */
function isUnpaid(b: Booking): boolean {
  return b.paidTotal <= 0
}

export const dashboardService = {
  /** Реальные брони арены (GET /bookings). */
  async getBookings(): Promise<Booking[]> {
    return listBookings()
  },

  /** Сводка KPI: считается только из данных, которые отдаёт бэкенд. */
  async getSummary(bookings: Booking[], role?: UserRole | string): Promise<DashboardSummary> {
    const now = new Date()
    const active = bookings.filter(isActive)

    const todayBookings = active.filter((b) => isBookingInPeriod(b, 'today', now)).length

    // Загруженность за неделю: занятые часы / общий фонд часов (24 × 7 на каждое поле).
    let fieldCount = 1
    if (hasPermission(role, 'arena')) {
      try {
        const fields = await getManagerFields()
        fieldCount = Math.max(1, fields.length)
      } catch {
        fieldCount = 1
      }
    }
    const weekBookings = active.filter((b) => isBookingInPeriod(b, 'week', now))
    const bookedHours = weekBookings.reduce((sum, b) => sum + bookingHours(b), 0)
    const capacityHours = 24 * 7 * fieldCount
    const occupancyPercent = capacityHours
      ? Math.round((bookedHours / capacityHours) * 100)
      : 0

    const unpaidBookings = active.filter(isUnpaid).length
    // Ученики по всем направлениям академии: раньше считался только бокс,
    // из-за чего футбольная школа в KPI не попадала вообще.
    const studentCounts = hasPermission(role, 'academy')
      ? await Promise.all(
          permittedAcademySports(role).map(async (sport) => {
            try {
              return (await listStudents(sport, true)).length
            } catch {
              return 0
            }
          }),
        )
      : []

    return {
      todayBookings,
      occupancyPercent,
      unpaidBookings,
      activeStudents: studentCounts.reduce((sum, count) => sum + count, 0),
    }
  },
}
