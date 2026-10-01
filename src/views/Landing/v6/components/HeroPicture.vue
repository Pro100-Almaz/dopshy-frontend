<script setup lang="ts">
import images from '../data/images.json'
import { ASSETS } from '../routes'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ className?: string }>(), { className: 'size-full object-cover' })

const M = images as unknown as Record<string, { widths: number[] }>
const srcset = (name: string) =>
  M[name].widths.map((w) => `${ASSETS}img/${name}-${w}.webp ${w}w`).join(', ')
</script>

<template>
  <picture>
    <source media="(max-width: 639px)" :srcset="srcset('hero-m')" sizes="100vw" />
    <img
      v-bind="$attrs"
      :src="`${ASSETS}img/hero-1600.webp`"
      :srcset="srcset('hero')"
      sizes="100vw"
      alt="Главный зал DOPȘÝ ARENA под куполом, вывеска DOPȘÝ ARENA на дальней стене"
      fetchpriority="high"
      decoding="async"
      :class="className"
    />
  </picture>
</template>
