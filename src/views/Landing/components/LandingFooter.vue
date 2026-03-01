<script setup lang="ts">
import { Dribbble, Instagram, Twitter, MapPin, Mail, Phone } from 'lucide-vue-next'

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-[#141414] border-t border-white/10 pt-20 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <!-- Brand -->
        <div class="col-span-1 lg:col-span-2">
          <a href="#" class="flex items-center gap-2 mb-6">
            <div class="w-10 h-10 rounded-full bg-[#39ff14] flex items-center justify-center">
              <Dribbble class="w-6 h-6 text-black" />
            </div>
            <span class="font-bebas text-3xl tracking-wider text-white">
              DOPSY <span class="text-[#39ff14]">ARENA</span>
            </span>
          </a>
          <p class="text-[#999] max-w-sm mb-8 leading-relaxed">
            Лучшее место для футбола 5×5 и 7×7. Профессиональные условия для тех, кто любит
            красивую игру.
          </p>
          <div class="flex items-center gap-4">
            <a
              href="#"
              class="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-white hover:border-[#39ff14] hover:text-[#39ff14] transition-all"
            >
              <Instagram class="w-5 h-5" />
            </a>
            <a
              href="#"
              class="w-10 h-10 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-white hover:border-[#39ff14] hover:text-[#39ff14] transition-all"
            >
              <Twitter class="w-5 h-5" />
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-xl font-bebas text-white mb-6">НАВИГАЦИЯ</h4>
          <ul class="space-y-4">
            <li>
              <a
                href="#arena"
                class="text-[#999] hover:text-[#39ff14] transition-colors text-sm uppercase tracking-wider font-semibold"
                >Арена</a
              >
            </li>
            <li>
              <a
                href="#facilities"
                class="text-[#999] hover:text-[#39ff14] transition-colors text-sm uppercase tracking-wider font-semibold"
                >Объекты</a
              >
            </li>
            <li>
              <a
                href="#gallery"
                class="text-[#999] hover:text-[#39ff14] transition-colors text-sm uppercase tracking-wider font-semibold"
                >Галерея</a
              >
            </li>
            <li>
              <a
                href="#book"
                class="text-[#999] hover:text-[#39ff14] transition-colors text-sm uppercase tracking-wider font-semibold"
                >Записаться</a
              >
            </li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="text-xl font-bebas text-white mb-6">КОНТАКТЫ</h4>
          <ul class="space-y-4">
            <li class="flex items-start gap-3 text-[#999] text-sm">
              <MapPin class="w-5 h-5 text-[#39ff14] shrink-0 mt-0.5" />
              <span>123 Stadium Way,<br />Sportsville, SP 45678</span>
            </li>
            <li class="flex items-center gap-3 text-[#999] text-sm">
              <Phone class="w-5 h-5 text-[#39ff14] shrink-0" />
              <span>+7 (700) 123-4567</span>
            </li>
            <li class="flex items-center gap-3 text-[#999] text-sm">
              <Mail class="w-5 h-5 text-[#39ff14] shrink-0" />
              <span>bookings@dopsyarena.com</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar -->
      <div
        class="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p class="text-[#999] text-sm">
          &copy; {{ currentYear }} Dopsy Arena. Все права защищены.
        </p>
        <div class="flex items-center gap-6 text-sm text-[#999]">
          <a href="#" class="hover:text-white transition-colors">Конфиденциальность</a>
          <a href="#" class="hover:text-white transition-colors">Условия использования</a>
        </div>
      </div>
    </div>
  </footer>
</template>
