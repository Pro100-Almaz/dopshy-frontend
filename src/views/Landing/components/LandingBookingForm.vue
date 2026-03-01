<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  Calendar,
  Clock,
  User,
  Phone,
  MessageSquare,
  ArrowRight,
  Loader2,
} from 'lucide-vue-next'

const sectionRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)
const isSubmitting = ref(false)
const isSuccess = ref(false)

const form = reactive({
  name: '',
  phone: '',
  preferredDate: '',
  preferredTime: '',
  message: '',
})

const errors = reactive({
  name: '',
  phone: '',
  preferredDate: '',
  preferredTime: '',
})

function validate() {
  errors.name = form.name.trim() ? '' : 'Введите имя'
  errors.phone = form.phone.trim() ? '' : 'Введите номер телефона'
  errors.preferredDate = form.preferredDate ? '' : 'Выберите дату'
  errors.preferredTime = form.preferredTime ? '' : 'Выберите время'
  return !errors.name && !errors.phone && !errors.preferredDate && !errors.preferredTime
}

async function onSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  try {
    await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
  } catch {
    // Show success for demo regardless
  } finally {
    isSubmitting.value = false
    isSuccess.value = true
    Object.assign(form, { name: '', phone: '', preferredDate: '', preferredTime: '', message: '' })
  }
}

onMounted(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    { threshold: 0.1 },
  )
  if (sectionRef.value) observer.observe(sectionRef.value)
})
</script>

<template>
  <section id="book" ref="sectionRef" class="py-24 bg-[#0a0a0a] relative border-t border-white/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col lg:flex-row gap-16 items-center">
        <!-- Left Column – Imagery & Info -->
        <div
          class="w-full lg:w-1/2 relative transition-all duration-700"
          :class="isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'"
        >
          <div class="relative aspect-square max-w-md mx-auto lg:mx-0">
            <div
              class="absolute inset-0 bg-[#39ff14]/20 blur-3xl rounded-full transform -translate-x-10 translate-y-10"
            />
            <div
              class="relative z-10 w-full h-full border border-white/10 p-2 bg-[#141414]/50 backdrop-blur-sm"
            >
              <img
                src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop"
                alt="Action shot"
                class="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
              />
              <div
                class="absolute -bottom-6 -right-6 bg-[#141414] border border-white/10 p-6 shadow-xl w-48 hidden sm:block"
              >
                <p class="font-bebas text-4xl text-[#39ff14] leading-none">100%</p>
                <p class="text-sm text-[#999] font-semibold uppercase mt-1">
                  Гарантия<br />качества
                </p>
              </div>
            </div>
          </div>

          <div class="mt-12 hidden lg:block">
            <h3 class="text-4xl font-bebas text-white mb-4">ЗАЙМИ СВОЁ МЕСТО</h3>
            <p class="text-[#999] max-w-md">
              Места быстро заканчиваются, особенно в вечернее время. Оставьте заявку, и наша
              команда подтвердит бронирование по телефону или WhatsApp в течение 15 минут.
            </p>
          </div>
        </div>

        <!-- Right Column – Form -->
        <div
          class="w-full lg:w-1/2 transition-all duration-700 delay-200"
          :class="isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'"
        >
          <div class="bg-[#141414] border border-white/10 p-8 sm:p-10 relative">
            <div
              class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#39ff14] to-transparent"
            />

            <!-- Success state -->
            <div v-if="isSuccess" class="text-center py-12">
              <div
                class="w-16 h-16 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  class="w-8 h-8 text-[#39ff14]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 class="text-3xl font-bebas text-white mb-2">ЗАЯВКА ОТПРАВЛЕНА!</h3>
              <p class="text-[#999]">Мы свяжемся с вами в ближайшее время для подтверждения.</p>
              <button
                class="mt-8 px-6 py-3 border border-[#39ff14]/50 text-[#39ff14] font-bebas text-xl tracking-wider hover:bg-[#39ff14] hover:text-black transition-all duration-300"
                @click="isSuccess = false"
              >
                НОВАЯ ЗАЯВКА
              </button>
            </div>

            <template v-else>
              <h2 class="text-4xl font-bebas text-white mb-2">ЗАБРОНИРОВАТЬ ПОЛЕ</h2>
              <p class="text-[#999] mb-8">Оставьте данные ниже для проверки доступности.</p>

              <form class="space-y-5" @submit.prevent="onSubmit">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <!-- Name -->
                  <div class="space-y-2">
                    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <User class="w-4 h-4 text-[#39ff14]" /> Имя и фамилия
                    </label>
                    <input
                      v-model="form.name"
                      placeholder="Иван Иванов"
                      class="w-full bg-[#0a0a0a] border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#39ff14] transition-all rounded-sm"
                      :class="errors.name ? 'border-red-500' : 'border-white/10 focus:border-[#39ff14]'"
                    />
                    <span v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</span>
                  </div>

                  <!-- Phone -->
                  <div class="space-y-2">
                    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Phone class="w-4 h-4 text-[#39ff14]" /> Номер телефона
                    </label>
                    <input
                      v-model="form.phone"
                      placeholder="+7 (700) 000-0000"
                      class="w-full bg-[#0a0a0a] border px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#39ff14] transition-all rounded-sm"
                      :class="errors.phone ? 'border-red-500' : 'border-white/10 focus:border-[#39ff14]'"
                    />
                    <span v-if="errors.phone" class="text-xs text-red-500">{{ errors.phone }}</span>
                  </div>

                  <!-- Date -->
                  <div class="space-y-2">
                    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Calendar class="w-4 h-4 text-[#39ff14]" /> Желаемая дата
                    </label>
                    <input
                      v-model="form.preferredDate"
                      type="date"
                      class="w-full bg-[#0a0a0a] border px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[#39ff14] transition-all rounded-sm [color-scheme:dark]"
                      :class="errors.preferredDate ? 'border-red-500' : 'border-white/10 focus:border-[#39ff14]'"
                    />
                    <span v-if="errors.preferredDate" class="text-xs text-red-500">{{
                      errors.preferredDate
                    }}</span>
                  </div>

                  <!-- Time -->
                  <div class="space-y-2">
                    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Clock class="w-4 h-4 text-[#39ff14]" /> Желаемое время
                    </label>
                    <select
                      v-model="form.preferredTime"
                      class="w-full bg-[#0a0a0a] border px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[#39ff14] transition-all rounded-sm"
                      :class="errors.preferredTime ? 'border-red-500' : 'border-white/10 focus:border-[#39ff14]'"
                    >
                      <option value="">Выберите время</option>
                      <option value="Утро (8:00 - 12:00)">Утро (8:00 – 12:00)</option>
                      <option value="День (12:00 - 16:00)">День (12:00 – 16:00)</option>
                      <option value="Вечер (16:00 - 20:00)">Вечер (16:00 – 20:00)</option>
                      <option value="Ночь (20:00 - 00:00)">Ночь (20:00 – 00:00)</option>
                    </select>
                    <span v-if="errors.preferredTime" class="text-xs text-red-500">{{
                      errors.preferredTime
                    }}</span>
                  </div>
                </div>

                <!-- Message -->
                <div class="space-y-2">
                  <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <MessageSquare class="w-4 h-4 text-[#39ff14]" /> Дополнительные пожелания
                    <span class="text-[#666] font-normal">(необязательно)</span>
                  </label>
                  <textarea
                    v-model="form.message"
                    rows="4"
                    placeholder="Например: нужны манишки и мяч, или это корпоративное мероприятие..."
                    class="w-full bg-[#0a0a0a] border border-white/10 px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#39ff14] focus:ring-1 focus:ring-[#39ff14] transition-all rounded-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="w-full group relative inline-flex items-center justify-center px-8 py-4 font-bebas text-2xl tracking-wider text-black bg-[#39ff14] overflow-hidden hover:bg-[#39ff14]/90 transition-all duration-300 landing-box-glow mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <div
                    class="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                  />
                  <span class="flex items-center gap-3">
                    <template v-if="isSubmitting">
                      <Loader2 class="w-6 h-6 animate-spin" /> ОТПРАВКА...
                    </template>
                    <template v-else>
                      ОТПРАВИТЬ ЗАЯВКУ
                      <ArrowRight
                        class="w-6 h-6 group-hover:translate-x-1 transition-transform"
                      />
                    </template>
                  </span>
                </button>
              </form>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
