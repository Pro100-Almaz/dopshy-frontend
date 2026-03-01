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
        ? 'bg-[#0a0a0a]/80 backdrop-blur-lg border-white/10 py-3'
        : 'bg-transparent border-transparent py-5'
    "
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <!-- Logo -->
      <a href="#" class="flex items-center gap-2 group">
        <div
          class="w-10 h-10 rounded-full bg-[#39ff14] flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 landing-box-glow"
        >
          <Dribbble class="w-6 h-6 text-black" />
        </div>
        <span class="font-bebas text-3xl tracking-wider text-white">
          DOPSY <span class="text-[#39ff14]">ARENA</span>
        </span>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center gap-8">
        <a
          v-for="link in navLinks"
          :key="link.name"
          :href="link.href"
          class="text-sm font-semibold uppercase tracking-wider text-[#999] hover:text-[#39ff14] transition-colors duration-200"
        >
          {{ link.name }}
        </a>
        <router-link
          to="/login"
          class="px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-white border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
        >
          Войти
        </router-link>
        <a
          href="#book"
          class="px-6 py-2.5 bg-[#39ff14]/10 text-[#39ff14] font-bebas text-xl tracking-wider border border-[#39ff14]/50 hover:bg-[#39ff14] hover:text-black transition-all duration-300 -skew-x-[10deg]"
        >
          <span class="block skew-x-[10deg]">ЗАПИСАТЬСЯ</span>
        </a>
      </nav>

      <!-- Mobile Menu Toggle -->
      <button
        class="md:hidden text-white hover:text-[#39ff14] transition-colors"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <X v-if="mobileMenuOpen" class="w-8 h-8" />
        <Menu v-else class="w-8 h-8" />
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
        class="md:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
      >
        <div class="px-4 py-6 flex flex-col gap-6">
          <a
            v-for="link in navLinks"
            :key="link.name"
            :href="link.href"
            class="text-2xl font-bebas tracking-wider text-white hover:text-[#39ff14] transition-colors"
            @click="mobileMenuOpen = false"
          >
            {{ link.name }}
          </a>
          <router-link
            to="/login"
            class="inline-block text-center px-6 py-3 border border-white/20 text-white font-semibold uppercase tracking-wider text-sm hover:bg-white/5 transition-colors"
            @click="mobileMenuOpen = false"
          >
            Войти
          </router-link>
          <a
            href="#book"
            class="inline-block text-center px-6 py-4 bg-[#39ff14] text-black font-bebas text-2xl tracking-wider"
            @click="mobileMenuOpen = false"
          >
            ЗАПИСАТЬСЯ
          </a>
        </div>
      </div>
    </Transition>
  </header>
</template>
