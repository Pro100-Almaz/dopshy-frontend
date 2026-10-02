<script setup lang="ts">
import Reveal from './Reveal.vue'

withDefaults(
  defineProps<{ kicker?: string; title?: string; lead?: string; tone?: 'ink' | 'ink2' }>(),
  { tone: 'ink' },
)
</script>

<template>
  <section :class="['scroll-mt-20 py-20 sm:py-28', tone === 'ink2' ? 'bg-ink-2' : 'bg-ink']">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Reveal v-if="title || kicker">
        <header
          class="mb-10 flex flex-col gap-6 sm:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              v-if="kicker"
              class="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-acid uppercase"
            >
              <span class="h-px w-6 bg-acid" aria-hidden="true" />
              {{ kicker }}
            </p>
            <h2 v-if="title" class="font-display text-[clamp(2.1rem,5vw,3.6rem)] text-fg">
              {{ title }}
            </h2>
            <p v-if="lead" class="measure mt-4 text-base text-fg-muted sm:text-lg">{{ lead }}</p>
          </div>
          <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
        </header>
      </Reveal>
      <slot />
    </div>
  </section>
</template>
