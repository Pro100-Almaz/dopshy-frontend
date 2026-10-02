<script setup lang="ts">
import Reveal from './Reveal.vue'

withDefaults(
  defineProps<{ items: { value: string; label: string }[]; accent?: 'acid' | 'boxy' }>(),
  { accent: 'acid' },
)
</script>

<template>
  <div class="mx-auto -mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
    <dl
      class="grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line lg:grid-cols-4"
    >
      <Reveal
        v-for="(f, i) in items"
        :key="f.label"
        :delay="i * 0.05"
        class="bg-surface p-5 sm:p-7"
      >
        <dt class="sr-only">{{ f.label }}</dt>
        <dd>
          <span
            :class="[
              'block font-display text-4xl sm:text-5xl',
              accent === 'boxy' ? 'text-boxy-soft' : 'text-acid',
            ]"
          >
            {{ f.value }}
          </span>
          <span class="mt-1 block text-sm text-fg-muted">{{ f.label }}</span>
        </dd>
      </Reveal>
    </dl>
  </div>
</template>
