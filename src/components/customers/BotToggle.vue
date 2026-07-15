<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'

import type { BotStatus, PausedReason } from '@/types'
import { pauseBot, resumeBot } from '@/services/customer'

const props = defineProps<{
  phone: string
  paused: boolean
  pausedReason: PausedReason
}>()

const emit = defineEmits<{
  // Сообщаем родителю подтверждённый бэкендом статус.
  change: [status: BotStatus]
  error: [message: string]
}>()

const pending = ref(false)
// Локальное зеркало для оптимистичного апдейта; синхронизируется с пропсом.
const on = ref(!props.paused)
watch(
  () => props.paused,
  (v) => {
    on.value = !v
  },
)

const label = computed(() => (on.value ? 'Вкл' : 'Выкл'))

async function toggle() {
  if (pending.value) return
  const previous = on.value
  const next = !previous
  // Оптимистично переключаем, откатываем при ошибке.
  on.value = next
  pending.value = true
  try {
    // next === true → бот активен → resume; next === false → пауза → pause.
    const status = next ? await resumeBot(props.phone) : await pauseBot(props.phone)
    on.value = !status.paused
    emit('change', status)
  } catch (e) {
    on.value = previous
    emit('error', e instanceof Error ? e.message : 'Не удалось изменить статус бота')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-3">
    <button
      type="button"
      role="switch"
      :aria-checked="on"
      :aria-label="`Бот ${label}`"
      :disabled="pending"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:opacity-60"
      :class="on ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-700'"
      @click="toggle"
    >
      <span
        class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-theme-xs transition-transform"
        :class="on ? 'translate-x-5' : 'translate-x-0.5'"
      >
        <Loader2 v-if="pending" class="h-3 w-3 animate-spin text-gray-500" />
      </span>
    </button>

    <div class="flex flex-col">
      <span class="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        Бот {{ label }}
      </span>
      <!-- Систему поставила на паузу автоматически — поясняем менеджеру. -->
      <span
        v-if="props.paused && props.pausedReason === 'auto'"
        class="mt-0.5 inline-flex w-fit items-center rounded-full bg-warning-50 px-2 py-0.5 text-theme-xs font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
      >
        Авто-пауза — менеджер ответил в WhatsApp
      </span>
    </div>
  </div>
</template>
