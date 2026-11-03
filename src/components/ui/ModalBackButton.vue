<template>
  <!-- «Назад» для модалки, открытой поверх другой: закрывает только её и возвращает к предыдущей. -->
  <button
    type="button"
    class="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
    aria-label="Назад"
    @click="$emit('back')"
  >
    <ArrowLeft class="h-5 w-5" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

defineEmits<{ back: [] }>()
</script>
