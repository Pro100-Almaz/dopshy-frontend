<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div class="w-full max-w-md">
        <!-- Brand -->
        <div class="mb-10 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981] shadow-lg shadow-[#10B981]/20">
            <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
            </svg>
          </div>
          <span class="text-lg font-bold tracking-wide text-[#0F172A]">DOPSY ARENA</span>
        </div>

        <div v-if="!done">
          <h2 class="mb-2 text-2xl font-semibold text-[#0F172A]">Создайте новый пароль</h2>
          <p class="mb-8 text-sm leading-relaxed text-[#64748B]">
            Новый пароль должен содержать минимум 8 символов.
          </p>

          <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
            <AuthInput
              id="rp-password"
              :type="showPwd ? 'text' : 'password'"
              label="Новый пароль"
              placeholder="Введите новый пароль"
              v-model="password"
              :error="errors.password"
            >
              <template #icon><Lock :size="18" /></template>
              <template #right>
                <button type="button" @click="showPwd = !showPwd" class="text-[#94A3B8] transition-colors hover:text-[#64748B]">
                  <EyeOff v-if="!showPwd" :size="18" /><Eye v-else :size="18" />
                </button>
              </template>
            </AuthInput>

            <AuthInput
              id="rp-confirm"
              :type="showConfirm ? 'text' : 'password'"
              label="Подтвердите пароль"
              placeholder="Повторите новый пароль"
              v-model="confirm"
              :error="errors.confirm"
            >
              <template #icon><Lock :size="18" /></template>
              <template #right>
                <button type="button" @click="showConfirm = !showConfirm" class="text-[#94A3B8] transition-colors hover:text-[#64748B]">
                  <EyeOff v-if="!showConfirm" :size="18" /><Eye v-else :size="18" />
                </button>
              </template>
            </AuthInput>

            <button
              type="submit"
              :disabled="loading"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#10B981]/25 transition-all duration-200 hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 disabled:opacity-60"
            >
              <Loader2 v-if="loading" :size="16" class="animate-spin" />
              СБРОСИТЬ ПАРОЛЬ
            </button>
          </form>
        </div>

        <!-- Success -->
        <div v-else class="text-center">
          <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10">
            <CheckCircle :size="32" class="text-[#10B981]" />
          </div>
          <h2 class="mb-2 text-2xl font-semibold text-[#0F172A]">Пароль обновлён</h2>
          <p class="mb-8 text-sm text-[#64748B]">Ваш пароль успешно изменён.</p>
          <router-link
            to="/login"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#10B981] px-8 text-sm font-semibold text-white shadow-lg shadow-[#10B981]/25 transition-all hover:bg-[#059669]"
          >
            ВОЙТИ СЕЙЧАС
          </router-link>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import AuthInput from '@/components/auth/AuthInput.vue'
import { authService } from '@/services/auth'

const route = useRoute()
const password = ref('')
const confirm = ref('')
const showPwd = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const done = ref(false)
const errors = reactive({ password: '', confirm: '' })

async function handleSubmit() {
  errors.password = ''
  errors.confirm = ''
  if (!password.value) { errors.password = 'Введите пароль'; return }
  if (password.value.length < 8) { errors.password = 'Минимум 8 символов'; return }
  if (password.value !== confirm.value) { errors.confirm = 'Пароли не совпадают'; return }

  loading.value = true
  try {
    await authService.resetPassword((route.query.token as string) || '', password.value)
    done.value = true
  } catch (e: any) {
    errors.password = e.message
  } finally {
    loading.value = false
  }
}
</script>
