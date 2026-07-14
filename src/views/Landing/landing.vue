<script setup lang="ts">
import LandingNavbar from './components/LandingNavbar.vue'
import LandingHero from './components/LandingHero.vue'
import LandingFacilities from './components/LandingFacilities.vue'
import LandingFooter from './components/LandingFooter.vue'
import { mediaUrl } from '@/services/api'
</script>

<template>
  <div
    class="landing-root min-h-screen bg-white overflow-x-hidden"
    style="font-family: Outfit, sans-serif"
  >
    <LandingNavbar />

    <main>
      <LandingHero />

      <!-- Banner Strip -->
      <div class="bg-success-600 py-4 overflow-hidden border-y border-success-700">
        <div class="landing-marquee flex whitespace-nowrap">
          <div
            v-for="i in 2"
            :key="i"
            class="flex items-center shrink-0"
            :aria-hidden="i === 2 ? 'true' : undefined"
          >
            <span
              v-for="j in 8"
              :key="j"
              class="inline-flex items-center gap-6 font-bebas text-2xl tracking-widest text-white pr-10"
            >
              <span>ГАЗОН СТАНДАРТА FIFA</span>
              <span class="w-2 h-2 rounded-full bg-white inline-block shrink-0" />
              <span>ОТКРЫТО 24/7</span>
              <span class="w-2 h-2 rounded-full bg-white inline-block shrink-0" />
              <span>ПРО ОСВЕЩЕНИЕ</span>
              <span class="w-2 h-2 rounded-full bg-white inline-block shrink-0" />
            </span>
          </div>
        </div>
      </div>

      <LandingFacilities />

      <!-- Gallery -->
      <section id="gallery" class="py-24 relative bg-gray-50 border-t border-gray-200 overflow-hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <img :src="mediaUrl('img.png')"
              alt="Футбольное поле Dopsy Arena с искусственным газоном"
              loading="lazy"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm"
            />
            <img
            :src="mediaUrl('img_2.png')"
              alt="Игроки во время матча на арене"
              loading="lazy"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm mt-8"
            />
            <img :src="mediaUrl('img_3.png')"
              alt="Вечерний матч под профессиональным освещением"
              loading="lazy"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm"
            />
            <img
              :src="mediaUrl('img_4.png')"
              alt="Крупный план мяча на газоне поля"
              loading="lazy"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm mt-8"
            />
          </div>
        </div>
      </section>

    </main>

    <LandingFooter />
  </div>
</template>

<style>
/* ─── Landing page global styles ──────────────────────────────────────────── */

/* Scrolling banner */
.landing-marquee {
  animation: landing-scroll 30s linear infinite;
}

@keyframes landing-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* Hero entry animations */
.landing-fade-up {
  animation: landing-fade-up 0.8s ease-out both;
}

.landing-delay-0 {
  animation-delay: 0s;
}
.landing-delay-1 {
  animation-delay: 0.1s;
}
.landing-delay-2 {
  animation-delay: 0.2s;
}
.landing-delay-3 {
  animation-delay: 0.3s;
}

@keyframes landing-fade-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ─── Scroll reveal ───────────────────────────────────────────────────────────
   Resting state is fully visible — motion is enhancement only. A JS-added
   `.is-revealed` class plays the entrance; `animation-fill-mode: backwards`
   hides the element only during its stagger delay, then releases so hover
   transforms keep working. No JS / headless / reduced-motion → content shows. */
.landing-reveal.is-revealed,
.landing-reveal-left.is-revealed,
.landing-reveal-right.is-revealed {
  animation-duration: 0.7s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: backwards;
}
.landing-reveal.is-revealed {
  animation-name: landing-reveal-up;
  animation-delay: calc(var(--reveal-i, 0) * 90ms);
}
.landing-reveal-left.is-revealed {
  animation-name: landing-reveal-left;
}
.landing-reveal-right.is-revealed {
  animation-name: landing-reveal-right;
  animation-delay: 0.12s;
}

@keyframes landing-reveal-up {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes landing-reveal-left {
  from {
    opacity: 0;
    transform: translateX(-2rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes landing-reveal-right {
  from {
    opacity: 0;
    transform: translateX(2rem);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ─── Reduced motion ──────────────────────────────────────────────────────────
   Kill landing motion but keep everything visible. Scoped to `.landing-root`
   so the rest of the app is untouched. */
@media (prefers-reduced-motion: reduce) {
  .landing-root .landing-marquee,
  .landing-root .landing-fade-up,
  .landing-root .landing-reveal.is-revealed,
  .landing-root .landing-reveal-left.is-revealed,
  .landing-root .landing-reveal-right.is-revealed {
    animation: none !important;
  }
  .landing-root *,
  .landing-root *::before,
  .landing-root *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
