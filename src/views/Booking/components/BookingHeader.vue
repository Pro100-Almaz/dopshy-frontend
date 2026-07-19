<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Dribbble, ChevronLeft } from 'lucide-vue-next'

defineProps<{
  back?: { to: string; label: string }
}>()
</script>

<template>
  <!-- Непрозрачный фон без backdrop-filter: на iOS Safari sticky-элемент с
       backdrop-filter «отклеивается» и уезжает вместе со страницей. -->
  <header
    class="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-theme-sm"
    style="font-family: Outfit, sans-serif"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-4">
        <RouterLink
          v-if="back"
          :to="back.to"
          class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          <span class="hidden sm:inline">{{ back.label }}</span>
        </RouterLink>

        <RouterLink to="/" class="flex items-center gap-2" aria-label="Dopsy Arena — на главную">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-success-600">
            <Dribbble class="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span class="font-bebas text-2xl tracking-wider text-gray-900">
            DOPSY <span class="text-success-600">ARENA</span>
          </span>
        </RouterLink>
      </div>

      <RouterLink
        to="/login"
        class="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
      >
        Войти
      </RouterLink>
    </div>
  </header>
</template>
