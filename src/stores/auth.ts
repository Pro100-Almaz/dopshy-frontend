import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole } from '@/types'
import { authService } from '@/services/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(
    localStorage.getItem('dopsy_token') || sessionStorage.getItem('dopsy_token'),
  )
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value)

  // Restore user from storage on init
  const stored = localStorage.getItem('dopsy_user') || sessionStorage.getItem('dopsy_user')
  if (stored && token.value) {
    try {
      user.value = JSON.parse(stored)
    } catch {
      /* ignore */
    }
  }

  async function login(credentials: {
    email: string
    password: string
    role: UserRole
    remember: boolean
  }) {
    loading.value = true
    error.value = ''
    try {
      const res = await authService.login(credentials)
      user.value = res.user
      token.value = res.token

      const storage = credentials.remember ? localStorage : sessionStorage
      storage.setItem('dopsy_token', res.token)
      storage.setItem('dopsy_user', JSON.stringify(res.user))
    } catch (e: any) {
      error.value = e.message || 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('dopsy_token')
    localStorage.removeItem('dopsy_user')
    sessionStorage.removeItem('dopsy_token')
    sessionStorage.removeItem('dopsy_user')
    router.push('/login')
  }

  return { user, token, isAuthenticated, loading, error, login, logout }
})
