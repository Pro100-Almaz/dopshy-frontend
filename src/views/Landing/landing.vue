<script setup lang="ts">
import LandingNavbar from './components/LandingNavbar.vue'
import LandingHero from './components/LandingHero.vue'
import LandingFacilities from './components/LandingFacilities.vue'
import LandingBookingForm from './components/LandingBookingForm.vue'
import LandingFooter from './components/LandingFooter.vue'
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] overflow-x-hidden" style="font-family: Outfit, sans-serif">
    <LandingNavbar />

    <main>
      <LandingHero />

      <!-- Banner Strip -->
      <div class="bg-[#39ff14] py-4 overflow-hidden border-y border-white/20">
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
              class="inline-flex items-center gap-6 font-bebas text-2xl tracking-widest text-black pr-10"
            >
              <span>ГАЗОН СТАНДАРТА FIFA</span>
              <span class="w-2 h-2 rounded-full bg-black inline-block shrink-0" />
              <span>ОТКРЫТО 24/7</span>
              <span class="w-2 h-2 rounded-full bg-black inline-block shrink-0" />
              <span>ПРО ОСВЕЩЕНИЕ</span>
              <span class="w-2 h-2 rounded-full bg-black inline-block shrink-0" />
            </span>
          </div>
        </div>
      </div>

      <LandingFacilities />

      <!-- Gallery -->
      <section id="gallery" class="py-24 relative bg-[#141414] border-t border-white/5 overflow-hidden">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <img
              src="https://pixabay.com/get/g5fbc6492affa2cd61e37de6919daae3fba72a84b95360606e3aa2f19b4bb9cdf736fc7904ad7e4145006517367bf49286494e090f340e046ab30bbf662431007_1280.jpg"
              alt="Gallery 1"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm"
            />
            <img
              src="https://pixabay.com/get/g6fed6f27058e3c2d52af6cf25136e5fd3f221e11e944b4ee9992ba0907a8d8799f1f0d4e2a03a14c798f8037688130ddb6d5fc7d4ac75026e219792f40ca5df2_1280.jpg"
              alt="Gallery 2"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm mt-8"
            />
            <img
              src="https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=600&auto=format&fit=crop"
              alt="Gallery 3"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm"
            />
            <img
              src="https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop"
              alt="Gallery 4"
              class="w-full aspect-[4/5] object-cover grayscale hover:grayscale-0 transition-all duration-500 rounded-sm mt-8"
            />
          </div>
        </div>
      </section>

      <LandingBookingForm />
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

/* Glow utilities used by child components */
.landing-text-glow {
  filter: drop-shadow(0 0 20px rgba(57, 255, 20, 0.5));
}

.landing-box-glow {
  box-shadow: 0 0 20px rgba(57, 255, 20, 0.15);
}

.landing-box-glow-hover:hover {
  box-shadow: 0 0 30px rgba(57, 255, 20, 0.3);
}
</style>
