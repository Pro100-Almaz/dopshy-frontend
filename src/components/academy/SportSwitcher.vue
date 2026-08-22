<script setup lang="ts">
/**
 * Переключатель направления (футбол / бокс).
 *
 * Ссылки, а не кнопки: направление живёт в URL, поэтому экран можно
 * отправить коллеге, открыть в новой вкладке и вернуть кнопкой «назад».
 * Активная ссылка помечена `aria-current`, а выбор запоминается в стор —
 * по нему сайдбар строит свои ссылки.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { SPORT_KEYS, SPORTS, type SportKey } from '@/services/academy'
import { useAcademyStore } from '@/stores/academy'

const props = defineProps<{ sport: SportKey }>()

const route = useRoute()
const academy = useAcademyStore()

/** Тот же экран, другое направление: /football/trials → /boxing/trials. */
const links = computed(() =>
  SPORT_KEYS.map((key) => ({
    key,
    label: SPORTS[key].label,
    to: route.path.replace(`/${props.sport}`, `/${key}`),
    active: key === props.sport,
  })),
)
</script>

<template>
  <nav
    class="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
    aria-label="Направление академии"
  >
    <router-link
      v-for="link in links"
      :key="link.key"
      :to="link.to"
      :aria-current="link.active ? 'page' : undefined"
      class="focus-ring rounded-lg px-3.5 py-1.5 text-theme-sm font-semibold transition-colors duration-150"
      :class="
        link.active
          ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
      "
      @click="academy.setSport(link.key)"
    >
      {{ link.label }}
    </router-link>
  </nav>
</template>
