import { createRouter, createWebHistory } from 'vue-router'

import { isSportKey, type SportKey } from '@/services/academy'
import {
  canAccessSport,
  defaultPathForRole,
  fixedSportForRole,
  hasPermission,
  roleOf,
} from '@/services/rbac'
import type { User } from '@/types'

/** Направления академии: маршруты для обоих собираются из одного описания. */
const ACADEMY_SPORTS: { key: SportKey; name: string; label: string }[] = [
  { key: 'football', name: 'Football', label: 'Футбол' },
  { key: 'boxing', name: 'Boxing', label: 'Бокс' },
]

/**
 * Последнее выбранное направление (его же пишет стор академии). Старые адреса
 * без вида спорта ведут туда, где менеджер работал в прошлый раз.
 */
function storedRole(): string {
  const stored = localStorage.getItem('dopsy_user') || sessionStorage.getItem('dopsy_user')
  if (!stored) return 'client'
  try {
    return roleOf((JSON.parse(stored) as Partial<User>).role)
  } catch {
    return 'client'
  }
}

function lastSport(): SportKey {
  const fixedSport = fixedSportForRole(storedRole())
  if (fixedSport) return fixedSport

  try {
    const stored = localStorage.getItem('dopsy_academy_sport')
    if (isSportKey(stored)) return stored
  } catch {
    /* хранилище недоступно — остаётся футбол */
  }
  return 'football'
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    // ── Лендинг (публичный) ────────────────────
    {
      path: '/',
      name: 'Landing',
      component: () => import('../views/Landing/landing.vue'),
      meta: { title: 'Dopsy Arena', public: true },
    },

    // ── Публичное бронирование ─────────────────
    {
      path: '/booking',
      name: 'Booking',
      component: () => import('../views/Booking/FieldsList.vue'),
      meta: { title: 'Бронирование полей', public: true },
    },
    {
      path: '/booking/checkout',
      name: 'BookingCheckout',
      component: () => import('../views/Booking/Checkout.vue'),
      meta: { title: 'Оформление брони', public: true },
    },
    {
      path: '/booking/:fieldId',
      name: 'BookingField',
      component: () => import('../views/Booking/FieldDetail.vue'),
      meta: { title: 'Выбор времени', public: true },
    },

    // ── Авторизация (публичные) ────────────────
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Auth/LoginView.vue'),
      meta: { title: 'Вход', public: true },
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('../views/Auth/ForgotPassword.vue'),
      meta: { title: 'Забыли пароль', public: true },
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('../views/Auth/ResetPassword.vue'),
      meta: { title: 'Сброс пароля', public: true },
    },

    // ── Панель управления ──────────────────────
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: 'Панель управления' },
    },

    // ── Управление полями ──────────────────────
    {
      path: '/field-slots',
      name: 'FieldSlots',
      component: () => import('../views/Pages/BookingSchedules.vue'),
      meta: { title: 'Слоты полей' },
    },
    {
      path: '/bookings',
      name: 'Bookings',
      component: () => import('../views/Pages/BookingPage.vue'),
      meta: { title: 'Бронирования' },
    },
    {
      path: '/history',
      name: 'History',
      component: () => import('../views/Pages/HistoryPage.vue'),
      meta: { title: 'История действий' },
    },
    {
      path: '/customers',
      name: 'Customers',
      component: () => import('../views/Pages/CustomersPage.vue'),
      meta: { title: 'Клиентская база' },
    },

    // ── Академия (футбол и бокс — один набор страниц) ──
    // Вид спорта — параметр маршрута: одни и те же компоненты обслуживают
    // оба направления (ТЗ §6.2 — одна кодовая база, SPORT_TYPE переменной).
    ...ACADEMY_SPORTS.flatMap((sport) => [
      {
        path: `/${sport.key}`,
        name: `${sport.name}Overview`,
        component: () => import('../views/Academy/AcademyOverview.vue'),
        props: { sport: sport.key },
        meta: { title: `${sport.label}: сводка` },
      },
      {
        path: `/${sport.key}/groups`,
        name: `${sport.name}Groups`,
        component: () => import('../views/Academy/AcademySchedulePage.vue'),
        props: { sport: sport.key },
        meta: { title: `${sport.label}: расписание` },
      },
      {
        path: `/${sport.key}/trials`,
        name: `${sport.name}Trials`,
        component: () => import('../views/Academy/AcademyTrialsPage.vue'),
        props: { sport: sport.key },
        meta: { title: `${sport.label}: пробные` },
      },
      {
        path: `/${sport.key}/students`,
        name: `${sport.name}Students`,
        component: () => import('../views/Academy/AcademyStudentsPage.vue'),
        props: { sport: sport.key },
        meta: { title: `${sport.label}: ученики` },
      },
      {
        path: `/${sport.key}/payments`,
        name: `${sport.name}Payments`,
        component: () => import('../views/Academy/AcademyPaymentsPage.vue'),
        props: { sport: sport.key },
        meta: { title: `${sport.label}: платежи` },
      },
      {
        path: `/${sport.key}/bot-content`,
        name: `${sport.name}BotContent`,
        component: () => import('../views/Academy/BotContentPage.vue'),
        props: { sport: sport.key },
        meta: { title: `${sport.label}: контент бота` },
      },
    ]),

    // Старые адреса — уводим на текущее направление, чтобы не ломать закладки.
    {
      path: '/students',
      name: 'Students',
      redirect: () => `/${lastSport()}/students`,
      meta: { title: 'Ученики' },
    },
    {
      path: '/lessons',
      name: 'Lessons',
      redirect: () => `/${lastSport()}/groups`,
      meta: { title: 'Занятия' },
    },
    {
      path: '/payments',
      name: 'Payments',
      redirect: () => `/${lastSport()}/payments`,
      meta: { title: 'Платежи' },
    },

    // ── Персонал и прочее ───────────────────────────
    {
      path: '/workers',
      name: 'Workers',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Сотрудники' },
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Отчёты' },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Настройки' },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: { title: 'Профиль' },
    },

    // ── Публичные страницы ─────────────────────
    {
      path: '/data-deletion',
      name: 'DataDeletion',
      component: () => import('../views/Landing/DataDeletion.vue'),
      meta: { title: 'Удаление данных', public: true },
    },

    // ── Не найдено ─────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: { title: '404', public: true },
    },
  ],
})

// ── Защита маршрутов ─────────────────────────────
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || 'Страница'} | DOPSY ARENA`

  const token =
    localStorage.getItem('dopsy_token') || sessionStorage.getItem('dopsy_token')
  const isPublic = to.meta.public === true

  if (!isPublic && !token) {
    return next('/login')
  }

  // Redirect authenticated users away from login to the dashboard
  if (isPublic && token && to.path === '/login') {
    return next(defaultPathForRole(storedRole()))
  }

  if (!isPublic) {
    const role = storedRole()
    const path = to.path

    if (role === 'client') return next('/')

    if (path === '/field-slots' || path === '/bookings' || path === '/customers') {
      if (!hasPermission(role, 'arena')) return next(defaultPathForRole(role))
    }

    if (path === '/history') {
      if (!hasPermission(role, 'history')) return next(defaultPathForRole(role))
    }

    if (path === '/workers') {
      if (!hasPermission(role, 'workers')) return next(defaultPathForRole(role))
    }

    if (path === '/reports') {
      if (!hasPermission(role, 'reports')) return next(defaultPathForRole(role))
    }

    if (path === '/settings') {
      if (!hasPermission(role, 'settings')) return next(defaultPathForRole(role))
    }

    const [, sport, academyPage = 'overview'] = path.match(/^\/(football|boxing)(?:\/([^/]+))?/) ?? []
    if (isSportKey(sport)) {
      if (!canAccessSport(role, sport)) {
        return next(defaultPathForRole(role))
      }

      if (academyPage === 'payments' && !hasPermission(role, 'academyPayments')) {
        return next(`/${sport}`)
      }

      if (academyPage === 'bot-content' && !hasPermission(role, 'botContent')) {
        return next(`/${sport}`)
      }
    }
  }

  next()
})

export default router
