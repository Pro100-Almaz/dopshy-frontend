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
  <section id="facilities" ref="sectionRef" class="landing-snap-section py-24 bg-gray-50 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bebas text-gray-900 mb-4">
          ЛУЧШИЕ <span class="text-success-600">ОБЪЕКТЫ</span>
        </h2>
        <p class="text-gray-500 max-w-2xl mx-auto text-sm md:text-base">
          Всё необходимое, чтобы полностью сосредоточиться на игре. Наша арена построена по
          профессиональным стандартам для игроков любого уровня.
        </p>
      </div>

      <!-- Feature cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="(feat, idx) in features"
          :key="idx"
          class="landing-reveal group rounded-2xl bg-white border border-gray-200 p-6 shadow-theme-sm hover:border-success-300 hover:shadow-theme-md transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
          :class="{ 'is-revealed': isVisible }"
          :style="{ '--reveal-i': idx }"
        >
          <div
            class="w-12 h-12 rounded-xl bg-success-50 border border-success-100 flex items-center justify-center text-success-600 mb-5 group-hover:scale-110 group-hover:bg-success-600 group-hover:text-white transition-all duration-300"
          >
            <component :is="feat.icon" class="w-6 h-6" />
          </div>

          <h3 class="text-base font-bebas leading-tight tracking-wide text-gray-900 mb-3 break-words">
            {{ feat.title }}
          </h3>

          <p class="text-gray-500 text-xs leading-relaxed">
            {{ feat.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
