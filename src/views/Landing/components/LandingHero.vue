<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { mediaUrl } from '@/services/api'
</script>

<template>
  <section
    id="arena"
    class="landing-snap-section relative min-h-[90vh] flex items-center justify-center overflow-hidden"
  >
    <!-- Background Image & Overlay -->
    <div class="absolute inset-0 z-0">
      <img
        :src="mediaUrl('img_3.png')"
        alt="Dopsy Arena Turf"
        class="w-full h-full object-cover object-center scale-105 opacity-60"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#2cd779] via-[#0a0a0a]/90 to-[#0a0a0a]/10"
      />
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
      <div class="max-w-3xl">
        <h1
          class="landing-fade-up landing-delay-1 text-[clamp(2.25rem,6.75vw,4.5rem)] font-bebas text-white leading-[0.9] mb-6"
        >
          ИГРАЙ КАК <br />
          <span class="text-success-600">ПРОФИ</span>
        </h1>
        <span
          class="landing-fade-up landing-delay-0 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-success-600 font-semibold text-xs mb-6 uppercase tracking-wider"
        >
          <span class="w-2 h-2 rounded-full bg-success-600 animate-pulse inline-block" />
          Профессиональные поля
        </span>

        <p
          class="landing-fade-up landing-delay-2 text-sm md:text-base text-gray-300 mb-10 max-w-xl font-light leading-relaxed"
        >
          Лучшая среда для футбола. Искусственный газон со стандартом FIFA, профессиональное
          освещение и первоклассные условия для матчей 5×5 и 6×6.
        </p>

        <div class="landing-fade-up landing-delay-3 flex flex-wrap items-center gap-4">
          <router-link
            to="/booking"
            class="group relative inline-flex items-center justify-center px-6 py-3 font-bebas text-lg tracking-wider text-white bg-success-600 overflow-hidden hover:scale-105 transition-transform duration-300 -skew-x-[10deg]"
          >
            <div
              class="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
            />
            <span class="skew-x-[10deg] flex items-center gap-2">
              ЗАБРОНИРОВАТЬ <ChevronRight class="w-5 h-5" />
            </span>
          </router-link>

          <a
            href="#facilities"
            class="inline-flex items-center justify-center px-6 py-3 font-bebas text-lg tracking-wider text-white border border-white/20 hover:bg-white/5 transition-colors duration-300 -skew-x-[10deg]"
          >
            <span class="skew-x-[10deg]">НАШИ ОБЪЕКТЫ</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
