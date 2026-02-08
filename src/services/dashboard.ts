import type { DashboardSummary, ScheduleSlot, Payment, Lesson, Worker } from '@/types'

async function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}

export const dashboardService = {
  /** GET /dashboard/summary */
  async getSummary(): Promise<DashboardSummary> {
    await delay()
    return {
      todayBookings: 12,
      occupancyPercent: 78,
      unpaidPayments: 345_000,
      activeStudents: 45,
      onShiftWorkers: 8,
    }
  },

  /** GET /bookings/today */
  async getTodayBookings(): Promise<ScheduleSlot[]> {
    await delay()
    return [
      {
        id: 1,
        field: 'Поле A',
        time: '09:00 – 10:00',
        type: 'booking',
        title: 'Команда Альфа — товарищеский матч',
        status: 'completed',
      },
      {
        id: 2,
        field: 'Поле A',
        time: '10:30 – 12:00',
        type: 'lesson',
        title: 'U-12 Основы (Тренер Арман)',
        status: 'in_progress',
      },
      {
        id: 3,
        field: 'Поле B',
        time: '11:00 – 12:00',
        type: 'booking',
        title: 'Корпоратив — TechCo',
        status: 'confirmed',
      },
      {
        id: 4,
        field: 'Поле A',
        time: '13:00 – 14:30',
        type: 'lesson',
        title: 'U-16 Тактика продвинутые',
        status: 'confirmed',
      },
      {
        id: 5,
        field: 'Поле B',
        time: '14:00 – 15:00',
        type: 'booking',
        title: 'Канат Б. — частная аренда',
        status: 'confirmed',
      },
      {
        id: 6,
        field: 'Поле A',
        time: '16:00 – 17:30',
        type: 'lesson',
        title: 'U-10 Начинающие (Тренер Марат)',
        status: 'confirmed',
      },
      {
        id: 7,
        field: 'Поле B',
        time: '18:00 – 19:00',
        type: 'booking',
        title: 'Вечерняя лига — Группа Б',
        status: 'confirmed',
      },
    ]
  },

  /** GET /payments/recent */
  async getRecentPayments(): Promise<Payment[]> {
    await delay()
    return [
      { id: 1, client: 'Канат Болатов', type: 'booking', amount: 15_000, date: '2024-12-15', status: 'paid' },
      { id: 2, client: 'Асель Каримова', type: 'lesson', amount: 8_000, date: '2024-12-15', status: 'paid' },
      { id: 3, client: 'ТОО «TechCo»', type: 'booking', amount: 45_000, date: '2024-12-14', status: 'pending' },
      { id: 4, client: 'Мурат Оспанов', type: 'membership', amount: 25_000, date: '2024-12-14', status: 'overdue' },
      { id: 5, client: 'Динара Жакупова', type: 'lesson', amount: 8_000, date: '2024-12-13', status: 'paid' },
      { id: 6, client: 'Команда Альфа', type: 'booking', amount: 20_000, date: '2024-12-13', status: 'paid' },
    ]
  },

  /** GET /lessons/upcoming */
  async getUpcomingLessons(): Promise<Lesson[]> {
    await delay()
    return [
      { id: 1, title: 'U-12 Основы', coach: 'Арман Т.', time: '14:00', students: 8, field: 'Поле A' },
      { id: 2, title: 'U-16 Тактика', coach: 'Марат К.', time: '15:30', students: 12, field: 'Поле B' },
      { id: 3, title: 'U-10 Начинающие', coach: 'Арман Т.', time: '16:30', students: 10, field: 'Поле A' },
      { id: 4, title: 'Вратарская подготовка', coach: 'Серік Б.', time: '17:00', students: 4, field: 'Поле B' },
    ]
  },

  /** GET /workers/on-shift */
  async getWorkersOnShift(): Promise<Worker[]> {
    await delay()
    return [
      { id: 1, name: 'Арман Тулегенов', role: 'Главный тренер', shift: '09:00 – 17:00', status: 'active' },
      { id: 2, name: 'Марат Кенесов', role: 'Тренер', shift: '10:00 – 18:00', status: 'active' },
      { id: 3, name: 'Серік Бауыржан', role: 'Тренер', shift: '12:00 – 20:00', status: 'active' },
      { id: 4, name: 'Айбек Тұрғын', role: 'Менеджер', shift: '08:00 – 16:00', status: 'active' },
      { id: 5, name: 'Нұрсұлтан Әбіл', role: 'Администратор', shift: '08:00 – 20:00', status: 'break' },
      { id: 6, name: 'Ерболат Дастан', role: 'Техник', shift: '07:00 – 15:00', status: 'active' },
      { id: 7, name: 'Данияр Аскар', role: 'Охрана', shift: '08:00 – 20:00', status: 'active' },
      { id: 8, name: 'Тимур Оразалин', role: 'Уборщик', shift: '06:00 – 14:00', status: 'active' },
    ]
  },
}
