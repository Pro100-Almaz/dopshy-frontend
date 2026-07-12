<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Navigation } from 'lucide-vue-next'
import { ARENA, directionsUrl } from '@/services/booking'

const embedSrc = computed(() => {
  const { lat, lng } = ARENA
  const bbox = [lng - 0.008, lat - 0.005, lng + 0.008, lat + 0.005].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
})
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm">
    <div class="relative aspect-[16/9] bg-gray-100">
      <iframe
        title="Карта расположения Dopsy Arena"
        :src="embedSrc"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        class="h-full w-full border-0"
      />
    </div>
    <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="flex items-center gap-2 text-sm text-gray-600">
        <MapPin class="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
        {{ ARENA.address }}
      </p>
      <a
        :href="directionsUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-success-600 hover:text-success-600"
      >
        <Navigation class="h-4 w-4" aria-hidden="true" /> Проложить маршрут
      </a>
    </div>
  </div>
</template>
