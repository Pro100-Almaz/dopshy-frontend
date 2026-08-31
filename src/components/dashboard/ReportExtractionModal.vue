<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-gray-900/45 px-4 py-6 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <button
            v-if="step === 'dates'"
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Назад"
            @click="back"
          >
            <ArrowLeft class="h-5 w-5" aria-hidden="true" />
          </button>
          <div v-else class="h-9 w-9" />

          <h2 class="text-base font-bold text-gray-900 dark:text-white">
            {{ title }}
          </h2>

          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Закрыть"
            @click="close"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div class="relative min-h-[20rem] overflow-hidden">
          <Transition :name="transitionName" mode="out-in">
            <section v-if="step === 'type'" key="type" class="p-5 sm:p-6">
              <div class="grid gap-3 sm:grid-cols-3">
                <button
                  v-for="option in reportOptions"
                  :key="option.value"
                  type="button"
                  :disabled="!option.supported"
                  class="group flex min-h-44 flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500 dark:border-gray-800 dark:bg-gray-900"
                  :class="
                    option.supported
                      ? 'hover:border-success-400 hover:bg-success-50 dark:hover:border-success-500/50 dark:hover:bg-success-500/10'
                      : 'cursor-not-allowed opacity-50'
                  "
                  @click="selectType(option.value)"
                >
                  <div class="grid h-16 w-16 place-items-center rounded-xl bg-gray-100 text-gray-600 transition-colors group-hover:bg-success-600 group-hover:text-white dark:bg-gray-800 dark:text-gray-300">
                    <component :is="option.icon" class="h-8 w-8" :stroke-width="1.75" />
                  </div>
                  <span class="text-sm font-bold text-gray-900 dark:text-white">
                    {{ option.label }}
                  </span>
                </button>
              </div>
            </section>

            <section v-else-if="step === 'dates'" key="dates" class="p-5 sm:p-6">
              <div class="mb-5 flex items-center gap-3">
                <div class="grid h-12 w-12 place-items-center rounded-xl bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400">
                  <component :is="selectedOption?.icon" class="h-6 w-6" :stroke-width="1.75" />
                </div>
                <div>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ selectedOption?.label }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">PDF report</p>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-1.5 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Start date
                  </span>
                  <input
                    v-model="startDate"
                    type="date"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/20 dark:border-gray-700 dark:text-white"
                  />
                </label>
                <label class="block">
                  <span class="mb-1.5 block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    End date
                  </span>
                  <input
                    v-model="endDate"
                    type="date"
                    :min="startDate"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/20 dark:border-gray-700 dark:text-white"
                  />
                </label>
              </div>

              <p v-if="error" class="mt-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300">
                {{ error }}
              </p>

              <div class="mt-6 flex justify-end">
                <button
                  type="button"
                  :disabled="generating"
                  class="inline-flex items-center justify-center gap-2 rounded-full bg-success-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  @click="generate"
                >
                  <Loader2 v-if="generating" class="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generate
                </button>
              </div>
            </section>

            <section v-else key="ready" class="flex min-h-[20rem] flex-col items-center justify-center p-6 text-center">
              <div class="grid h-16 w-16 place-items-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/10">
                <CheckCircle2 class="h-9 w-9" aria-hidden="true" />
              </div>
              <h3 class="mt-4 text-lg font-bold text-gray-900 dark:text-white">Report is ready</h3>
              <p class="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                {{ readyFilename }} has been generated and downloaded.
              </p>
            </section>
          </Transition>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ArrowLeft, Building2, CheckCircle2, Dumbbell, Goal, Loader2, X } from 'lucide-vue-next'
import {
  generateDocumentReport,
  type DocumentBotType,
  type DocumentExtractPayload,
} from '@/services/documents'

const emit = defineEmits<{ close: [] }>()

type Step = 'type' | 'dates' | 'ready'

const reportOptions = [
  { value: 'arena', label: 'Arena report', icon: Building2, supported: true },
  { value: 'fs_academy', label: 'FS academy report', icon: Goal, supported: false },
  { value: 'box_academy', label: 'Boxing academy report', icon: Dumbbell, supported: false },
] satisfies { value: DocumentBotType; label: string; icon: unknown; supported: boolean }[]

const step = ref<Step>('type')
const selectedType = ref<DocumentBotType | null>(null)
const startDate = ref(monthStart())
const endDate = ref(todayISO())
const generating = ref(false)
const error = ref('')
const readyFilename = ref('')
const direction = ref<'forward' | 'back'>('forward')
let closeTimer: ReturnType<typeof setTimeout> | null = null

const selectedOption = computed(() => reportOptions.find((option) => option.value === selectedType.value))
const title = computed(() => {
  if (step.value === 'type') return 'Generate report'
  if (step.value === 'dates') return 'Choose period'
  return 'Ready'
})
const transitionName = computed(() => (direction.value === 'forward' ? 'report-slide' : 'report-slide-back'))

function todayISO(): string {
  return toLocalISO(new Date())
}

function monthStart(): string {
  const date = new Date()
  date.setDate(1)
  return toLocalISO(date)
}

function toLocalISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function selectType(type: DocumentBotType) {
  const option = reportOptions.find((item) => item.value === type)
  if (!option?.supported) return
  selectedType.value = type
  error.value = ''
  direction.value = 'forward'
  step.value = 'dates'
}

function back() {
  error.value = ''
  direction.value = 'back'
  step.value = 'type'
}

function validate(): string {
  if (!selectedType.value) return 'Choose report type.'
  if (!startDate.value || !endDate.value) return 'Choose start and end dates.'
  if (endDate.value < startDate.value) return 'End date cannot be earlier than start date.'
  const start = new Date(`${startDate.value}T00:00:00Z`)
  const end = new Date(`${endDate.value}T00:00:00Z`)
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
  if (days > 366) return 'Period cannot exceed 366 days.'
  return ''
}

async function generate() {
  const message = validate()
  if (message) {
    error.value = message
    return
  }

  generating.value = true
  error.value = ''
  try {
    const payload: DocumentExtractPayload = {
      bot_type: selectedType.value!,
      start_date: startDate.value,
      end_date: endDate.value,
    }
    readyFilename.value = await generateDocumentReport(payload)
    direction.value = 'forward'
    step.value = 'ready'
    closeTimer = setTimeout(close, 5000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to generate report.'
  } finally {
    generating.value = false
  }
}

function close() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  emit('close')
}

onUnmounted(() => {
  if (closeTimer) clearTimeout(closeTimer)
})
</script>

<style scoped>
.report-slide-enter-active,
.report-slide-leave-active,
.report-slide-back-enter-active,
.report-slide-back-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.report-slide-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}

.report-slide-leave-to {
  opacity: 0;
  transform: translateX(-2rem);
}

.report-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-2rem);
}

.report-slide-back-leave-to {
  opacity: 0;
  transform: translateX(2rem);
}
</style>
