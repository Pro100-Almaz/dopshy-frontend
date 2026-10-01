<script setup lang="ts">
import { useLang } from '../i18n'
import LogoMark from './LogoMark.vue'

withDefaults(defineProps<{ tone?: 'acid' | 'dark' }>(), { tone: 'acid' })

const { t } = useLang()
</script>

<template>
  <div
    :class="[
      'marquee overflow-hidden',
      tone === 'acid' ? '-rotate-1 bg-acid text-acid-ink' : 'border-y border-line bg-ink-2 text-fg',
    ]"
  >
    <div class="marquee-track">
      <ul
        v-for="hidden in [false, true]"
        :key="String(hidden)"
        class="flex shrink-0 items-center"
        :aria-hidden="hidden || undefined"
      >
        <li v-for="text in t.marquee" :key="text" class="flex items-center">
          <span
            class="px-6 py-3.5 font-display text-xl tracking-wide whitespace-nowrap sm:text-2xl"
          >
            {{ text }}
          </span>
          <LogoMark class="h-4 w-auto opacity-70" />
        </li>
      </ul>
    </div>
  </div>
</template>
