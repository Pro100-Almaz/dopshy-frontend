<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
</script>

<template>
  <section id="arena" class="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
    <!-- Background Image & Overlay -->
    <div class="absolute inset-0 z-0">
      <img
        src="https://pixabay.com/get/gc4275141cf6bdbc0ac3b6190a059a93395c668c65e6841c14d95d686c1d2e1f135a08e29e1431f5f4b378e0ebf8909994588c30ff87e5cc04ce267ba5af35ef3_1280.jpg"
        alt="Dopsy Arena Turf"
        class="w-full h-full object-cover object-center scale-105 opacity-60"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/30"
      />
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
      <div class="max-w-3xl">
        <span
          class="landing-fade-up landing-delay-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-success-600 font-semibold text-sm mb-6 uppercase tracking-widest"
        >
          <span class="w-2 h-2 rounded-full bg-success-600 animate-pulse inline-block" />
          Профессиональные поля
        </span>

        <h1
          class="landing-fade-up landing-delay-1 text-[clamp(3rem,9vw,6rem)] font-bebas text-white leading-[0.85] mb-6"
        >
          ИГРАЙ КАК <br />
          <span class="text-success-600">ПРОФИ</span>
        </h1>

        <p
          class="landing-fade-up landing-delay-2 text-lg md:text-xl text-gray-300 mb-10 max-w-xl font-light"
        >
          Лучшая среда для футбола. Искусственный газон со стандартом FIFA, профессиональное
          освещение и первоклассные условия для матчей 5×5 и 7×7.
        </p>

        <div class="landing-fade-up landing-delay-3 flex flex-wrap items-center gap-4">
          <router-link
            to="/booking"
            class="group relative inline-flex items-center justify-center px-8 py-4 font-bebas text-2xl tracking-wider text-white bg-success-600 overflow-hidden hover:scale-105 transition-transform duration-300 -skew-x-[10deg]"
          >
            <div
              class="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
            />
            <span class="skew-x-[10deg] flex items-center gap-2">
              ЗАБРОНИРОВАТЬ <ChevronRight class="w-6 h-6" />
            </span>
          </router-link>

          <a
            href="#facilities"
            class="inline-flex items-center justify-center px-8 py-4 font-bebas text-2xl tracking-wider text-white border border-white/20 hover:bg-white/5 transition-colors duration-300 -skew-x-[10deg]"
          >
            <span class="skew-x-[10deg]">НАШИ ОБЪЕКТЫ</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
