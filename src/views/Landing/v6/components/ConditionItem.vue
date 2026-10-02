<script setup lang="ts">
import type { Component } from 'vue'
import { Clock, Coffee, Flame, Lightbulb, ParkingSquare, ShowerHead, Sprout } from 'lucide-vue-next'
import { useLang } from '../i18n'

export type Key = 'turf' | 'light' | 'heat' | 'lockers' | 'store' | 'parking' | 'open'

const ICON: Record<Key, Component> = {
  turf: Sprout,
  light: Lightbulb,
  heat: Flame,
  lockers: ShowerHead,
  store: Coffee,
  parking: ParkingSquare,
  open: Clock,
}

defineProps<{ k: Key }>()

const { t } = useLang()
</script>

<template>
  <div
    class="flex h-full gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-2"
  >
    <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-acid/10 text-acid">
      <component :is="ICON[k]" class="size-5" aria-hidden="true" :stroke-width="1.8" />
    </span>
    <div>
      <h3 class="font-display text-xl text-fg">{{ t.conditions.items[k].title }}</h3>
      <p class="mt-1 text-sm text-fg-muted">{{ t.conditions.items[k].text }}</p>
    </div>
  </div>
</template>
