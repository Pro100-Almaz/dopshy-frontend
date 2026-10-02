<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SearchCheck,
  X,
} from 'lucide-vue-next'

import WeekGrid from '@/views/Booking/components/WeekGrid.vue'
import PlanScheduleFields from './PlanScheduleFields.vue'
import PlanPayerFields from './PlanPayerFields.vue'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'
import type {
  CheckSlotsResult,
  CreateContractResult,
  PlanDraft,
  PlanPreview,
  SlotConflict,
} from '@/services/contracts'
import {
  buildPaymentPlan,
  checkContractSlots,
  contractErrorCode,
  contractErrorConflicts,
  contractErrorMessage,
  createContract,
  emptyPlanDraft,
  planScheduleError,
  previewPaymentPlan,
  toContractSlots,
} from '@/services/contracts'
import {
  dayFullLabel,
  formatDateTime,
  formatPrice,
  getManagerWeek,
  toISO,
  type WeekSlots,
} from '@/services/booking'
import type { Field } from '@/types'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  fields: Field[]
}>()

const emit = defineEmits<{
  created: [result: CreateContractResult]
}>()

const auth = useAuthStore()
const bookingStore = useBookingStore()

type Step = 1 | 2 | 3 | 4 | 5
const STEPS: { step: Step; label: string; hint: string }[] = [
  { step: 1, label: 'Клиент', hint: 'Клиент и контакты' },
  { step: 2, label: 'Период', hint: 'Срок действия договора' },
  { step: 3, label: 'Оплата', hint: 'Как клиент будет платить' },
  { step: 4, label: 'Время', hint: 'Брони договора' },
  { step: 5, label: 'Сумма', hint: 'Сумма и плательщик' },
]

const step = ref<Step>(1)
const touched = ref(false)

const form = reactive({
  customer_name: '',
  phone: '',
  notes: '',
  start_date: '',
  end_date: '',
  price: '',
})
const plan = ref<PlanDraft>(emptyPlanDraft())

const saving = ref(false)
const submitError = ref('')
const submitCode = ref<string | undefined>()

function reset() {
  const today = toISO(new Date())
  Object.assign(form, {
    customer_name: '',
    phone: '',
    notes: '',
    start_date: today,
    end_date: '', // выбирается менеджером — от него зависит, какие недели доступны в сетке
    price: '',
  })
  plan.value = emptyPlanDraft()
  step.value = 1
  touched.value = false
  submitError.value = ''
  submitCode.value = undefined
  checkResult.value = null
  conflicts.value = []
  checkError.value = ''
  preview.value = null
  previewError.value = ''
  customAmounts.value = false
  amounts.value = []
  selectedFieldId.value = props.fields[0]?.id ?? ''
  bookingStore.clear()
}

const hasPlan = computed(() => plan.value.mode !== 'none')
const priceNumber = computed(() => Number(form.price))
const batchSlots = computed(() => toContractSlots(bookingStore.batchSlots))

// ── Ошибки по шагам ──────────────────────────────────
const stepErrors = computed<Record<Step, string>>(() => {
  const name = form.customer_name.trim()
  const price = priceNumber.value
  let priceError = ''
  if (form.price === '' || !Number.isFinite(price) || price < 1)
    priceError = 'Укажите сумму договора'
  else if (hasPlan.value && !Number.isInteger(price))
    priceError = 'При онлайн-оплате сумма — в целых тенге'
  else if (hasPlan.value && !plan.value.billing_phone.trim() && !form.phone.trim())
    priceError = 'Укажите телефон плательщика'
  else if (amountsError.value) priceError = amountsError.value

  return {
    1: !name
      ? 'Укажите клиента или компанию'
      : name.length > 100
        ? 'Название клиента — не длиннее 100 символов'
        : '',
    2: !form.start_date
      ? 'Укажите дату начала'
      : !form.end_date
        ? 'Укажите дату окончания'
        : form.end_date < form.start_date
          ? 'Дата окончания не может быть раньше начала'
          : '',
    3: planScheduleError(plan.value),
    4: !batchSlots.value.length
      ? 'Выберите хотя бы один слот для контракта'
      : slotsOutOfPeriod.value
        ? 'Часть слотов выходит за период договора — измените их или период'
        : '',
    5: priceError,
  }
})

const currentError = computed(() => stepErrors.value[step.value])

function goTo(target: Step) {
  // Вперёд — только через валидные шаги; назад — всегда.
  if (target > step.value) {
    for (let s = step.value; s < target; s++) {
      if (stepErrors.value[s as Step]) {
        step.value = s as Step
        touched.value = true
        return
      }
    }
  }
  touched.value = false
  step.value = target
  if (target === 4) enterGrid()
}

async function next() {
  touched.value = true
  if (currentError.value) return
  if (step.value === 4) {
    // Перед суммой убеждаемся, что слоты свободны (и знаем число броней).
    if (!checkResult.value) await runCheck()
    if (!checkResult.value?.free) return
  }
  if (step.value < 5) goTo((step.value + 1) as Step)
}

function back() {
  if (step.value > 1) goTo((step.value - 1) as Step)
}

// ── Шаг 4: сетка в пределах периода ───────────────────
const selectedFieldId = ref('')
const week = ref<WeekSlots>({ days: [], rows: [] })
const weekLoading = ref(false)
const pageOffset = ref(0)
const DAY_COUNT = 7

const selectedField = computed(
  () => props.fields.find((field) => field.id === selectedFieldId.value) ?? null,
)

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

const maxOffset = computed(() => {
  if (!form.start_date || !form.end_date) return 0
  const days = Math.round(
    (parseISO(form.end_date).getTime() - parseISO(form.start_date).getTime()) / 86_400_000,
  )
  return Math.max(0, Math.floor(days / DAY_COUNT))
})

const periodLabel = computed(() =>
  form.start_date && form.end_date
    ? `${dayFullLabel(form.start_date)} — ${dayFullLabel(form.end_date)}`
    : '',
)

const rangeLabel = computed(() => {
  const days = week.value.days
  if (!days.length) return ''
  const first = days[0].label
  const last = days[days.length - 1].label
  return first.month === last.month
    ? `${first.day}-${last.day} ${first.month}`
    : `${first.day} ${first.month} - ${last.day} ${last.month}`
})

const slotsOutOfPeriod = computed(() =>
  batchSlots.value.some(
    (slot) =>
      slot.date < form.start_date ||
      slot.date > form.end_date ||
      (slot.repeat_until != null && slot.repeat_until > form.end_date),
  ),
)

async function loadWeek() {
  const field = selectedField.value
  if (!field) {
    week.value = { days: [], rows: [] }
    return
  }
  weekLoading.value = true
  try {
    const loaded = await getManagerWeek(
      field,
      addDays(form.start_date, pageOffset.value * DAY_COUNT),
      new Date(),
      DAY_COUNT,
    )
    // Дни вне периода договора недоступны.
    for (const row of loaded.rows) {
      for (const cell of row.cells) {
        if (cell.date < form.start_date || cell.date > form.end_date) cell.status = 'past'
      }
    }
    week.value = loaded
  } finally {
    weekLoading.value = false
  }
}

function enterGrid() {
  if (!selectedFieldId.value) selectedFieldId.value = props.fields[0]?.id ?? ''
  if (selectedField.value) bookingStore.setField(selectedField.value)
  if (pageOffset.value > maxOffset.value) pageOffset.value = 0
  loadWeek()
}

watch(selectedField, (field) => {
  if (!field || step.value !== 4) return
  bookingStore.setField(field)
  pageOffset.value = 0
  loadWeek()
})

function shiftWeek(delta: number) {
  const target = pageOffset.value + delta
  if (target < 0 || target > maxOffset.value) return
  pageOffset.value = target
  loadWeek()
}

// ── Проверка слотов ───────────────────────────────────
const checking = ref(false)
const checkResult = ref<CheckSlotsResult | null>(null)
const checkError = ref('')
const conflicts = ref<SlotConflict[]>([])

// Любое изменение выбора делает прошлую проверку неактуальной.
watch(
  batchSlots,
  () => {
    checkResult.value = null
    checkError.value = ''
  },
  { deep: true },
)

async function runCheck() {
  if (!batchSlots.value.length || slotsOutOfPeriod.value) return
  checking.value = true
  checkError.value = ''
  try {
    const result = await checkContractSlots({
      slots: batchSlots.value,
      start_date: form.start_date,
      end_date: form.end_date,
    })
    checkResult.value = result
    conflicts.value = result.conflicts
    if (!result.free && !result.conflicts.length) {
      checkError.value = 'Часть слотов занята. Запустите проверку ещё раз.'
    }
  } catch (e) {
    checkResult.value = null
    checkError.value = contractErrorMessage(e, 'Не удалось проверить слоты')
  } finally {
    checking.value = false
  }
}

function fieldName(id: number): string {
  return props.fields.find((field) => field.id === String(id))?.name ?? `Поле ${id}`
}

// ── Шаг 5: предпросмотр графика ───────────────────────
const preview = ref<PlanPreview | null>(null)
const previewLoading = ref(false)
const previewError = ref('')
const customAmounts = ref(false)
const amounts = ref<string[]>([])

const amountsSum = computed(() => amounts.value.reduce((sum, a) => sum + (Number(a) || 0), 0))

const amountsError = computed(() => {
  if (!customAmounts.value || plan.value.mode !== 'static') return ''
  if (amounts.value.some((a) => a === '' || !Number.isInteger(Number(a)) || Number(a) < 0))
    return 'Суммы платежей — целые тенге'
  if (Number.isFinite(priceNumber.value) && amountsSum.value !== priceNumber.value)
    return `Сумма платежей (${formatPrice(amountsSum.value)}) должна равняться сумме договора`
  return ''
})

const previewRequest = computed(() => {
  if (step.value !== 5) return null
  const payment_plan = buildPaymentPlan(plan.value)
  const price = priceNumber.value
  if (!payment_plan || !Number.isInteger(price) || price < 1) return null
  return {
    price,
    start_date: form.start_date,
    end_date: form.end_date,
    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    payment_plan,
    ...(payment_plan.mode === 'dynamic' ? { slots: batchSlots.value } : {}),
  }
})

let previewTimer: number | undefined
let previewSeq = 0

watch(
  () => JSON.stringify(previewRequest.value),
  () => {
    if (previewTimer !== undefined) window.clearTimeout(previewTimer)
    const request = previewRequest.value
    if (!request) {
      previewSeq++
      previewLoading.value = false
      preview.value = null
      previewError.value = ''
      return
    }
    previewTimer = window.setTimeout(async () => {
      const seq = ++previewSeq
      previewLoading.value = true
      try {
        const result = await previewPaymentPlan(request)
        if (seq !== previewSeq) return
        preview.value = result
        previewError.value = ''
        // Число платежей изменилось — ручные суммы больше не соответствуют графику.
        if (customAmounts.value && amounts.value.length !== result.installments.length) {
          fillAmountsFromPreview()
        }
      } catch (e) {
        if (seq !== previewSeq) return
        preview.value = null
        previewError.value = contractErrorMessage(e, 'Не удалось рассчитать график')
      } finally {
        if (seq === previewSeq) previewLoading.value = false
      }
    }, 400)
  },
)

function fillAmountsFromPreview() {
  amounts.value = (preview.value?.installments ?? []).map((i) => String(i.amount ?? ''))
}

watch(customAmounts, (on) => {
  if (on) fillAmountsFromPreview()
  else amounts.value = []
})

// Смена режима/графика на шаге 3 сбрасывает ручные суммы.
watch(
  () => [plan.value.mode, plan.value.schedule],
  () => {
    customAmounts.value = false
  },
)

function setAmount(index: number, value: string) {
  amounts.value = amounts.value.map((a, i) => (i === index ? value : a))
}

function formatDueDate(iso?: string): string {
  if (!iso) return ''
  return dayFullLabel(iso.slice(0, 10))
}

// ── Отправка ──────────────────────────────────────────
async function submit() {
  touched.value = true
  for (const s of [1, 2, 3, 4, 5] as Step[]) {
    if (stepErrors.value[s]) {
      goTo(s)
      touched.value = true
      return
    }
  }
  saving.value = true
  submitError.value = ''
  submitCode.value = undefined
  const who = auth.user?.email || auth.user?.name || 'manager'
  try {
    const result = await createContract({
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date,
      price: priceNumber.value,
      status: 'confirmed',
      notes: form.notes.trim(),
      source: who,
      updated_by: who,
      slots: batchSlots.value,
      payment_plan: buildPaymentPlan(
        plan.value,
        customAmounts.value ? amounts.value.map(Number) : undefined,
      ),
    })
    emit('created', result)
    open.value = false
  } catch (e) {
    const code = contractErrorCode(e)
    submitCode.value = code
    submitError.value = contractErrorMessage(e, 'Не удалось создать контракт')
    if (code === 'SLOT_TAKEN') {
      conflicts.value = contractErrorConflicts(e)
      checkResult.value = null
      if (!conflicts.value.length) {
        submitError.value += ' Запустите проверку слотов ещё раз.'
      }
      goTo(4)
    }
  } finally {
    saving.value = false
  }
}

function useWhatsappLink() {
  plan.value.channel = 'whatsapp_link'
  submitError.value = ''
  submitCode.value = undefined
}

// ── Диалог ────────────────────────────────────────────
const dialog = ref<HTMLDialogElement | null>(null)

function show() {
  reset()
  if (dialog.value?.isConnected && !dialog.value.open) dialog.value.showModal()
}

watch(open, (isOpen) => {
  if (isOpen) {
    show()
  } else {
    dialog.value?.close()
    bookingStore.clear()
  }
})

function onClose() {
  if (open.value) open.value = false
}

// Перемонтирование при открытом состоянии (напр. HMR) — снова показываем диалог,
// иначе open остаётся true, а окно закрыто, и кнопка открытия ничего не делает.
onMounted(() => {
  if (open.value) show()
})

onUnmounted(() => {
  if (previewTimer !== undefined) window.clearTimeout(previewTimer)
})
</script>

<template>
  <dialog
    ref="dialog"
    class="contract-dialog m-auto w-[min(72rem,96vw)] max-h-[92vh] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
    @close="onClose"
  >
    <div class="flex max-h-[92vh] flex-col">
      <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Новый контракт</h2>
          <p class="mt-0.5 text-sm text-gray-500">{{ STEPS[step - 1].hint }}</p>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Закрыть"
          @click="open = false"
        >
          <X class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <ol class="mb-5 grid grid-cols-5 gap-2 text-sm">
          <li v-for="s in STEPS" :key="s.step">
            <button
              type="button"
              class="w-full truncate rounded-lg px-3 py-2 text-left font-medium"
              :class="
                step === s.step
                  ? 'bg-success-50 text-success-700'
                  : s.step < step
                    ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    : 'bg-gray-50 text-gray-400'
              "
              :aria-current="step === s.step ? 'step' : undefined"
              @click="goTo(s.step)"
            >
              {{ s.step }}. {{ s.label }}
            </button>
          </li>
        </ol>

        <!-- 1. Клиент -->
        <div v-if="step === 1" class="grid gap-4 lg:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-gray-700">
            Клиент или компания
            <input v-model="form.customer_name" maxlength="100" class="contract-input" />
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-gray-700">
            Телефон
            <input
              v-model="form.phone"
              type="tel"
              placeholder="+7 700 123 45 67"
              class="contract-input"
            />
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-gray-700 lg:col-span-2">
            Заметка
            <textarea v-model="form.notes" rows="3" class="contract-input resize-none" />
          </label>
        </div>

        <!-- 2. Период -->
        <div v-else-if="step === 2" class="grid gap-4 lg:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-gray-700">
            Начало
            <input v-model="form.start_date" type="date" class="contract-input" />
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-gray-700">
            Окончание
            <input
              v-model="form.end_date"
              type="date"
              :min="form.start_date"
              class="contract-input"
            />
          </label>
        </div>

        <!-- 3. Оплата -->
        <PlanScheduleFields
          v-else-if="step === 3"
          v-model="plan"
          :start-date="form.start_date"
          :end-date="form.end_date"
        />

        <!-- 4. Время -->
        <div
          v-else-if="step === 4"
          class="grid min-h-[34rem] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]"
        >
          <aside class="space-y-4">
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Поле
              <select v-model="selectedFieldId" class="contract-input">
                <option v-for="field in fields" :key="field.id" :value="field.id">
                  {{ field.name }}
                </option>
              </select>
            </label>

            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs text-gray-500">Период договора</p>
              <p class="mt-1 text-sm font-semibold text-gray-900">{{ periodLabel }}</p>
              <button
                type="button"
                class="mt-1 text-xs font-semibold text-success-700 hover:underline"
                @click="goTo(2)"
              >
                Изменить период
              </button>
            </div>

            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs text-gray-500">Выбрано интервалов</p>
              <p class="mt-1 text-2xl font-bold text-gray-900">
                {{ bookingStore.intervals.length }}
              </p>
              <p class="mt-1 text-sm text-gray-500">{{ bookingStore.count }} получасовых слотов</p>
              <p class="mt-2 text-xs text-gray-500">
                Правый клик (или удержание) по интервалу — повтор до конца договора.
              </p>
              <button
                v-if="bookingStore.count > 0"
                type="button"
                class="mt-3 text-sm font-semibold text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
                @click="bookingStore.clearSlots"
              >
                Очистить
              </button>
            </div>

            <button
              type="button"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              :disabled="checking || !batchSlots.length || slotsOutOfPeriod"
              @click="runCheck"
            >
              <Loader2 v-if="checking" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <SearchCheck v-else class="h-4 w-4" aria-hidden="true" />
              Проверить слоты
            </button>

            <div
              v-if="checkResult?.free"
              class="flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700"
            >
              <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Все слоты свободны. Броней: {{ checkResult.occurrences }}</span>
            </div>
            <p v-if="checkError" class="text-sm text-error-500">{{ checkError }}</p>

            <div v-if="conflicts.length" class="rounded-lg border border-error-200 bg-error-50 p-3">
              <p class="flex items-center gap-1.5 text-sm font-semibold text-error-700">
                <AlertTriangle class="h-4 w-4" aria-hidden="true" />
                Заняты ({{ conflicts.length }})
              </p>
              <ul class="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-gray-700">
                <li
                  v-for="c in conflicts"
                  :key="`${c.field}-${c.date}-${c.time_start}`"
                  class="flex justify-between gap-2"
                >
                  <span>{{ dayFullLabel(c.date) }}</span>
                  <span class="text-gray-500">
                    {{ c.time_start }}–{{ c.time_end }} · {{ fieldName(c.field) }}
                  </span>
                </li>
              </ul>
            </div>
          </aside>

          <section class="flex min-w-0 flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                :disabled="pageOffset <= 0"
                aria-label="Предыдущая неделя"
                @click="shiftWeek(-1)"
              >
                <ChevronLeft class="h-4 w-4" aria-hidden="true" />
              </button>
              <p class="text-sm font-semibold text-gray-700">
                {{ rangeLabel }}
                <span class="font-normal text-gray-400">
                  · неделя {{ pageOffset + 1 }} из {{ maxOffset + 1 }}
                </span>
              </p>
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                :disabled="pageOffset >= maxOffset"
                aria-label="Следующая неделя"
                @click="shiftWeek(1)"
              >
                <ChevronRight class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <WeekGrid
              :week="week"
              :loading="weekLoading"
              :conflicts="conflicts"
              :repeat-max-until="form.end_date"
              allow-repeat
              hide-booking-details
              hide-slot-prices
              fill
            />
          </section>
        </div>

        <!-- 5. Сумма и плательщик -->
        <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div class="grid content-start gap-4">
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Сумма договора, ₸
              <input v-model="form.price" type="number" min="1" step="1" class="contract-input" />
            </label>
            <PlanPayerFields v-if="hasPlan" v-model="plan" :fallback-phone="form.phone.trim()" />
            <p v-else class="text-sm text-gray-500">
              Без онлайн-оплаты: счета не выставляются, оплату ведёт менеджер.
            </p>
          </div>

          <section v-if="hasPlan" class="rounded-xl border border-gray-200">
            <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <p class="text-sm font-semibold text-gray-900">
                График платежей
                <span v-if="preview" class="font-normal text-gray-500">
                  · {{ preview.installments_count }}
                </span>
              </p>
              <Loader2
                v-if="previewLoading"
                class="h-4 w-4 animate-spin text-success-600"
                aria-hidden="true"
              />
              <label
                v-else-if="plan.mode === 'static' && preview"
                class="flex items-center gap-2 text-sm text-gray-600"
              >
                <input v-model="customAmounts" type="checkbox" class="rounded text-success-600" />
                Свои суммы
              </label>
            </div>

            <p v-if="previewError" class="px-4 py-3 text-sm text-error-500">{{ previewError }}</p>
            <p v-else-if="!preview" class="px-4 py-3 text-sm text-gray-500">
              Укажите сумму договора, чтобы увидеть график.
            </p>
            <template v-else>
              <p v-if="plan.mode === 'dynamic'" class="px-4 pt-3 text-xs text-gray-500">
                Ориентировочно: точная сумма считается в момент отправки каждого платежа.
              </p>
              <ul class="max-h-80 divide-y divide-gray-100 overflow-auto">
                <li
                  v-for="(item, index) in preview.installments"
                  :key="item.seq"
                  class="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <span class="text-gray-500">
                    {{ index + 1 }}.
                    <span class="text-gray-700">
                      {{ item.due_at ? formatDueDate(item.due_at) : 'После брони' }}
                    </span>
                  </span>
                  <input
                    v-if="customAmounts"
                    :value="amounts[index]"
                    type="number"
                    min="0"
                    step="1"
                    class="contract-input max-w-36 py-1.5 text-right"
                    :aria-label="`Сумма платежа ${index + 1}`"
                    @input="setAmount(index, ($event.target as HTMLInputElement).value)"
                  />
                  <span v-else class="font-medium text-gray-900">
                    {{ item.amount != null ? formatPrice(item.amount) : '—' }}
                  </span>
                </li>
              </ul>
              <p
                v-if="customAmounts"
                class="border-t border-gray-100 px-4 py-2 text-right text-sm"
                :class="amountsSum === priceNumber ? 'text-gray-500' : 'text-error-500'"
              >
                Итого {{ formatPrice(amountsSum) }} из {{ formatPrice(priceNumber || 0) }}
              </p>
            </template>
          </section>
        </div>

        <p v-if="touched && currentError" class="mt-4 text-sm text-error-500">
          {{ currentError }}
        </p>

        <div
          v-if="submitError"
          class="mt-4 flex flex-wrap items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-gray-700"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-error-500" aria-hidden="true" />
          <span class="flex-1">{{ submitError }}</span>
          <button
            v-if="submitCode === 'NO_KASPI'"
            type="button"
            class="font-semibold text-success-700 hover:underline"
            @click="useWhatsappLink"
          >
            Отправлять ссылкой в WhatsApp
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">
        <div>
          <p class="text-xs text-gray-500">Сумма договора</p>
          <p class="text-xl font-bold text-gray-900">
            {{ formatPrice(priceNumber || 0) }}
          </p>
          <p v-if="preview?.installments[0]?.due_at && step === 5" class="text-xs text-gray-500">
            Первый платёж {{ formatDateTime(preview.installments[0].due_at) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="step > 1"
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            :disabled="saving"
            @click="back"
          >
            Назад
          </button>
          <button
            v-if="step < 5"
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            :disabled="checking"
            @click="next"
          >
            <Loader2 v-if="checking" class="h-4 w-4 animate-spin" aria-hidden="true" />
            Далее
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            :disabled="saving"
            @click="submit"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
            Создать контракт
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.contract-dialog::backdrop {
  background: color-mix(in srgb, var(--color-gray-900) 55%, transparent);
  backdrop-filter: blur(2px);
}
</style>
