<script setup lang="ts">
/**
 * Отметка посещения пробного (ТЗ §2.3).
 *
 * Это не галочка: именно с этой отметки бот отправляет родителю сообщение, и
 * текст зависит от выбора. Поэтому — два явных действия вместо одного
 * чекбокса (у чекбокса «не пришёл» и «ещё не смотрели» выглядят одинаково), а
 * в подсказке видно, что уйдёт в WhatsApp.
 */
import { computed } from 'vue'
import { Check, LoaderCircle, X } from 'lucide-vue-next'

import type { AcademyTrial } from '@/services/academy'
import { botMessagePreview, type TrialOutcome } from '@/utils/trialOutcome'

const props = defineProps<{
  trial: AcademyTrial
  outcome: TrialOutcome
  saving?: boolean
}>()

const emit = defineEmits<{ mark: [attended: boolean] }>()

const attendedPreview = computed(() => botMessagePreview(props.trial, 'attended'))
const missedPreview = computed(() => botMessagePreview(props.trial, 'missed'))

const isAttended = computed(() => props.outcome === 'attended' || props.outcome === 'subscribed')
const isMissed = computed(() => props.outcome === 'missed')
/** Абонемент уже оформлен — переотмечать посещение незачем. */
const locked = computed(() => props.outcome === 'subscribed')

const segment =
  'focus-ring-inset relative inline-flex h-8 items-center gap-1 whitespace-nowrap px-2.5 text-theme-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60'
</script>

<template>
  <div
    class="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700"
    role="group"
    :aria-label="`Отметка посещения: ${trial.child_name}`"
  >
    <button
      type="button"
      :class="[
        segment,
        isAttended
          ? 'bg-pitch-600 text-white hover:bg-pitch-700'
          : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.06]',
      ]"
      :aria-pressed="isAttended"
      :disabled="saving || locked"
      :title="`Бот отправит родителю (${attendedPreview.language}): «${attendedPreview.text}»`"
      @click="emit('mark', true)"
    >
      <LoaderCircle
        v-if="saving && !isAttended"
        class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <Check v-else class="h-3.5 w-3.5" aria-hidden="true" />
      Пришёл
    </button>

    <span class="w-px bg-gray-300 dark:bg-gray-700" aria-hidden="true"></span>

    <button
      type="button"
      :class="[
        segment,
        isMissed
          ? 'bg-error-600 text-white hover:bg-error-700'
          : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.06]',
      ]"
      :aria-pressed="isMissed"
      :disabled="saving || locked"
      :title="`Бот отправит родителю (${missedPreview.language}): «${missedPreview.text}»`"
      @click="emit('mark', false)"
    >
      <LoaderCircle
        v-if="saving && !isMissed"
        class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <X v-else class="h-3.5 w-3.5" aria-hidden="true" />
      Не пришёл
    </button>
  </div>
</template>
