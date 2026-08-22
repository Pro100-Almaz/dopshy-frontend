<script setup lang="ts">
/**
 * Контакт родителя: номер, быстрый переход в WhatsApp и передача диалога
 * менеджеру (ТЗ §2.8). Действия видны всегда — hover-only функциональность
 * недоступна с клавиатуры и с тача.
 */
import { computed } from 'vue'
import { Bot, LoaderCircle, MessageCircle } from 'lucide-vue-next'

import { formatPhone, phoneDigits } from '@/services/academy'
import type { HandoffState } from '@/composables/useBotHandoff'
import StatusPill from './StatusPill.vue'

const props = withDefaults(
  defineProps<{
    phone: string
    language?: string | null
    /** null — статус бота неизвестен (сервис не ответил) → кнопку не показываем. */
    handoff?: HandoffState | null
    handoffPending?: boolean
  }>(),
  { language: null, handoff: null, handoffPending: false },
)

const emit = defineEmits<{ handoff: [] }>()

const digits = computed(() => phoneDigits(props.phone))
const pretty = computed(() => formatPhone(props.phone))
const paused = computed(() => props.handoff?.paused === true)

const iconAction =
  'focus-ring inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-center gap-1">
      <a
        v-if="digits"
        :href="`tel:+${digits}`"
        class="focus-ring whitespace-nowrap rounded text-theme-sm tabular-nums text-gray-900 hover:text-pitch-700 dark:text-gray-200 dark:hover:text-pitch-400"
      >
        {{ pretty }}
      </a>
      <span v-else class="text-theme-sm text-gray-500 dark:text-gray-400">—</span>

      <a
        v-if="digits"
        :href="`https://wa.me/${digits}`"
        target="_blank"
        rel="noopener noreferrer"
        :class="iconAction"
        :title="`Открыть переписку в WhatsApp: ${pretty}`"
      >
        <MessageCircle class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="sr-only">Открыть WhatsApp</span>
      </a>

      <button
        v-if="handoff"
        type="button"
        :class="[iconAction, paused ? 'text-warning-600 dark:text-warning-400' : '']"
        :disabled="handoffPending"
        :title="
          paused
            ? 'Бот на паузе — вернуть ведение диалога боту'
            : 'Взять диалог на себя: бот перестанет отвечать этому родителю'
        "
        @click="emit('handoff')"
      >
        <LoaderCircle
          v-if="handoffPending"
          class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <Bot v-else class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="sr-only">{{ paused ? 'Вернуть боту' : 'Взять диалог на себя' }}</span>
      </button>
    </div>

    <div class="mt-1 flex flex-wrap items-center gap-1.5">
      <span v-if="language" class="text-theme-xs text-gray-600 dark:text-gray-400">
        Язык: {{ language }}
      </span>
      <StatusPill v-if="paused" tone="warning">
        {{ handoff?.reason === 'auto' ? 'Менеджер уже ответил' : 'Диалог у менеджера' }}
      </StatusPill>
    </div>
  </div>
</template>
