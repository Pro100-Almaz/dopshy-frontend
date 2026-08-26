<script setup lang="ts">
import { Dribbble, Instagram, Twitter, MapPin, Mail, Phone } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { ARENA, directionsUrl } from '@/services/booking'

const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-gray-50 border-t border-gray-200 pt-20 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <!-- Brand -->
        <div class="col-span-1 lg:col-span-2">
          <a href="#" class="flex items-center gap-2 mb-6">
            <div class="w-10 h-10 rounded-full bg-success-600 flex items-center justify-center">
              <Dribbble class="w-6 h-6 text-white" />
            </div>
            <span class="font-bebas text-2xl tracking-wider text-gray-900">
              DOPSY <span class="text-success-600">ARENA</span>
            </span>
          </a>
          <p class="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
            Лучшее место для футбола 5×5 и 6×6. Профессиональные условия для тех, кто любит
            красивую игру.
          </p>
          <div class="flex items-center gap-4">
            <a
              href="#"
              aria-label="Dopsy Arena в Instagram"
              class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-success-600 hover:text-success-600 transition-all"
            >
              <Instagram class="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href="#"
              aria-label="Dopsy Arena в Twitter"
              class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-success-600 hover:text-success-600 transition-all"
            >
              <Twitter class="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="text-base font-bebas text-gray-900 mb-6">НАВИГАЦИЯ</h4>
          <ul class="space-y-4">
            <li>
              <a
                href="#facilities"
                class="text-gray-500 hover:text-success-600 transition-colors text-xs uppercase tracking-wider font-semibold"
                >Объекты</a
              >
            </li>
            <li>
              <a
                href="#gallery"
                class="text-gray-500 hover:text-success-600 transition-colors text-xs uppercase tracking-wider font-semibold"
                >Галерея</a
              >
            </li>
            <li>
              <router-link
                to="/booking"
                class="text-gray-500 hover:text-success-600 transition-colors text-xs uppercase tracking-wider font-semibold"
                >Бронирование</router-link
              >
            </li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h4 class="text-base font-bebas text-gray-900 mb-6">КОНТАКТЫ</h4>
          <ul class="space-y-4">
            <li class="flex items-start gap-3 text-gray-600 text-xs">
              <MapPin class="w-5 h-5 text-success-600 shrink-0 mt-0.5" />
              <a
                :href="directionsUrl()"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors hover:text-success-600"
              >
                {{ ARENA.address }}
              </a>
            </li>
            <li class="flex items-center gap-3 text-gray-600 text-xs">
              <Phone class="w-5 h-5 text-success-600 shrink-0" />
              <a href="tel:+77005556000" class="transition-colors hover:text-success-600">
                +7 (700) 555-6000
              </a>
            </li>
            <li class="flex items-center gap-3 text-gray-600 text-xs">
              <Mail class="w-5 h-5 text-success-600 shrink-0" />
              <a href="mailto:arena@dopsy.kz" class="transition-colors hover:text-success-600">
                arena@dopsy.kz
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar -->
      <div
        class="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p class="text-gray-500 text-xs">
          &copy; {{ currentYear }} Dopsy Arena. Все права защищены.
        </p>
        <div class="flex items-center gap-6 text-xs text-gray-500">
          <a href="#" class="hover:text-gray-900 transition-colors">Конфиденциальность</a>
          <a href="#" class="hover:text-gray-900 transition-colors">Условия использования</a>
          <router-link to="/data-deletion" class="hover:text-success-600 transition-colors"
            >Удаление данных</router-link
          >
        </div>
      </div>
    </div>
  </footer>
</template>
