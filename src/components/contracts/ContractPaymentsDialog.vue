<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Wallet,
  X,
} from 'lucide-vue-next'

import PlanScheduleFields from './PlanScheduleFields.vue'
import PlanPayerFields from './PlanPayerFields.vue'
import { useAuthStore } from '@/stores/auth'
import type {
  ContractListRow,
  ContractPaymentPlan,
  Installment,
  PlanDraft,
} from '@/services/contracts'
import {
  INSTALLMENT_STATUS_LABEL,
  PAYMENT_CHANNEL_LABEL,
  PAYMENT_FREQUENCY_LABEL,
  buildPaymentPlan,
  contractErrorCode,
  contractErrorMessage,
  deletePaymentPlan,
  emptyPlanDraft,
  getContractPayments,
  installmentStatusClass,
  markInstallmentPaid,
  paymentStatusClass,
  paymentStatusLabel,
  planDraftFrom,
  planScheduleError,
  sendInstallment,
  setPaymentPlan,
  updateInstallment,
} from '@/services/contracts'
import { formatDateTime, formatPrice } from '@/services/booking'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  contract: ContractListRow | null
}>()

const emit = defineEmits<{
  // План/статус оплаты изменился — список договоров стоит перечитать.
  changed: []
}>()

const auth = useAuthStore()

const POLL_MS = 60_000

const plan = ref<ContractPaymentPlan | null>(null)
const loading = ref(false)
const busy = ref<string | null>(null) // ключ выполняемого действия
const error = ref('')
const notice = ref('')

const hasPlan = computed(() => !!plan.value?.payment_mode && plan.value.payment_status !== 'none')
const planActive = computed(
  () =>
    hasPlan.value &&
    ['scheduled', 'awaiting', 'overdue'].includes(plan.value?.payment_status ?? ''),
)

async function load(silent = false) {
  const id = props.contract?.id
  if (!id) return
  if (!silent) loading.value = true
  try {
    plan.value = await getContractPayments(id)
    if (!silent) error.value = ''
  } catch (e) {
    if (!silent) error.value = contractErrorMessage(e, 'Не удалось загрузить платежи')
  } finally {
    loading.value = false
  }
}

/** Выполняет действие; ответ с планом перерисовывает диалог. */
async function run(
  key: string,
  action: () => Promise<ContractPaymentPlan | void>,
  fallback: string,
): Promise<boolean> {
  busy.value = key
  error.value = ''
  notice.value = ''
  try {
    const next = await action()
    if (next) plan.value = next
    emit('changed')
    return true
  } catch (e) {
    error.value = contractErrorMessage(e, fallback)
    // Платёж уже ушёл/оплачен на сервере — показываем актуальное состояние.
    if (contractErrorCode(e) === 'INVALID_STATE' || contractErrorCode(e) === 'NOT_FOUND') {
      load(true)
    }
    return false
  } finally {
    busy.value = null
  }
}

// ── Платёж: изменение ────────────────────────────────
const editingId = ref<number | null>(null)
const editForm = reactive({ amount: '', due_date: '' })

function startEdit(item: Installment) {
  payingId.value = null
  editingId.value = item.id
  editForm.amount = item.amount_locked && item.amount != null ? String(item.amount) : ''
  editForm.due_date = item.due_at.slice(0, 10)
}

const editError = computed(() => {
  if (editForm.amount === '') return ''
  const amount = Number(editForm.amount)
  return Number.isInteger(amount) && amount >= 0 ? '' : 'Сумма — целые тенге'
})

async function saveEdit(item: Installment) {
  if (editError.value || !props.contract) return
  const payload: { amount?: number | null; due_date?: string } = {}
  const amount = editForm.amount === '' ? null : Number(editForm.amount)
  const currentAmount = item.amount_locked ? item.amount : null
  if (amount !== currentAmount) payload.amount = amount
  if (editForm.due_date && editForm.due_date !== item.due_at.slice(0, 10))
    payload.due_date = editForm.due_date
  if (!Object.keys(payload).length) {
    editingId.value = null
    return
  }
  const id = props.contract.id
  const ok = await run(
    `edit-${item.id}`,
    () => updateInstallment(id, item.id, payload),
    'Не удалось изменить платёж',
  )
  if (ok) editingId.value = null
}

// ── Платёж: отметить оплаченным ──────────────────────
const payingId = ref<number | null>(null)
const payForm = reactive({ amount: '', note: '' })

function startPay(item: Installment) {
  editingId.value = null
  payingId.value = item.id
  payForm.amount = item.amount != null ? String(item.amount) : ''
  payForm.note = `принял ${auth.user?.email || auth.user?.name || 'менеджер'}`
}

const payError = computed(() => {
  if (payForm.amount === '') return ''
  const amount = Number(payForm.amount)
  return Number.isInteger(amount) && amount > 0 ? '' : 'Сумма — целые тенге больше нуля'
})

async function savePay(item: Installment) {
  if (payError.value || !props.contract) return
  const id = props.contract.id
  const payload: { amount?: number; note?: string } = {}
  if (payForm.amount !== '') payload.amount = Number(payForm.amount)
  if (payForm.note.trim()) payload.note = payForm.note.trim()
  const ok = await run(
    `pay-${item.id}`,
    () => markInstallmentPaid(id, item.id, payload),
    'Не удалось отметить оплату',
  )
  if (ok) payingId.value = null
}

// ── Платёж: отправить сейчас ─────────────────────────
function canSend(item: Installment): boolean {
  if (item.status === 'scheduled' || item.status === 'overdue') return true
  return item.status === 'issued' && item.channel === 'whatsapp_link'
}

function sendLabel(item: Installment): string {
  if (item.status === 'issued') return 'Отправить ссылку ещё раз'
  if (item.status === 'overdue') return 'Отправить ещё раз'
  return 'Отправить сейчас'
}

async function onSend(item: Installment) {
  if (!props.contract) return
  if (!window.confirm(`${sendLabel(item)}?`)) return
  const id = props.contract.id
  let message = ''
  const ok = await run(
    `send-${item.id}`,
    async () => {
      const res = await sendInstallment(id, item.id)
      if (res.channel === 'whatsapp_link') {
        message = res.notified
          ? 'Ссылка на оплату отправлена в WhatsApp.'
          : 'Платёж выставлен, но сообщение в WhatsApp не доставлено.'
      } else if (res.invoice_id == null || res.send_pending) {
        message = 'ApiPay пока не ответил — счёт будет отправлен повторно в течение минуты.'
      } else {
        message = `Счёт в Kaspi отправлен на ${formatPrice(res.amount)}.`
      }
      await load(true)
    },
    'Не удалось отправить платёж',
  )
  if (ok) notice.value = message
}

// ── План: подключить / заменить / остановить ─────────
const planEditing = ref(false)
const planForm = ref<PlanDraft>(emptyPlanDraft())
const planTouched = ref(false)

const planFormError = computed(() => {
  const scheduleError = planScheduleError(planForm.value)
  if (scheduleError) return scheduleError
  if (!planForm.value.billing_phone.trim() && !props.contract?.phone)
    return 'Укажите телефон плательщика'
  return ''
})

function startPlanEdit() {
  editingId.value = null
  payingId.value = null
  planForm.value =
    plan.value && hasPlan.value
      ? planDraftFrom(plan.value)
      : { ...emptyPlanDraft(), mode: 'static' }
  planTouched.value = false
  planEditing.value = true
}

async function savePlan() {
  planTouched.value = true
  const payload = buildPaymentPlan(planForm.value)
  if (planFormError.value || !payload || !props.contract) return
  const id = props.contract.id
  const ok = await run('plan', () => setPaymentPlan(id, payload), 'Не удалось сохранить план')
  if (ok) planEditing.value = false
}

async function stopPlan() {
  if (!props.contract) return
  const ok = window.confirm(
    'Остановить онлайн-оплату? Неоплаченные платежи будут отменены, открытые счета в Kaspi — отозваны.',
  )
  if (!ok) return
  const id = props.contract.id
  await run('stop', () => deletePaymentPlan(id), 'Не удалось остановить оплату')
}

// ── Отображение ──────────────────────────────────────
function amountText(item: Installment): string {
  if (item.amount != null) return formatPrice(item.amount)
  const estimate = plan.value?.summary.per_booking_estimate
  return estimate != null ? `≈ ${formatPrice(estimate)}` : 'авто'
}

function paidText(item: Installment): string {
  if (item.paid_amount == null) return ''
  const via = item.paid_via === 'manual' ? 'вручную' : item.paid_via === 'apipay' ? 'Kaspi' : ''
  return [formatPrice(item.paid_amount), via, item.paid_at ? formatDateTime(item.paid_at) : '']
    .filter(Boolean)
    .join(' · ')
}

const modeText = computed(() => {
  if (!plan.value?.payment_mode) return ''
  if (plan.value.payment_mode === 'dynamic') return 'За каждую бронь'
  const freq = plan.value.payment_frequency
  return freq
    ? `По графику · ${PAYMENT_FREQUENCY_LABEL[freq].toLowerCase()}`
    : 'По графику (свои даты)'
})

// ── Диалог, опрос и обновление по фокусу ──────────────
const dialog = ref<HTMLDialogElement | null>(null)
let pollTimer: number | undefined

function onFocus() {
  load(true)
}

function stopPolling() {
  if (pollTimer !== undefined) window.clearInterval(pollTimer)
  pollTimer = undefined
  window.removeEventListener('focus', onFocus)
}

function show() {
  plan.value = null
  error.value = ''
  notice.value = ''
  editingId.value = null
  payingId.value = null
  planEditing.value = false
  if (dialog.value?.isConnected && !dialog.value.open) dialog.value.showModal()
  load()
  stopPolling()
  pollTimer = window.setInterval(() => load(true), POLL_MS)
  window.addEventListener('focus', onFocus)
}

watch(open, (isOpen) => {
  if (isOpen) {
    show()
  } else {
    stopPolling()
    dialog.value?.close()
  }
})

function onClose() {
  if (open.value) open.value = false
}

// Перемонтирование при открытом состоянии (напр. HMR) — снова показываем диалог.
onMounted(() => {
  if (open.value) show()
})

onUnmounted(stopPolling)
</script>

<template>
  <dialog
    ref="dialog"
    class="contract-dialog m-auto w-[min(64rem,96vw)] max-h-[92vh] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
    @close="onClose"
  >
    <div class="flex max-h-[92vh] flex-col">
      <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 text-lg font-bold text-gray-900">
            Платежи по контракту #{{ contract?.id }}
            <span
              v-if="plan"
              class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
              :class="paymentStatusClass(plan.payment_status)"
            >
              {{ paymentStatusLabel(plan.payment_status) }}
            </span>
          </h2>
          <p class="mt-0.5 truncate text-sm text-gray-500">{{ contract?.customer_name }}</p>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
            aria-label="Обновить"
            :disabled="loading"
            @click="load()"
          >
            <RefreshCw class="h-4 w-4" :class="loading && 'animate-spin'" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Закрыть"
            @click="open = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
        <div
          v-if="error"
          class="mb-4 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-gray-700"
        >
          <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-error-500" aria-hidden="true" />
          <span>{{ error }}</span>
        </div>
        <div
          v-if="notice"
          class="mb-4 flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-gray-700"
        >
          <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
          <span>{{ notice }}</span>
        </div>

        <div v-if="loading && !plan" class="flex min-h-[220px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
        </div>

        <template v-else-if="plan">
          <!-- Замена / подключение плана -->
          <section v-if="planEditing" class="mb-5 rounded-xl border border-gray-200 p-4">
            <h3 class="mb-1 font-semibold text-gray-900">
              {{ hasPlan ? 'Новый план оплаты' : 'Подключить онлайн-оплату' }}
            </h3>
            <p class="mb-4 text-sm text-gray-500">
              Оплаченные и уже выставленные платежи сохранятся. Новый план покроет остаток:
              {{
                formatPrice(
                  Math.max(
                    0,
                    plan.summary.price - plan.summary.paid - plan.summary.invoiced_unpaid,
                  ),
                )
              }}.
            </p>
            <div class="grid gap-4">
              <PlanScheduleFields
                v-model="planForm"
                :start-date="contract?.start_date ?? ''"
                :end-date="contract?.end_date ?? ''"
                :allow-none="false"
              />
              <PlanPayerFields v-model="planForm" :fallback-phone="contract?.phone || ''" />
            </div>
            <p v-if="planTouched && planFormError" class="mt-3 text-sm text-error-500">
              {{ planFormError }}
            </p>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                @click="planEditing = false"
              >
                Отмена
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
                :disabled="busy === 'plan'"
                @click="savePlan"
              >
                <Loader2 v-if="busy === 'plan'" class="h-4 w-4 animate-spin" aria-hidden="true" />
                Сохранить план
              </button>
            </div>
          </section>

          <div
            v-if="!hasPlan && !planEditing"
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center"
          >
            <Wallet class="h-7 w-7 text-gray-400" aria-hidden="true" />
            <p class="text-gray-600">
              {{
                plan.payment_status === 'none'
                  ? 'Онлайн-оплата для этого контракта не подключена.'
                  : paymentStatusLabel(plan.payment_status)
              }}
            </p>
            <button
              v-if="plan.payment_status !== 'cancelled'"
              type="button"
              class="rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-700"
              @click="startPlanEdit"
            >
              Подключить оплату
            </button>
          </div>

          <template v-if="hasPlan">
            <!-- Сводка -->
            <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs text-gray-500">Сумма договора</p>
                <p class="mt-1 text-lg font-bold text-gray-900">
                  {{ formatPrice(plan.summary.price) }}
                </p>
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs text-gray-500">Оплачено</p>
                <p class="mt-1 text-lg font-bold text-success-700">
                  {{ formatPrice(plan.summary.paid) }}
                </p>
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs text-gray-500">Выставлено, не оплачено</p>
                <p class="mt-1 text-lg font-bold text-warning-600">
                  {{ formatPrice(plan.summary.invoiced_unpaid) }}
                </p>
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs text-gray-500">Осталось оплатить</p>
                <p class="mt-1 text-lg font-bold text-gray-900">
                  {{ formatPrice(plan.summary.left_to_pay) }}
                </p>
              </div>
            </div>

            <dl class="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500">Схема</dt>
                <dd class="text-gray-800">{{ modeText }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500">Плательщик</dt>
                <dd class="text-gray-800">{{ plan.billing_phone || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500">Способ оплаты</dt>
                <dd class="text-gray-800">
                  {{ plan.payment_channel ? PAYMENT_CHANNEL_LABEL[plan.payment_channel] : '—' }}
                </dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-gray-500">Следующий платёж</dt>
                <dd class="text-gray-800">
                  {{ plan.summary.next_due_at ? formatDateTime(plan.summary.next_due_at) : '—' }}
                </dd>
              </div>
            </dl>

            <p
              v-if="plan.payment_channel === 'whatsapp_link'"
              class="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"
            >
              Оплата по ссылке не подтверждается автоматически: проверьте чек клиента и отметьте
              платёж оплаченным.
            </p>

            <div v-if="!planEditing" class="mt-4 flex flex-wrap justify-end gap-2">
              <button
                v-if="plan.payment_status !== 'cancelled'"
                type="button"
                class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                @click="startPlanEdit"
              >
                Изменить план
              </button>
              <button
                v-if="planActive"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-error-200 px-3 py-2 text-sm font-semibold text-error-600 hover:bg-error-50 disabled:opacity-50"
                :disabled="busy === 'stop'"
                @click="stopPlan"
              >
                <Loader2 v-if="busy === 'stop'" class="h-4 w-4 animate-spin" aria-hidden="true" />
                Остановить оплату
              </button>
            </div>
          </template>

          <!-- Платежи -->
          <div
            v-if="plan.installments.length"
            class="mt-5 max-w-full overflow-x-auto rounded-xl border border-gray-200 custom-scrollbar"
          >
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 text-left text-theme-xs text-gray-500">
                  <th class="px-3 py-2 font-medium">№</th>
                  <th class="px-3 py-2 font-medium">Дата</th>
                  <th class="px-3 py-2 font-medium">Сумма</th>
                  <th class="px-3 py-2 font-medium">Статус</th>
                  <th class="px-3 py-2 font-medium">Оплата</th>
                  <th class="px-3 py-2"><span class="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <template v-for="(item, index) in plan.installments" :key="item.id">
                  <tr :class="item.status === 'cancelled' && 'text-gray-400'">
                    <td class="px-3 py-2.5 text-gray-500">
                      {{ index + 1 }}
                      <span v-if="item.booking_id" class="block text-theme-xs">
                        бронь #{{ item.booking_id }}
                      </span>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5">{{ formatDateTime(item.due_at) }}</td>
                    <td class="whitespace-nowrap px-3 py-2.5 font-medium">
                      <span class="inline-flex items-center gap-1">
                        {{ amountText(item) }}
                        <Lock
                          v-if="item.amount_locked"
                          class="h-3.5 w-3.5 text-gray-400"
                          aria-label="Сумма зафиксирована менеджером"
                        />
                      </span>
                    </td>
                    <td class="px-3 py-2.5">
                      <span
                        class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                        :class="installmentStatusClass(item.status)"
                      >
                        {{ INSTALLMENT_STATUS_LABEL[item.status] ?? item.status }}
                      </span>
                      <span v-if="item.attempts" class="block text-theme-xs text-gray-500">
                        {{ item.channel ? PAYMENT_CHANNEL_LABEL[item.channel] : '' }}
                        · попытка {{ item.attempts }}/3
                      </span>
                      <span
                        v-if="item.last_error"
                        class="block max-w-[16rem] truncate text-theme-xs text-gray-400"
                        :title="item.last_error"
                      >
                        {{ item.last_error }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 text-theme-xs text-gray-600">{{ paidText(item) }}</td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-right">
                      <div class="inline-flex items-center gap-1">
                        <button
                          v-if="item.status === 'scheduled'"
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          title="Изменить"
                          aria-label="Изменить платёж"
                          @click="startEdit(item)"
                        >
                          <Edit3 class="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          v-if="canSend(item)"
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
                          :title="sendLabel(item)"
                          :aria-label="sendLabel(item)"
                          :disabled="busy === `send-${item.id}`"
                          @click="onSend(item)"
                        >
                          <Loader2
                            v-if="busy === `send-${item.id}`"
                            class="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          <Send v-else class="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          v-if="['scheduled', 'issued', 'overdue'].includes(item.status)"
                          type="button"
                          class="rounded-lg px-2 py-1 text-theme-xs font-semibold text-success-700 hover:bg-success-50"
                          @click="startPay(item)"
                        >
                          Оплачено
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr v-if="editingId === item.id" class="bg-gray-50">
                    <td colspan="6" class="px-3 py-3">
                      <div class="flex flex-wrap items-end gap-3">
                        <label class="grid gap-1 text-xs font-medium text-gray-600">
                          Сумма, ₸
                          <input
                            v-model="editForm.amount"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Автоматически"
                            class="contract-input w-40 py-1.5"
                          />
                        </label>
                        <label class="grid gap-1 text-xs font-medium text-gray-600">
                          Дата платежа
                          <input
                            v-model="editForm.due_date"
                            type="date"
                            class="contract-input w-44 py-1.5"
                          />
                        </label>
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            @click="editingId = null"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
                            :disabled="!!editError || busy === `edit-${item.id}`"
                            @click="saveEdit(item)"
                          >
                            <Loader2
                              v-if="busy === `edit-${item.id}`"
                              class="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                            Сохранить
                          </button>
                        </div>
                      </div>
                      <p class="mt-2 text-xs text-gray-500">
                        Пустая сумма — расчёт автоматически.
                        <template v-if="plan.payment_mode === 'static'">
                          Остальные платежи пересчитаются.
                        </template>
                      </p>
                      <p v-if="editError" class="mt-1 text-xs text-error-500">{{ editError }}</p>
                    </td>
                  </tr>

                  <tr v-if="payingId === item.id" class="bg-gray-50">
                    <td colspan="6" class="px-3 py-3">
                      <div class="flex flex-wrap items-end gap-3">
                        <label class="grid gap-1 text-xs font-medium text-gray-600">
                          Получено, ₸
                          <input
                            v-model="payForm.amount"
                            type="number"
                            min="1"
                            step="1"
                            class="contract-input w-40 py-1.5"
                          />
                        </label>
                        <label
                          class="grid min-w-[16rem] flex-1 gap-1 text-xs font-medium text-gray-600"
                        >
                          Комментарий
                          <input
                            v-model="payForm.note"
                            placeholder="наличные, перевод, ссылка…"
                            class="contract-input py-1.5"
                          />
                        </label>
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            @click="payingId = null"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
                            :disabled="!!payError || busy === `pay-${item.id}`"
                            @click="savePay(item)"
                          >
                            <Loader2
                              v-if="busy === `pay-${item.id}`"
                              class="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                            Отметить оплату
                          </button>
                        </div>
                      </div>
                      <p class="mt-2 text-xs text-gray-500">
                        Другая сумма пересчитает оставшиеся платежи. Оплата всей суммы договора
                        отменит остальные.
                      </p>
                      <p v-if="payError" class="mt-1 text-xs text-error-500">{{ payError }}</p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </template>
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
