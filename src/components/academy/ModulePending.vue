<script setup lang="ts">
/**
 * Состояние «интерфейс готов, ручки нет».
 *
 * Показывать пустую таблицу как рабочую — обман: менеджер решит, что платежей
 * действительно нет. Здесь прямо сказано, чего не хватает, и перечислен
 * контракт, который экран уже умеет читать, — чтобы бэкенду не пришлось
 * угадывать формат.
 */
import { Cable, Copy, RefreshCw } from 'lucide-vue-next'
import { ref } from 'vue'

import { buttonPrimary, buttonSecondary, buttonSize, panel } from './ui'

const props = defineProps<{
  title: string
  description: string
  /** Список ожидаемых ручек: метод + путь + что вернуть. */
  endpoints: { method: string; path: string; returns: string }[]
}>()

const emit = defineEmits<{ retry: [] }>()

const copied = ref(false)

async function copyContract() {
  const text = props.endpoints
    .map((endpoint) => `${endpoint.method} ${endpoint.path} — ${endpoint.returns}`)
    .join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Буфер обмена недоступен (нет разрешения / не https) — список и так виден.
  }
}
</script>

<template>
  <section :class="[panel, 'px-5 py-6 sm:px-6']">
    <div class="flex items-start gap-4">
      <span
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
      >
        <Cable class="h-5 w-5" aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
        <p class="mt-1 max-w-2xl text-theme-sm text-gray-700 dark:text-gray-300">
          {{ description }}
        </p>
      </div>
    </div>

    <div class="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <p
        class="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-theme-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300"
      >
        Что экран уже умеет читать
      </p>
      <ul class="divide-y divide-gray-100 dark:divide-gray-800/70">
        <li
          v-for="endpoint in endpoints"
          :key="`${endpoint.method} ${endpoint.path}`"
          class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3"
        >
          <code
            class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs font-semibold text-gray-800 dark:bg-white/[0.07] dark:text-gray-200"
          >
            {{ endpoint.method }} {{ endpoint.path }}
          </code>
          <span class="text-theme-xs text-gray-700 dark:text-gray-400">{{ endpoint.returns }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-5 flex flex-wrap gap-2">
      <button type="button" :class="[buttonPrimary, buttonSize.sm]" @click="emit('retry')">
        <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
        Проверить снова
      </button>
      <button type="button" :class="[buttonSecondary, buttonSize.sm]" @click="copyContract">
        <Copy class="h-3.5 w-3.5" aria-hidden="true" />
        {{ copied ? 'Скопировано' : 'Скопировать контракт' }}
      </button>
    </div>
  </section>
</template>
