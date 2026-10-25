<script setup lang="ts">
import { computed } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import type { PaymentFrequency, PlanDraft } from '@/services/contracts'
import { PAYMENT_FREQUENCY_LABEL } from '@/services/contracts'

const draft = defineModel<PlanDraft>({ required: true })

const props = withDefaults(
  defineProps<{
    startDate: string
    endDate: string
    allowNone?: boolean
  }>(),
  { allowNone: true },
)

const MODES = computed(() => [
  ...(props.allowNone
    ? [
        {
          value: 'none' as const,
          title: 'Без онлайн-оплаты',
          hint: 'Как раньше: оплату ведёт менеджер вручную',
        },
      ]
    : []),
  {
    value: 'static' as const,
    title: 'По графику',
    hint: 'Фиксированное число платежей в заданные даты',
  },
  {
    value: 'dynamic' as const,
    title: 'За каждую бронь',
    hint: 'Один платёж на бронь, выставляется после игры',
  },
])

const FREQUENCIES = Object.entries(PAYMENT_FREQUENCY_LABEL) as [PaymentFrequency, string][]

function addDate() {
  const dates = draft.value.due_dates
  draft.value.due_dates = [...dates, dates[dates.length - 1] || props.startDate]
}

function removeDate(index: number) {
  draft.value.due_dates = draft.value.due_dates.filter((_, i) => i !== index)
}

function setDate(index: number, value: string) {
  draft.value.due_dates = draft.value.due_dates.map((d, i) => (i === index ? value : d))
}

function setSchedule(schedule: PlanDraft['schedule']) {
  draft.value.schedule = schedule
  if (schedule === 'dates' && !draft.value.due_dates.length) {
    draft.value.due_dates = [props.startDate]
  }
}
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-2" :class="MODES.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
      <button
        v-for="m in MODES"
        :key="m.value"
        type="button"
        class="rounded-xl border px-4 py-3 text-left transition-colors"
        :class="
          draft.mode === m.value
            ? 'border-success-600 bg-success-50 ring-1 ring-success-600'
            : 'border-gray-200 hover:bg-gray-50'
        "
        :aria-pressed="draft.mode === m.value"
        @click="draft.mode = m.value"
      >
        <span class="block text-sm font-semibold text-gray-900">{{ m.title }}</span>
        <span class="mt-0.5 block text-xs text-gray-500">{{ m.hint }}</span>
      </button>
    </div>

    <template v-if="draft.mode === 'static'">
      <div class="inline-flex w-fit rounded-lg bg-gray-100 p-1 text-sm">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 font-medium"
          :class="
            draft.schedule === 'frequency' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          "
          @click="setSchedule('frequency')"
        >
          С периодичностью
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 font-medium"
          :class="draft.schedule === 'dates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          @click="setSchedule('dates')"
        >
          Свои даты
        </button>
      </div>

      <div v-if="draft.schedule === 'frequency'" class="grid gap-4 sm:grid-cols-3">
        <label class="grid gap-1.5 text-sm font-medium text-gray-700">
          Периодичность
          <select v-model="draft.frequency" class="contract-input">
            <option v-for="[value, label] in FREQUENCIES" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-gray-700">
          Количество платежей
          <input
            v-model="draft.installments"
            type="number"
            min="1"
            max="120"
            step="1"
            placeholder="До окончания договора"
            class="contract-input"
          />
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-gray-700">
          Первый платёж
          <input
            v-model="draft.first_due_date"
            type="date"
            :min="startDate"
            :max="endDate"
            class="contract-input"
          />
          <span class="text-xs font-normal text-gray-500"> Пусто — с даты начала договора </span>
        </label>
      </div>

      <div v-else class="grid gap-2">
        <p class="text-sm font-medium text-gray-700">Даты платежей</p>
        <div v-for="(date, index) in draft.due_dates" :key="index" class="flex items-center gap-2">
          <span class="w-6 text-right text-sm text-gray-500">{{ index + 1 }}.</span>
          <input
            :value="date"
            type="date"
            :min="startDate"
            :max="endDate"
            class="contract-input max-w-xs"
            @input="setDate(index, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Удалить дату"
            @click="removeDate(index)"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          class="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-success-700 hover:underline"
          @click="addDate"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          Добавить дату
        </button>
      </div>

      <p class="text-xs text-gray-500">
        Каждый платёж отправляется в 13:00 по Алматы в свою дату. Суммы по умолчанию делятся
        поровну, остаток — на последний платёж.
      </p>
    </template>

    <p v-else-if="draft.mode === 'dynamic'" class="text-sm text-gray-600">
      Платёж создаётся на каждую бронь договора и отправляется, когда бронь заканчивается. Сумма
      считается в момент отправки: остаток по договору делится на ещё не отправленные платежи.
    </p>
  </div>
</template>
