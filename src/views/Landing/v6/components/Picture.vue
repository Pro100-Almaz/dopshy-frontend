<script setup lang="ts">
import { computed } from 'vue'
import images from '../data/images.json'
import { ASSETS } from '../routes'

type Entry = { widths: number[]; ratio: number; lqip: string }
const M = images as unknown as Record<string, Entry>

const props = defineProps<{ name: string; alt: string; sizes: string; priority?: boolean }>()

const meta = computed(() => M[props.name])
const srcset = computed(() =>
  meta.value.widths.map((w) => `${ASSETS}img/${props.name}-${w}.webp ${w}w`).join(', '),
)
const src = computed(() => {
  const w = meta.value.widths
  return `${ASSETS}img/${props.name}-${w[Math.min(1, w.length - 1)]}.webp`
})
</script>

<template>
  <img
    v-if="meta?.widths"
    :src="src"
    :srcset="srcset"
    :sizes="sizes"
    :alt="alt"
    :loading="priority ? 'eager' : 'lazy'"
    :decoding="priority ? 'sync' : 'async'"
    :fetchpriority="priority ? 'high' : 'auto'"
    :style="{
      backgroundImage: `url(${meta.lqip})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }"
  />
</template>
