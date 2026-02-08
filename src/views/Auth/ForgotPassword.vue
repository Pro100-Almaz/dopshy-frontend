<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <div class="w-full max-w-md">
        <!-- Brand -->
        <div class="mb-10 flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10B981] shadow-lg shadow-[#10B981]/20"
          >
            <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
            </svg>
          </div>
          <span class="text-lg font-bold tracking-wide text-[#0F172A]">DOPSY ARENA</span>
        </div>

        <router-link
          to="/login"
          class="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft :size="16" />
          Вернуться к входу
        </router-link>

        <div v-if="!sent">
          <h2 class="mb-2 text-2xl font-semibold text-[#0F172A]">Забыли пароль?</h2>
          <p class="mb-8 text-sm leading-relaxed text-[#64748B]">
            Введите email, привязанный к вашему аккаунту, и мы отправим ссылку для сброса пароля.
          </p>

          <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>
            <AuthInput
              id="fp-email"
              label="Email"
              type="email"
              placeholder="admin@dopsyarena.kz"
              v-model="email"
              :error="error"
            >
              <template #icon><Mail :size="18" /></template>
            </AuthInput>

            <button
              type="submit"
              :disabled="loading"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#10B981]/25 transition-all duration-200 hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 disabled:opacity-60"
            >
              <Loader2 v-if="loading" :size="16" class="animate-spin" />
              ОТПРАВИТЬ ССЫЛКУ
            </button>
          </form>
        </div>

        <!-- Success state -->
        <div v-else class="text-center">
          <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10">
            <CheckCircle :size="32" class="text-[#10B981]" />
          </div>
          <h2 class="mb-2 text-2xl font-semibold text-[#0F172A]">Проверьте почту</h2>
          <p class="mb-8 text-sm leading-relaxed text-[#64748B]">
            Мы отправили ссылку для сброса пароля на
            <strong class="text-[#0F172A]">{{ email }}</strong>
          </p>
          <router-link
            to="/login"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] px-8 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-gray-50"
          >
            Вернуться к входу
          </router-link>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import AuthInput from '@/components/auth/AuthInput.vue'
import { authService } from '@/services/auth'

const email = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Введите email'
    return
  }
  loading.value = true
  try {
    await authService.forgotPassword(email.value)
    sent.value = true
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
