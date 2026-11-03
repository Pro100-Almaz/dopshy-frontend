<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { AlertTriangle, Info, Loader2, RotateCcw } from 'lucide-vue-next'

import PaymentSummary from '@/components/bookings/PaymentSummary.vue'
import type {
  Booking,
  BookingRefundApi,
  BookingRefundState,
  BookingRefundSummaryApi,
} from '@/types'
import {
  REFUND_WINDOW_HOURS,
  createBookingRefund,
  formatDateTime,
  formatPrice,
  getBookingRefunds,
} from '@/services/booking'
import { formatPhone } from '@/services/academy'
import { ApiError } from '@/services/api'

// Вкладка «Возврат» окна брони. Деньги уходят через ApiPay на Kaspi, с которого
// клиент платил; итог приходит асинхронно (вебхук ApiPay), статус обновляется здесь.
const props = defineProps<{ booking: Booking }>()
const emit = defineEmits<{ close: []; refunded: [] }>()

const IN_FLIGHT: BookingRefundState[] = ['requested', 'processing', 'checking']

const summary = ref<BookingRefundSummaryApi | null>(null)
const loading = ref(true)
const loadError = ref('')
const amount = ref<number | null>(null)
const comment = ref('')
const confirming = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')

// Ключ идемпотентности нажатия: создаётся при подтверждении и живёт, пока сервер
// не ответил. Обрыв связи → «Повторить» уйдёт с тем же ключом, и бэкенд вернёт
// тот же возврат, а не создаст второй.
const requestKey = ref<string | null>(null)

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

watch(amount, () => {
  // Другая сумма — другой запрос.
  requestKey.value = null
  confirming.value = false
})

async function load(silent = false) {
  if (!silent) loading.value = true
  loadError.value = ''
  try {
    summary.value = await getBookingRefunds(props.booking.id)
  } catch (e) {
    if (!silent) loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить возвраты'
  } finally {
    loading.value = false
  }
}

// Пока возврат в обработке — тихо перечитываем: бэкенд при этом сверяется с ApiPay.
const POLL_MS = 10_000
let timer: ReturnType<typeof setInterval> | undefined
const inFlight = computed(() =>
  (summary.value?.refunds ?? []).some((r) => IN_FLIGHT.includes(r.state)),
)
watch(inFlight, (on) => {
  if (on && !timer) timer = setInterval(() => load(true), POLL_MS)
  if (!on && timer) {
    clearInterval(timer)
    timer = undefined
  }
})
onMounted(() => load())
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const refundable = computed(() => summary.value?.refundable ?? 0)
const windowHours = computed(() => summary.value?.window_hours || REFUND_WINDOW_HOURS)
const firstPaidAt = computed(() => summary.value?.first_paid_at || props.booking.firstPaidAt || '')
const withinWindow = computed(() => summary.value?.within_window ?? null)
const hasApipay = computed(() => (summary.value?.apipay_paid ?? 0) > 0)
const refundPhone = computed(() => summary.value?.refund_phone || '')
const checkingRow = computed(() => summary.value?.refunds.find((r) => r.state === 'checking'))

const amountError = computed(() => {
  if (amount.value == null || (amount.value as unknown) === '') return ''
  const v = Number(amount.value)
  if (!Number.isFinite(v) || v <= 0) return 'Сумма должна быть больше нуля'
  if (!Number.isInteger(v)) return 'Только целые тенге'
  if (v > refundable.value) return `Можно вернуть не больше ${formatPrice(refundable.value)}`
  return ''
})

const amountValid = computed(
  () => amount.value != null && Number(amount.value) > 0 && !amountError.value,
)

function fillMax() {
  amount.value = refundable.value
}

function askConfirm() {
  error.value = ''
  notice.value = ''
  if (!amountValid.value) return
  if (!requestKey.value) requestKey.value = newKey()
  confirming.value = true
}

async function submit() {
  if (!amountValid.value || !requestKey.value) return
  saving.value = true
  error.value = ''
  try {
    const value = Number(amount.value)
    const data = await createBookingRefund(props.booking.id, {
      amount: value,
      request_key: requestKey.value,
      ...(comment.value.trim() ? { comment: comment.value.trim() } : {}),
    })
    summary.value = data
    notice.value =
      data.refund?.state === 'requested'
        ? 'ApiPay пока не ответил. Запрос повторится автоматически с тем же ключом — второго возврата не будет.'
        : `Возврат ${formatPrice(value)} отправлен в Kaspi. Статус обновится здесь, когда ApiPay подтвердит его.`
    requestKey.value = null
    amount.value = null
    comment.value = ''
    confirming.value = false
    emit('refunded')
  } catch (e) {
    if (e instanceof ApiError) {
      // Сервер ответил — исход этого ключа известен, следующее нажатие будет новым запросом.
      requestKey.value = null
      confirming.value = false
      error.value = e.message
      if (e.code === 'REFUND_FAILED') emit('refunded')
      await load(true)
    } else {
      // Ответа нет: возврат мог и уйти. Ключ сохраняем — «Повторить» безопасен.
      error.value =
        'Нет ответа от сервера. Нажмите «Повторить» — повтор с тем же ключом не создаст второй возврат.'
    }
  } finally {
    saving.value = false
  }
}

const STATE_META: Record<BookingRefundState, { label: string; cls: string }> = {
  requested: {
    label: 'Отправляется',
    cls: 'bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300',
  },
  processing: {
    label: 'В обработке',
    cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  },
  checking: {
    label: 'Проверяется',
    cls: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  },
  refunded: {
    label: 'Возвращено',
    cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
  },
  failed: {
    label: 'Не прошёл',
    cls: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
  },
  recorded: {
    label: 'Записан вручную',
    cls: 'bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300',
  },
}

function rowNote(r: BookingRefundApi): string {
  const parts = [r.created_by]
  if (r.within_window === false) parts.push(`после ${windowHours.value} ч`)
  if (r.comment) parts.push(r.comment)
  return parts.filter(Boolean).join(' · ')
}

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800'
const mutedBox =
  'rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-gray-400'
const warnBox =
  'flex gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400'
</script>

<template>
  <div class="space-y-5">
    <!-- What can be refunded here -->
    <div class="flex gap-3" :class="mutedBox">
      <Info class="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Через систему возвращаются только оплаты через <b>Kaspi (ApiPay)</b> — деньги уходят на
        Kaspi, с которого клиент платил. Наличные, Kaspi QR и аванс, внесённый вручную, возвращайте
        вне системы.
      </p>
    </div>

    <!-- 48-hour window -->
    <div v-if="hasApipay && withinWindow === false" role="alert" :class="warnBox">
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        С момента оплаты прошло больше {{ windowHours }} часов — возврат не обязателен. Оформить его
        можно на усмотрение администратора.
      </p>
    </div>

    <p v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Загрузка…</p>
    <p v-else-if="loadError" class="text-sm text-error-600 dark:text-error-500">
      {{ loadError }}
    </p>

    <template v-else-if="summary">
      <!-- Refundable now -->
      <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p class="text-sm text-gray-600 dark:text-gray-400">Можно вернуть сейчас</p>
        <p class="mt-0.5 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
          {{ formatPrice(refundable) }}
        </p>
        <dl class="mt-3 space-y-1.5 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-gray-600 dark:text-gray-400">Оплачено через Kaspi (ApiPay)</dt>
            <dd class="font-medium tabular-nums text-gray-800 dark:text-white/90">
              {{ formatPrice(summary.apipay_paid) }}
            </dd>
          </div>
          <div v-if="summary.refunded_total > 0" class="flex justify-between gap-3">
            <dt class="text-gray-600 dark:text-gray-400">Уже возвращено</dt>
            <dd class="font-medium tabular-nums text-error-600 dark:text-error-500">
              − {{ formatPrice(summary.refunded_total) }}
            </dd>
          </div>
          <div v-if="summary.pending_total > 0" class="flex justify-between gap-3">
            <dt class="text-gray-600 dark:text-gray-400">В обработке</dt>
            <dd class="font-medium tabular-nums text-brand-600 dark:text-brand-400">
              − {{ formatPrice(summary.pending_total) }}
            </dd>
          </div>
          <div v-if="refundPhone" class="flex justify-between gap-3">
            <dt class="text-gray-600 dark:text-gray-400">На Kaspi</dt>
            <dd class="font-medium tabular-nums text-gray-800 dark:text-white/90">
              {{ formatPhone(refundPhone) }}
            </dd>
          </div>
        </dl>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Не больше цены брони ({{ formatPrice(summary.price_total) }}) и оплаченного через Kaspi,
          за вычетом прошлых возвратов.
          <template v-if="firstPaidAt">Первая оплата: {{ formatDateTime(firstPaidAt) }}.</template>
        </p>
      </div>

      <!-- Uncertain outcome: never retry -->
      <div v-if="checkingRow" role="alert" :class="warnBox">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Исход возврата {{ formatPrice(checkingRow.amount) }} не подтверждён — деньги могли уже
          уйти. Не повторяйте возврат ни здесь, ни в Kaspi: исход отмечается в кабинете ApiPay.
        </p>
      </div>

      <!-- Why nothing can be refunded -->
      <p v-if="summary.blocked_reason === 'no_apipay'" :class="mutedBox">
        По брони нет оплат через Kaspi (ApiPay) — через систему вернуть нечего.
      </p>
      <div
        v-else-if="summary.blocked_reason === 'in_progress'"
        class="flex items-center justify-between gap-3"
        :class="mutedBox"
      >
        <p>Идёт возврат — дождитесь его результата. Второй по этому счёту не создаётся.</p>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          @click="load(true)"
        >
          <RotateCcw class="h-3.5 w-3.5" /> Обновить
        </button>
      </div>
      <p v-else-if="summary.blocked_reason === 'nothing_left'" :class="mutedBox">
        Вся сумма, оплаченная через Kaspi, уже возвращена.
      </p>

      <!-- Refund form -->
      <form v-if="refundable > 0" class="space-y-4" @submit.prevent="askConfirm">
        <div>
          <div class="mb-1.5 flex items-baseline justify-between gap-3">
            <label
              for="booking-refund-amount"
              class="text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Сумма возврата
            </label>
            <button
              type="button"
              class="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              :disabled="saving"
              @click="fillMax"
            >
              Вся сумма · {{ formatPrice(refundable) }}
            </button>
          </div>
          <input
            id="booking-refund-amount"
            v-model.number="amount"
            type="number"
            min="1"
            :max="refundable"
            step="1"
            inputmode="numeric"
            placeholder="0"
            :disabled="saving"
            :aria-invalid="!!amountError"
            aria-describedby="booking-refund-amount-hint"
            :class="inputClass"
          />
          <p
            v-if="amountError"
            id="booking-refund-amount-hint"
            class="mt-1.5 text-xs text-error-600 dark:text-error-500"
          >
            {{ amountError }}
          </p>
        </div>

        <div>
          <label
            for="booking-refund-comment"
            class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            Комментарий
          </label>
          <textarea
            id="booking-refund-comment"
            v-model="comment"
            rows="2"
            maxlength="500"
            placeholder="Причина возврата (необязательно)"
            :disabled="saving"
            :class="inputClass"
            class="h-auto resize-y"
          ></textarea>
        </div>

        <p v-if="error" role="alert" class="text-sm text-error-600 dark:text-error-500">
          {{ error }}
        </p>

        <!-- Step 1 -->
        <div v-if="!confirming" class="flex justify-end gap-3 pt-1">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            @click="emit('close')"
          >
            Закрыть
          </button>
          <button
            type="submit"
            :disabled="!amountValid"
            class="rounded-lg bg-error-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-error-700 disabled:opacity-60"
          >
            Вернуть через Kaspi
          </button>
        </div>

        <!-- Step 2: money leaves for real -->
        <div
          v-else
          class="space-y-3 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10"
        >
          <p class="text-sm text-error-700 dark:text-error-400">
            Вернуть <b>{{ formatPrice(Number(amount)) }}</b> на Kaspi
            <b v-if="refundPhone">{{ formatPhone(refundPhone) }}</b
            >? Деньги уйдут клиенту, отменить возврат нельзя. Клиент получит сообщение в WhatsApp,
            когда ApiPay подтвердит возврат.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              :disabled="saving"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              @click="confirming = false"
            >
              Назад
            </button>
            <button
              type="button"
              :disabled="saving"
              class="inline-flex items-center gap-2 rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-60"
              @click="submit"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              {{ error ? 'Повторить' : 'Да, вернуть' }}
            </button>
          </div>
        </div>
      </form>

      <p
        v-if="notice"
        role="status"
        class="rounded-lg bg-success-50 px-4 py-2.5 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400"
      >
        {{ notice }}
      </p>
      <p
        v-if="error && refundable <= 0"
        role="alert"
        class="text-sm text-error-600 dark:text-error-500"
      >
        {{ error }}
      </p>

      <!-- History -->
      <div v-if="summary.refunds.length">
        <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">История возвратов</p>
        <ul class="divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <li v-for="r in summary.refunds" :key="r.id" class="py-2">
            <div class="flex items-center justify-between gap-3">
              <span class="flex items-center gap-2">
                <span class="font-medium tabular-nums text-gray-800 dark:text-white/90">
                  {{ formatPrice(r.amount) }}
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-theme-xs font-medium"
                  :class="STATE_META[r.state]?.cls"
                >
                  {{ STATE_META[r.state]?.label ?? r.state }}
                </span>
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDateTime(r.created_at) }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ rowNote(r) }}</p>
            <p
              v-if="r.state === 'failed' && r.error_message"
              class="text-xs text-error-600 dark:text-error-500"
            >
              {{ r.error_message }}
            </p>
          </li>
        </ul>
      </div>

      <!-- All payments, for reference -->
      <details>
        <summary
          class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Все оплаты по брони
        </summary>
        <div class="mt-3">
          <PaymentSummary
            :booking="booking"
            :refunded-total="summary.refunded_total"
            :paid-total="summary.paid_total"
          />
        </div>
      </details>
    </template>
  </div>
</template>
