<script setup lang="ts">
/**
 * Шапка экрана академии: что за экран, какое направление, какие действия.
 * Заменяет хлебные крошки шаблона («Home ›») — на рабочих экранах полезнее
 * видеть направление и действия, чем путь из двух звеньев.
 */
import { watchEffect } from 'vue'

import { SPORTS, type SportKey } from '@/services/academy'
import { useAcademyStore } from '@/stores/academy'
import SportSwitcher from './SportSwitcher.vue'

const props = defineProps<{
  sport: SportKey
  title: string
  subtitle?: string
}>()

const academy = useAcademyStore()

// Открыли /boxing/trials по прямой ссылке — направление становится активным,
// чтобы сайдбар вёл в бокс, а не в футбол.
watchEffect(() => academy.setSport(props.sport))
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div class="min-w-0">
      <p class="text-theme-xs font-semibold text-pitch-700 dark:text-pitch-400">
        {{ SPORTS[sport].title }}
      </p>
      <h1 class="mt-1 text-2xl font-bold text-balance text-gray-900 dark:text-white">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-1 max-w-2xl text-theme-sm text-gray-600 dark:text-gray-400">
        {{ subtitle }}
      </p>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-3">
      <slot name="actions" />
      <SportSwitcher :sport="sport" />
    </div>
  </header>
</template>
