<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ words: string[]; className?: string }>(), {
  className: 'text-acid',
})

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const i = ref(0)
const longest = computed(() => props.words.reduce((a, b) => (b.length > a.length ? b : a), ''))

let id: number | undefined
watch(
  () => props.words,
  () => {
    i.value = 0
    window.clearInterval(id)
    if (!reduce) id = window.setInterval(() => (i.value = (i.value + 1) % props.words.length), 2200)
  },
  { immediate: true },
)
onBeforeUnmount(() => window.clearInterval(id))
</script>

<template>
  <span :class="['relative inline-grid overflow-hidden align-bottom', className]">
    <span class="invisible col-start-1 row-start-1" aria-hidden="true">{{ longest }}</span>
    <Transition
      enter-from-class="translate-y-full opacity-0"
      leave-to-class="-translate-y-full opacity-0"
      enter-active-class="transition duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]"
      leave-active-class="transition duration-450 ease-[cubic-bezier(0.22,1,0.36,1)]"
    >
      <span :key="words[i]" class="col-start-1 row-start-1">{{ words[i] }}</span>
    </Transition>
  </span>
</template>
