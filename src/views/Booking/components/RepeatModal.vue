<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Repeat, AlertTriangle, Loader2, Check } from 'lucide-vue-next'
import type { RepeatMode, RepeatRule, SlotInterval } from '@/types'
import {
  findRepeatConflicts,
  computeOccurrences,
  dayFullLabel,
  REPEAT_MODE_LABEL,
  type RepeatConflict,
} from '@/services/booking'
import { useBookingStore } from '@/stores/booking'

const props = defineProps<{
  open: boolean
  interval: SlotInterval | null
  anchor: { x: number; y: number }
}>()
const emit = defineEmits<{ close: [] }>()

const store = useBookingStore()

const MODES: RepeatMode[] = ['none', 'daily', 'weekly', 'monthly']

const mode = ref<RepeatMode>('none')
const until = ref('') // 'yyyy-mm-dd'
const checking = ref(false)
const conflicts = ref<RepeatConflict[] | null>(null) // null = форма, [] невозможно (см. ниже)

// Дата старта + 27 дней — дефолтный горизонт (совпадает с HORIZON_DAYS сетки).
function defaultUntil(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dd = new Date(y, m - 1, d)
  dd.setDate(dd.getDate() + 27)
  const yy = dd.getFullYear()
  const mm = String(dd.getMonth() + 1).padStart(2, '0')
  const day = String(dd.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${day}`
}

// При открытии — префилл из существующего правила или дефолты.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen || !props.interval) return
    conflicts.value = null
    checking.value = false
    const existing = store.ruleFor(props.interval.id)
    mode.value = existing?.mode ?? 'none'
    until.value = existing?.until ?? defaultUntil(props.interval.date)
  },
  { immediate: true },
)

const occurrenceCount = computed(() => {
  if (!props.interval || mode.value === 'none') return 1
  return computeOccurrences(props.interval.date, until.value, mode.value).length
})

// Позиция поповера: рядом с курсором, но в пределах вьюпорта.
const style = computed(() => {
  const W = 300
  const H = 360
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.max(8, Math.min(props.anchor.x + 12, vw - W - 8))
  const top = Math.max(8, Math.min(props.anchor.y + 12, vh - H - 8))
  return { left: `${left}px`, top: `${top}px` }
})

async function confirm() {
  const interval = props.interval
  if (!interval) return

  if (mode.value === 'none') {
    store.removeRepeatRule(interval.id)
    emit('close')
    return
  }

  const rule: RepeatRule = {
    id: interval.id,
    fieldId: interval.fieldId,
    date: interval.date,
    start: interval.start,
    end: interval.end,
    mode: mode.value,
    until: until.value,
  }

  checking.value = true
  const found = await findRepeatConflicts(interval.fieldId, rule)
  checking.value = false

  if (found.length) {
    // Пересечения — предупреждаем, правило не добавляем, выбор не трогаем.
    conflicts.value = found
    return
  }

  store.addRepeatRule(rule)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <template v-if="open && interval">
      <!-- Клик вне поповера закрывает его -->
      <div class="fixed inset-0 z-[998]" @click="emit('close')" @contextmenu.prevent="emit('close')" />

      <div
        class="fixed z-[999] w-[300px] rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        :style="style"
        @click.stop
        @contextmenu.prevent.stop
      >
        <!-- Warning state -->
        <template v-if="conflicts && conflicts.length">
          <div class="flex items-start gap-2">
            <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-error-500" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white/90">
                Пересечение с бронями
              </p>
              <p class="mt-0.5 text-xs text-gray-500">
                Интервал {{ interval.start }}–{{ interval.end }} занят в эти даты:
              </p>
            </div>
          </div>
          <ul class="mt-3 max-h-40 space-y-1 overflow-auto">
            <li
              v-for="c in conflicts"
              :key="c.date + c.booking.id"
              class="flex items-center justify-between gap-2 rounded-lg bg-error-50 px-2.5 py-1.5 text-xs dark:bg-error-500/10"
            >
              <span class="font-medium text-gray-800 dark:text-gray-200">{{ dayFullLabel(c.date) }}</span>
              <span class="truncate text-gray-500">{{ c.booking.start }}–{{ c.booking.end }}</span>
            </li>
          </ul>
          <button
            type="button"
            class="mt-4 w-full rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            @click="emit('close')"
          >
            Понятно
          </button>
        </template>

        <!-- Form state -->
        <template v-else>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <Repeat class="h-4 w-4 text-success-600" aria-hidden="true" />
              <h3 class="text-sm font-bold text-gray-900 dark:text-white/90">Повтор интервала</h3>
            </div>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="Закрыть"
              @click="emit('close')"
            >
              <X class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <dl class="mt-3 space-y-1.5 text-xs">
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">Время</dt>
              <dd class="font-medium text-gray-800 dark:text-gray-200">
                {{ interval.start }}–{{ interval.end }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-gray-500">Начало</dt>
              <dd class="font-medium text-gray-800 dark:text-gray-200">
                {{ dayFullLabel(interval.date) }}
              </dd>
            </div>
          </dl>

          <label class="mt-3 block text-[11px] font-semibold uppercase text-gray-500">Режим</label>
          <select
            v-model="mode"
            class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option v-for="m in MODES" :key="m" :value="m">{{ REPEAT_MODE_LABEL[m] }}</option>
          </select>

          <template v-if="mode !== 'none'">
            <label
              for="repeat-until"
              class="mt-3 block text-[11px] font-semibold uppercase text-gray-500"
              >Повторять до</label
            >
            <input
              id="repeat-until"
              v-model="until"
              type="date"
              :min="interval.date"
              class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <p class="mt-2 text-xs text-gray-500">
              {{ occurrenceCount }} {{ occurrenceCount === 1 ? 'вхождение' : 'вхождений' }}
            </p>
          </template>

          <div class="mt-4 flex items-center gap-2">
            <button
              type="button"
              class="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="emit('close')"
            >
              Отмена
            </button>
            <button
              type="button"
              :disabled="checking"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              @click="confirm"
            >
              <Loader2 v-if="checking" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <template v-else><Check class="h-4 w-4" aria-hidden="true" /> Готово</template>
            </button>
          </div>
        </template>
      </div>
    </template>
  </Teleport>
</template>
