<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Picture from './Picture.vue'

withDefaults(
  defineProps<{
    kicker: string
    title: string
    lead: string
    image: string
    alt: string
    accent?: 'acid' | 'boxy'
  }>(),
  { accent: 'acid' },
)

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const on = ref(reduce)
onMounted(() => {
  if (!reduce) requestAnimationFrame(() => requestAnimationFrame(() => (on.value = true)))
})

const rise = (d: number) =>
  reduce
    ? {}
    : {
        opacity: on.value ? 1 : 0,
        transform: on.value ? 'none' : 'translateY(24px)',
        transition: `opacity 0.55s ease ${d}s, transform 0.55s ease ${d}s`,
      }
const zoom = reduce ? {} : { transform: 'scale(1)', transition: 'transform 1.4s ease-out' }
</script>

<template>
  <section class="relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
    <div
      class="absolute inset-0 -z-20"
      :style="reduce ? undefined : { ...zoom, transform: on ? 'scale(1)' : 'scale(1.08)' }"
    >
      <Picture :name="image" :alt="alt" sizes="100vw" priority class="size-full object-cover" />
    </div>
    <div
      aria-hidden="true"
      class="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/75 to-ink/40"
    />
    <div aria-hidden="true" class="speed-lines absolute inset-0 -z-10 opacity-30" />
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <p
        :style="rise(0)"
        :class="[
          'mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase',
          accent === 'boxy' ? 'text-boxy-soft' : 'text-acid',
        ]"
      >
        <span
          :class="['h-px w-6', accent === 'boxy' ? 'bg-boxy-soft' : 'bg-acid']"
          aria-hidden="true"
        />
        {{ kicker }}
      </p>
      <h1
        :style="rise(0.06)"
        class="max-w-4xl font-display text-[clamp(2.8rem,8vw,6.5rem)] text-fg"
      >
        {{ title }}
      </h1>
      <p :style="rise(0.14)" class="measure mt-5 text-lg text-fg-muted">{{ lead }}</p>
      <div v-if="$slots.default" :style="rise(0.22)" class="mt-8"><slot /></div>
    </div>
  </section>
</template>
