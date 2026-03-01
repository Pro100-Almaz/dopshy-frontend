<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ShieldCheck, Zap, Droplets, Car } from 'lucide-vue-next'

const features = [
  {
    icon: ShieldCheck,
    title: 'Газон стандарта FIFA',
    desc: 'Искусственный газон последнего поколения 4G с оптимальным отскоком мяча, амортизацией и защитой от травм.',
  },
  {
    icon: Zap,
    title: 'Профессиональное освещение',
    desc: 'Светодиодная система освещения 500 люкс обеспечивает идеальную видимость для вечерних и ночных матчей без бликов.',
  },
  {
    icon: Droplets,
    title: 'Раздевалки премиум',
    desc: 'Просторные раздевалки с горячим душем, надёжными шкафчиками и тактическими досками.',
  },
  {
    icon: Car,
    title: 'Охраняемая парковка',
    desc: 'Просторная бесплатная парковка рядом с полями под круглосуточным видеонаблюдением.',
  },
]

const sectionRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)

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
  <section id="facilities" ref="sectionRef" class="py-24 bg-[#141414] relative">
    <!-- Decorative elements -->
    <div
      class="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#39ff14]/5 to-transparent pointer-events-none"
    />
    <div
      class="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#39ff14]/20 to-transparent"
    />

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2
          class="text-5xl md:text-6xl font-bebas text-white mb-4 transition-all duration-700"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'"
        >
          ЛУЧШИЕ <span class="text-[#39ff14]">ОБЪЕКТЫ</span>
        </h2>
        <p
          class="text-[#999] max-w-2xl mx-auto text-lg transition-all duration-700 delay-100"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'"
        >
          Всё необходимое, чтобы полностью сосредоточиться на игре. Наша арена построена
          по профессиональным стандартам для игроков любого уровня.
        </p>
      </div>

      <!-- Feature cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="(feat, idx) in features"
          :key="idx"
          class="group bg-[#0a0a0a] border border-white/5 p-8 hover:border-[#39ff14]/50 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
          :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
          :style="{ transitionDuration: '500ms', transitionDelay: `${idx * 100 + 200}ms` }"
        >
          <div
            class="absolute top-0 right-0 w-32 h-32 bg-[#39ff14]/10 rounded-full blur-3xl group-hover:bg-[#39ff14]/20 transition-colors duration-500 -mr-10 -mt-10"
          />

          <div
            class="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center text-[#39ff14] mb-6 group-hover:scale-110 group-hover:bg-[#39ff14] group-hover:text-black transition-all duration-300"
          >
            <component :is="feat.icon" class="w-7 h-7" />
          </div>

          <h3 class="text-2xl font-bebas tracking-wider text-white mb-3">
            {{ feat.title }}
          </h3>

          <p class="text-[#999] text-sm leading-relaxed">
            {{ feat.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
