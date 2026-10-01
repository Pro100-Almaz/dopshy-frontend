<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Replaces framer-motion's whileInView fade-up.
const props = withDefaults(defineProps<{ delay?: number; y?: number }>(), { delay: 0, y: 24 })

const el = ref<HTMLElement>()
const shown = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
let io: IntersectionObserver | undefined

onMounted(() => {
  if (shown.value || !el.value) return
  io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return
      shown.value = true
      io?.disconnect()
    },
    { rootMargin: '-80px' },
  )
  io.observe(el.value)
})
onBeforeUnmount(() => io?.disconnect())

const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
</script>

<template>
  <div
    ref="el"
    :style="
      shown
        ? {
            transition: `opacity 0.6s ${ease} ${props.delay}s, transform 0.6s ${ease} ${props.delay}s`,
          }
        : { opacity: 0, transform: `translateY(${props.y}px)` }
    "
  >
    <slot />
  </div>
</template>
