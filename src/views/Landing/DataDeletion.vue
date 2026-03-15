<script setup lang="ts">
import { ref } from 'vue'
import { Trash2, Mail, ShieldCheck, Clock } from 'lucide-vue-next'
import { Dribbble } from 'lucide-vue-next'

const email = ref('')
const phone = ref('')
const submitted = ref(false)

function handleSubmit() {
  if (!email.value && !phone.value) return
  submitted.value = true
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] overflow-x-hidden" style="font-family: Outfit, sans-serif">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-[#39ff14] flex items-center justify-center">
            <Dribbble class="w-5 h-5 text-black" />
          </div>
          <span class="font-bebas text-2xl tracking-wider text-white">
            DOPSY <span class="text-[#39ff14]">ARENA</span>
          </span>
        </a>
        <a
          href="/"
          class="text-sm text-[#999] hover:text-[#39ff14] transition-colors font-semibold uppercase tracking-wider"
        >
          ← На главную
        </a>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="pt-32 pb-24">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">

        <!-- Header -->
        <div class="text-center mb-16">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 mb-6">
            <Trash2 class="w-8 h-8 text-[#39ff14]" />
          </div>
          <h1 class="font-bebas text-5xl sm:text-6xl text-white tracking-wider mb-4">
            УДАЛЕНИЕ <span class="text-[#39ff14]">ДАННЫХ</span>
          </h1>
          <p class="text-[#999] text-base leading-relaxed max-w-lg mx-auto">
            Вы можете запросить удаление ваших персональных данных из нашей системы в любое время.
          </p>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div class="bg-[#141414] border border-white/10 rounded-sm p-5 text-center">
            <ShieldCheck class="w-6 h-6 text-[#39ff14] mx-auto mb-3" />
            <p class="text-white text-sm font-semibold">Номер телефона</p>
            <p class="text-[#999] text-xs mt-1">Будет удалён полностью</p>
          </div>
          <div class="bg-[#141414] border border-white/10 rounded-sm p-5 text-center">
            <Mail class="w-6 h-6 text-[#39ff14] mx-auto mb-3" />
            <p class="text-white text-sm font-semibold">История чата</p>
            <p class="text-[#999] text-xs mt-1">Удалена безвозвратно</p>
          </div>
          <div class="bg-[#141414] border border-white/10 rounded-sm p-5 text-center">
            <Clock class="w-6 h-6 text-[#39ff14] mx-auto mb-3" />
            <p class="text-white text-sm font-semibold">Срок удаления</p>
            <p class="text-[#999] text-xs mt-1">В течение 30 дней</p>
          </div>
        </div>

        <!-- Form / Success -->
        <div class="bg-[#141414] border border-white/10 rounded-sm p-8">
          <template v-if="!submitted">
            <h2 class="font-bebas text-2xl text-white tracking-wider mb-2">ОТПРАВИТЬ ЗАПРОС</h2>
            <p class="text-[#999] text-sm mb-8 leading-relaxed">
              Заполните форму ниже или напишите напрямую на
              <a
                href="mailto:support@dopsyarena.com"
                class="text-[#39ff14] hover:underline"
              >support@dopsyarena.com</a>.
              Мы удалим ваш номер телефона и историю переписки в течение 30 дней.
            </p>

            <form @submit.prevent="handleSubmit" class="space-y-5">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-[#999] mb-2">
                  Номер телефона
                </label>
                <input
                  v-model="phone"
                  type="tel"
                  placeholder="+7 (700) 000-0000"
                  class="w-full bg-[#0a0a0a] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#39ff14]/50 transition-colors"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-[#999] mb-2">
                  Email (необязательно)
                </label>
                <input
                  v-model="email"
                  type="email"
                  placeholder="your@email.com"
                  class="w-full bg-[#0a0a0a] border border-white/10 rounded-sm px-4 py-3 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#39ff14]/50 transition-colors"
                />
              </div>

              <p class="text-[#555] text-xs leading-relaxed">
                Указав хотя бы один из идентификаторов, мы сможем найти и удалить все связанные
                с вами данные. После удаления восстановление невозможно.
              </p>

              <button
                type="submit"
                :disabled="!phone && !email"
                class="w-full bg-[#39ff14] text-black font-bebas text-xl tracking-wider py-3 rounded-sm hover:bg-[#39ff14]/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ОТПРАВИТЬ ЗАПРОС НА УДАЛЕНИЕ
              </button>
            </form>
          </template>

          <!-- Success State -->
          <template v-else>
            <div class="text-center py-8">
              <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/40 mb-6">
                <ShieldCheck class="w-7 h-7 text-[#39ff14]" />
              </div>
              <h2 class="font-bebas text-3xl text-white tracking-wider mb-3">ЗАПРОС ПОЛУЧЕН</h2>
              <p class="text-[#999] text-sm leading-relaxed max-w-sm mx-auto">
                Мы получили ваш запрос и удалим все связанные данные в течение
                <span class="text-white font-semibold">30 дней</span>.
                Подтверждение будет отправлено на указанный email.
              </p>
            </div>
          </template>
        </div>

        <!-- Alternative contact note -->
        <p class="text-center text-[#555] text-xs mt-8 leading-relaxed">
          Также вы можете написать напрямую:
          <a href="mailto:support@dopsyarena.com" class="text-[#999] hover:text-[#39ff14] transition-colors">
            support@dopsyarena.com
          </a>
        </p>
      </div>
    </main>

    <!-- Minimal Footer -->
    <footer class="border-t border-white/10 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-[#555] text-xs">
          &copy; {{ new Date().getFullYear() }} Dopsy Arena. Все права защищены.
        </p>
        <a href="/" class="text-[#555] text-xs hover:text-[#39ff14] transition-colors">
          Вернуться на главную
        </a>
      </div>
    </footer>
  </div>
</template>
