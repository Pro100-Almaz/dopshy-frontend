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
  <div class="min-h-screen bg-gray-50 overflow-x-hidden" style="font-family: 'Rubik Mono One', sans-serif">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-success-600 flex items-center justify-center">
            <Dribbble class="w-5 h-5 text-white" />
          </div>
          <span class="font-bebas text-2xl tracking-wider text-gray-900">
            DOPSY <span class="text-success-600">ARENA</span>
          </span>
        </a>
        <a
          href="/"
          class="text-sm text-gray-500 hover:text-success-600 transition-colors font-semibold uppercase tracking-wider"
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
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-50 border border-success-100 mb-6">
            <Trash2 class="w-8 h-8 text-success-600" />
          </div>
          <h1 class="font-bebas text-5xl sm:text-6xl text-gray-900 tracking-wider mb-4">
            УДАЛЕНИЕ <span class="text-success-600">ДАННЫХ</span>
          </h1>
          <p class="text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
            Вы можете запросить удаление ваших персональных данных из нашей системы в любое время.
          </p>
        </div>

        <!-- Info Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div class="bg-white border border-gray-200 rounded-2xl shadow-theme-sm p-5 text-center">
            <ShieldCheck class="w-6 h-6 text-success-600 mx-auto mb-3" />
            <p class="text-gray-900 text-sm font-semibold">Номер телефона</p>
            <p class="text-gray-500 text-xs mt-1">Будет удалён полностью</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl shadow-theme-sm p-5 text-center">
            <Mail class="w-6 h-6 text-success-600 mx-auto mb-3" />
            <p class="text-gray-900 text-sm font-semibold">История чата</p>
            <p class="text-gray-500 text-xs mt-1">Удалена безвозвратно</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-2xl shadow-theme-sm p-5 text-center">
            <Clock class="w-6 h-6 text-success-600 mx-auto mb-3" />
            <p class="text-gray-900 text-sm font-semibold">Срок удаления</p>
            <p class="text-gray-500 text-xs mt-1">В течение 30 дней</p>
          </div>
        </div>

        <!-- Form / Success -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-theme-sm p-8">
          <template v-if="!submitted">
            <h2 class="font-bebas text-2xl text-gray-900 tracking-wider mb-2">ОТПРАВИТЬ ЗАПРОС</h2>
            <p class="text-gray-600 text-sm mb-8 leading-relaxed">
              Заполните форму ниже или напишите напрямую на
              <a
                href="mailto:support@dopsyarena.com"
                class="text-success-600 hover:underline"
              >support@dopsyarena.com</a>.
              Мы удалим ваш номер телефона и историю переписки в течение 30 дней.
            </p>

            <form @submit.prevent="handleSubmit" class="space-y-5">
              <div>
                <label for="dd-phone" class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                  Номер телефона
                </label>
                <input
                  id="dd-phone"
                  v-model="phone"
                  type="tel"
                  placeholder="+7 (700) 000-0000"
                  class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder:text-gray-500 text-sm focus:outline-none focus:border-success-600 focus:ring-1 focus:ring-success-600 transition-colors"
                />
              </div>

              <div>
                <label for="dd-email" class="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
                  Email (необязательно)
                </label>
                <input
                  id="dd-email"
                  v-model="email"
                  type="email"
                  placeholder="your@email.com"
                  class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder:text-gray-500 text-sm focus:outline-none focus:border-success-600 focus:ring-1 focus:ring-success-600 transition-colors"
                />
              </div>

              <p class="text-gray-500 text-xs leading-relaxed">
                Указав хотя бы один из идентификаторов, мы сможем найти и удалить все связанные
                с вами данные. После удаления восстановление невозможно.
              </p>

              <button
                type="submit"
                :disabled="!phone && !email"
                class="w-full bg-success-600 text-white font-bebas text-xl tracking-wider py-3 rounded-full hover:bg-success-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ОТПРАВИТЬ ЗАПРОС НА УДАЛЕНИЕ
              </button>
            </form>
          </template>

          <!-- Success State -->
          <template v-else>
            <div role="status" aria-live="polite" class="text-center py-8">
              <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-50 border border-success-100 mb-6">
                <ShieldCheck class="w-7 h-7 text-success-600" />
              </div>
              <h2 class="font-bebas text-3xl text-gray-900 tracking-wider mb-3">ЗАПРОС ПОЛУЧЕН</h2>
              <p class="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
                Мы получили ваш запрос и удалим все связанные данные в течение
                <span class="text-gray-900 font-semibold">30 дней</span>.
                Подтверждение будет отправлено на указанный email.
              </p>
            </div>
          </template>
        </div>

        <!-- Alternative contact note -->
        <p class="text-center text-gray-500 text-xs mt-8 leading-relaxed">
          Также вы можете написать напрямую:
          <a href="mailto:support@dopsyarena.com" class="text-gray-600 hover:text-success-600 transition-colors">
            support@dopsyarena.com
          </a>
        </p>
      </div>
    </main>

    <!-- Minimal Footer -->
    <footer class="border-t border-gray-200 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-gray-500 text-xs">
          &copy; {{ new Date().getFullYear() }} Dopsy Arena. Все права защищены.
        </p>
        <a href="/" class="text-gray-500 text-xs hover:text-success-600 transition-colors">
          Вернуться на главную
        </a>
      </div>
    </footer>
  </div>
</template>
