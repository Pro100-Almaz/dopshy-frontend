<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Menu, X, Dribbble } from 'lucide-vue-next'

const scrolled = ref(false)
const mobileMenuOpen = ref(false)

const navLinks = [
  { name: 'Арена', href: '#arena' },
  { name: 'Объекты', href: '#facilities' },
  { name: 'Галерея', href: '#gallery' },
]

function handleScroll() {
  scrolled.value = window.scrollY > 50
}

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<template>
  <header
    class="fixed top-0 w-full z-50 transition-all duration-300 border-b"
    :class="
      scrolled
        ? 'bg-white/80 backdrop-blur-lg border-gray-200 py-3'
        : 'bg-transparent border-transparent py-5'
    "
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <!-- Logo -->
      <a href="#" class="flex items-center gap-2 group">
        <div
          class="w-10 h-10 rounded-full bg-success-600 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300"
        >
          <Dribbble class="w-6 h-6 text-white" />
        </div>
        <span
          class="font-bebas text-3xl tracking-wider transition-colors duration-300"
          :class="scrolled ? 'text-gray-900' : 'text-white'"
        >
          DOPSY <span class="text-success-600">ARENA</span>
        </span>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-8">
        <a
          v-for="link in navLinks"
          :key="link.name"
          :href="link.href"
          class="text-sm font-semibold uppercase tracking-wider transition-colors duration-200"
          :class="scrolled ? 'text-gray-600 hover:text-success-600' : 'text-white/90 hover:text-white'"
        >
          {{ link.name }}
        </a>
        <router-link
          to="/booking"
          class="text-sm font-semibold uppercase tracking-wider transition-colors duration-200"
          :class="scrolled ? 'text-gray-600 hover:text-success-600' : 'text-white/90 hover:text-white'"
        >
          Бронирование
        </router-link>
        <router-link
          to="/login"
          class="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider border transition-all duration-200"
          :class="
            scrolled
              ? 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              : 'border-white/30 text-white hover:bg-white/10'
          "
        >
          Войти
        </router-link>
      </nav>

      <!-- Mobile Menu Toggle -->
      <button
        class="md:hidden -m-2 p-2 transition-colors"
        :class="scrolled ? 'text-gray-900 hover:text-success-600' : 'text-white hover:text-success-600'"
        :aria-label="mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-nav"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <X v-if="mobileMenuOpen" class="w-8 h-8" aria-hidden="true" />
        <Menu v-else class="w-8 h-8" aria-hidden="true" />
      </button>
    </div>

    <!-- Mobile Nav -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileMenuOpen"
        id="mobile-nav"
        class="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 overflow-hidden"
      >
        <div class="px-4 py-6 flex flex-col gap-6">
          <a
            v-for="link in navLinks"
            :key="link.name"
            :href="link.href"
            class="text-2xl font-bebas tracking-wider text-gray-900 hover:text-success-600 transition-colors"
            @click="mobileMenuOpen = false"
          >
            {{ link.name }}
          </a>
          <router-link
            to="/booking"
            class="text-2xl font-bebas tracking-wider text-gray-900 hover:text-success-600 transition-colors"
            @click="mobileMenuOpen = false"
          >
            Бронирование
          </router-link>
          <router-link
            to="/login"
            class="inline-block text-center px-6 py-3 border border-gray-300 text-gray-700 font-semibold uppercase tracking-wider text-sm hover:bg-gray-50 transition-colors"
            @click="mobileMenuOpen = false"
          >
            Войти
          </router-link>
        </div>
      </div>
    </Transition>
  </header>
</template>
