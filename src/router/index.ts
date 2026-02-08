import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
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
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: 'Панель управления' },
    },

    // ── Управление полями ──────────────────────
    {
      path: '/field-slots',
      name: 'FieldSlots',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Слоты полей' },
    },
    {
      path: '/bookings',
      name: 'Bookings',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Бронирования' },
    },

    // ── Академия ───────────────────────────────
    {
      path: '/students',
      name: 'Students',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Ученики' },
    },
    {
      path: '/lessons',
      name: 'Lessons',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Занятия' },
    },

    // ── Финансы и персонал ──────────────────────
    {
      path: '/payments',
      name: 'Payments',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Платежи' },
    },
    {
      path: '/workers',
      name: 'Workers',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Сотрудники' },
    },

    // ── Прочее ─────────────────────────────────
    {
      path: '/boxing',
      name: 'Boxing',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: { title: 'Бокс' },
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

  if (isPublic && token && to.path.startsWith('/login')) {
    return next('/')
  }

  next()
})

export default router
