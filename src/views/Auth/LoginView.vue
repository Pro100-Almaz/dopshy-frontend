<template>
  <FullScreenLayout>
    <div class="min-h-screen grid lg:grid-cols-2">
      <!-- Left Panel — Hero -->
      <div class="relative hidden lg:flex flex-col overflow-hidden">
        <div
          class="absolute inset-0 bg-cover bg-center bg-[#0c1a12]"
          style="background-image: url('/images/auth/arena-login-bg.jpg')"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-b from-black/45 via-black/50 to-black/60"
        ></div>

        <div class="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-[#10B981] flex items-center justify-center shadow-lg shadow-[#10B981]/20"
            >
              <svg
                class="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                <path d="m2 17 10 5 10-5" />
                <path d="m2 12 10 5 10-5" />
              </svg>
            </div>
            <span class="text-white font-bold text-lg tracking-wide"
              >DOPSY ARENA</span
            >
          </div>

          <div class="mt-auto mb-20 xl:mb-28">
            <h1
              class="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5"
            >
              Управляйте<br />
              <span class="text-[#10B981]">Ареной</span> как профи.
            </h1>
            <p class="text-white/70 text-base leading-relaxed max-w-md mb-8">
              Единая платформа для управления футбольными полями, боксёрскими
              залами и спортивными объектами.
            </p>

            <div class="flex items-center gap-3">
              <div class="flex -space-x-2">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="w-8 h-8 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-sm"
                  :style="{
                    backgroundImage: `linear-gradient(135deg, hsl(${i * 70}, 40%, 55%) 0%, hsl(${i * 70 + 30}, 45%, 40%) 100%)`,
                  }"
                ></div>
              </div>
              <span class="text-white/50 text-sm"
                >Нам доверяют 50+ объектов по всей стране</span
              >
            </div>
          </div>

          <p class="text-white/30 text-xs">
            &copy; 2024 DOPSY ARENA &bull; Условия использования
          </p>
        </div>
      </div>

      <!-- Right Panel — Login form -->
      <div
        class="flex flex-col items-center justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white"
      >
        <div class="w-full max-w-md">
          <!-- Mobile brand -->
          <div class="flex items-center gap-3 mb-10 lg:hidden">
            <div
              class="w-9 h-9 rounded-lg bg-[#10B981] flex items-center justify-center"
            >
              <svg
                class="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                <path d="m2 17 10 5 10-5" />
                <path d="m2 12 10 5 10-5" />
              </svg>
            </div>
            <span class="text-[#0F172A] font-bold text-lg tracking-wide"
              >DOPSY ARENA</span
            >
          </div>

          <!-- Heading -->
          <div class="mb-8">
            <h2 class="text-2xl font-semibold text-[#0F172A] mb-2">
              С возвращением
            </h2>
            <p class="text-sm text-[#64748B] leading-relaxed">
              Введите данные для входа в панель управления
            </p>
          </div>

          <!-- Mock credentials hint -->
          <div
            class="mb-6 rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 px-4 py-3"
          >
            <p class="mb-1.5 text-xs font-semibold text-[#059669]">
              Демо-доступ
            </p>
            <div class="flex flex-col gap-1 text-sm text-[#0F172A]">
              <div class="flex items-center gap-2">
                <span class="text-[#64748B] text-xs w-14">Email:</span>
                <code
                  class="rounded bg-white px-1.5 py-0.5 text-xs font-medium"
                  >admin@dopsyarena.kz</code
                >
                <button
                  type="button"
                  @click="fillDemo"
                  class="ml-auto text-[10px] font-semibold text-[#10B981] hover:text-[#059669] transition-colors"
                >
                  Заполнить
                </button>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[#64748B] text-xs w-14">Пароль:</span>
                <code
                  class="rounded bg-white px-1.5 py-0.5 text-xs font-medium"
                  >demo123</code
                >
              </div>
            </div>
          </div>

          <!-- Role selector pills -->
          <AuthRoleTabs v-model="selectedRole" :roles="roles" class="mb-8" />

          <!-- Server error -->
          <div
            v-if="authStore.error"
            class="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {{ authStore.error }}
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
            <AuthInput
              id="login-email"
              label="Email или номер телефона"
              type="text"
              placeholder="admin@dopsyarena.kz"
              v-model="email"
              :error="errors.email"
            >
              <template #icon>
                <Mail :size="18" />
              </template>
            </AuthInput>

            <AuthInput
              id="login-password"
              :type="showPassword ? 'text' : 'password'"
              label="Пароль"
              placeholder="Введите пароль"
              v-model="password"
              :error="errors.password"
            >
              <template #icon>
                <Lock :size="18" />
              </template>
              <template #label-right>
                <router-link
                  to="/forgot-password"
                  class="text-xs text-[#10B981] hover:text-[#059669] font-medium transition-colors focus:outline-none focus:underline"
                >
                  Забыли пароль?
                </router-link>
              </template>
              <template #right>
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="text-[#94A3B8] hover:text-[#64748B] transition-colors focus:outline-none"
                  :aria-label="
                    showPassword ? 'Скрыть пароль' : 'Показать пароль'
                  "
                >
                  <EyeOff v-if="!showPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </template>
            </AuthInput>

            <!-- Stay logged in -->
            <label
              class="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div class="relative flex items-center">
                <input
                  v-model="stayLoggedIn"
                  type="checkbox"
                  class="sr-only peer"
                />
                <div
                  class="w-5 h-5 rounded-md border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] peer-checked:bg-[#10B981] peer-checked:border-[#10B981] peer-focus-visible:ring-2 peer-focus-visible:ring-[#10B981]/30 flex items-center justify-center transition-all duration-150"
                >
                  <svg
                    v-show="stayLoggedIn"
                    class="w-3 h-3 text-white"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <span
                class="text-sm text-[#64748B] group-hover:text-[#475569] transition-colors"
                >Оставаться в системе 30 дней</span
              >
            </label>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="authStore.loading"
              class="w-full h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] active:bg-[#047857] text-white font-semibold text-sm tracking-wide shadow-lg shadow-[#10B981]/25 hover:shadow-[#059669]/30 transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 disabled:opacity-60"
            >
              <Loader2
                v-if="authStore.loading"
                :size="16"
                class="animate-spin"
              />
              ВОЙТИ В ПАНЕЛЬ
              <svg
                v-if="!authStore.loading"
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </form>

          <!-- Help text -->
          <p class="text-center text-sm text-[#94A3B8] mt-8">
            Проблемы со входом?
            <button
              type="button"
              class="text-[#10B981] hover:text-[#059669] font-medium transition-colors focus:outline-none focus:underline"
            >
              Техническая поддержка
            </button>
          </p>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import AuthRoleTabs from '@/components/auth/AuthRoleTabs.vue'
import AuthInput from '@/components/auth/AuthInput.vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const roles = [
  { label: 'СУПЕР АДМИН', value: 'super_admin' },
  { label: 'МЕНЕДЖЕР', value: 'manager' },
  { label: 'ТРЕНЕР', value: 'coach' },
]

const selectedRole = ref('super_admin')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const stayLoggedIn = ref(false)

const errors = reactive({ email: '', password: '' })

function fillDemo() {
  email.value = 'admin@dopsyarena.kz'
  password.value = 'demo123'
}

function validate(): boolean {
  let valid = true
  errors.email = ''
  errors.password = ''

  if (!email.value.trim()) {
    errors.email = 'Введите email или номер телефона'
    valid = false
  }
  if (!password.value) {
    errors.password = 'Введите пароль'
    valid = false
  }
  return valid
}

async function handleSubmit() {
  if (!validate()) return
  try {
    await authStore.login({
      email: email.value,
      password: password.value,
      role: selectedRole.value as UserRole,
      remember: stayLoggedIn.value,
    })
    router.push('/')
  } catch {
    // error is already set in store
  }
}
</script>
