<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ArrowRight,
} from 'lucide-vue-next'
import {
  createBookingsBatch,
  formatPrice,
  FIELD_TYPE_LABEL,
  REPEAT_MODE_LABEL,
  RESERVATION_TTL_MINUTES,
} from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const store = useBookingStore()
const auth = useAuthStore()

const isManager = computed(() =>
  ['manager', 'super_admin', 'admin'].includes(auth.user?.role ?? ''),
)

const dialog = ref<HTMLDialogElement | null>(null)

type Step = 'review' | 'payment'
const step = ref<Step>('review')
const status = ref<'idle' | 'processing' | 'error'>('idle')
const errorMessage = ref('')
const paid = ref(false)

const form = reactive({ customer: '', phone: '', notes: '', prepayment: '' })

function resetState() {
  step.value = 'review'
  status.value = 'idle'
  errorMessage.value = ''
  paid.value = false
  form.customer = ''
  form.phone = ''
  form.notes = ''
  form.prepayment = ''
}

async function createDraft() {
  if (!store.field || store.count === 0) return
  status.value = 'processing'
  errorMessage.value = ''
  try {
    await createBookingsBatch({
      slots: store.batchSlots,
      customer: form.customer.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      // `type="number"` input → Vue v-model даёт number (или '' когда поле пустое).
      prepayment:
        isManager.value && form.prepayment !== '' && !Number.isNaN(Number(form.prepayment))
          ? Number(form.prepayment)
          : undefined,
      reserved_until: RESERVATION_TTL_MINUTES,
      updated_by: auth.user?.name || auth.user?.email || undefined,
    })
    status.value = 'idle'
    step.value = 'payment'
    // Черновик создан — сообщаем родителю (страница перезагрузится при закрытии,
    // чтобы сетка сразу отразила занятый слот).
    emit('created')
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось создать бронь'
  }
}

function mockPay() {
  paid.value = true
}

function finish() {
  emit('created')
  store.clearSlots()
  emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState()
      dialog.value?.showModal()
    } else {
      dialog.value?.close()
    }
  },
)

function onDialogClose() {
  if (props.open) emit('close')
}
function onBackdropClick(e: MouseEvent) {
  if (e.target === dialog.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="booking-dialog m-auto w-[min(34rem,94vw)] max-h-[90vh] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
    aria-labelledby="booking-modal-title"
    @close="onDialogClose"
    @click="onBackdropClick"
  >
    <div class="flex max-h-[90vh] flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div class="min-w-0">
          <h2 id="booking-modal-title" class="text-lg font-bold text-gray-900">
            {{ step === 'review' ? 'Новая бронь' : 'Оплата' }}
          </h2>
          <p v-if="store.field" class="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
            <span
              class="rounded-full bg-success-600 px-2 py-0.5 text-[11px] font-bold leading-none text-white"
              >{{ FIELD_TYPE_LABEL[store.field.type] }}</span
            >
            {{ store.field.name }}
          </p>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          <X class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-auto px-5 py-4">
        <!-- Step 1: review + contact -->
        <template v-if="step === 'review'">
          <div class="space-y-4">
            <div v-for="g in store.intervalGroups" :key="g.date">
              <div class="mb-1.5 flex items-baseline justify-between">
                <p class="text-xs font-semibold uppercase text-gray-500">{{ g.label }}</p>
                <p class="text-xs text-gray-500">{{ formatPrice(g.subtotal) }}</p>
              </div>
              <ul class="space-y-1.5">
                <li
                  v-for="iv in g.intervals"
                  :key="iv.id"
                  class="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5 text-sm"
                >
                  <span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
                    {{ iv.start }}–{{ iv.end }}
                    <span
                      v-if="store.ruleFor(iv.id)"
                      class="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-semibold text-success-700"
                    >
                      {{ REPEAT_MODE_LABEL[store.ruleFor(iv.id)!.mode] }} · до
                      {{ store.ruleFor(iv.id)!.until }} · ×{{ iv.count }}
                    </span>
                  </span>
                  <span class="shrink-0 text-right text-gray-600">
                    {{ formatPrice(iv.lineTotal) }}
                    <span v-if="iv.count > 1" class="block text-[10px] text-gray-400">
                      {{ formatPrice(iv.price) }} × {{ iv.count }}
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-5 grid gap-3">
            <input
              v-model="form.customer"
              placeholder="Имя клиента"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600"
            />
            <input
              v-model="form.phone"
              type="tel"
              placeholder="Телефон"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600"
            />
            <textarea
              v-model="form.notes"
              rows="2"
              placeholder="Заметка (необязательно)"
              class="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600"
            />
            <div v-if="isManager">
              <label
                for="booking-prepayment"
                class="mb-1 block text-xs font-semibold uppercase text-gray-500"
                >Сумма предоплаты</label
              >
              <input
                id="booking-prepayment"
                v-model="form.prepayment"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                placeholder="0"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600"
              />
            </div>
          </div>

          <div
            v-if="status === 'error'"
            role="alert"
            class="mt-4 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm"
          >
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-error-500" aria-hidden="true" />
            <span class="text-gray-700">{{ errorMessage }}</span>
          </div>
        </template>

        <!-- Step 2: payment (mock) -->
        <template v-else>
          <div
            v-if="!paid"
            class="flex flex-col items-center gap-3 py-4 text-center"
          >
            <div class="grid h-12 w-12 place-items-center rounded-full bg-success-50">
              <CheckCircle2 class="h-7 w-7 text-success-600" aria-hidden="true" />
            </div>
            <p class="font-semibold text-gray-900">Черновик брони создан</p>
            <p class="max-w-xs text-sm text-gray-500">
              Оплата пока в разработке — здесь появится платёжный процесс. Нажмите «Оплатить», чтобы
              сымитировать успешную оплату.
            </p>
          </div>

          <div v-else class="flex flex-col items-center gap-3 py-6 text-center">
            <div class="grid h-12 w-12 place-items-center rounded-full bg-success-50">
              <CheckCircle2 class="h-7 w-7 text-success-600" aria-hidden="true" />
            </div>
            <p class="font-semibold text-gray-900">Оплата прошла (демо)</p>
            <p class="text-sm text-gray-500">Бронь оформлена.</p>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">
        <div>
          <p class="text-xs text-gray-500">Итого</p>
          <p class="text-xl font-bold text-gray-900">{{ formatPrice(store.projectedTotal) }}</p>
        </div>

        <button
          v-if="step === 'review'"
          type="button"
          :disabled="store.count === 0 || status === 'processing'"
          class="flex items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          @click="createDraft"
        >
          <Loader2 v-if="status === 'processing'" class="h-5 w-5 animate-spin" aria-hidden="true" />
          <template v-else>Создать бронь <ArrowRight class="h-5 w-5" aria-hidden="true" /></template>
        </button>

        <button
          v-else-if="!paid"
          type="button"
          class="flex items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-success-700"
          @click="mockPay"
        >
          <CreditCard class="h-5 w-5" aria-hidden="true" /> Оплатить
        </button>

        <button
          v-else
          type="button"
          class="rounded-full bg-success-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-success-700"
          @click="finish"
        >
          Готово
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.booking-dialog::backdrop {
  background: color-mix(in srgb, var(--color-gray-900) 55%, transparent);
  backdrop-filter: blur(2px);
}
.booking-dialog[open] {
  animation: booking-dialog-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes booking-dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
@media (prefers-reduced-motion: reduce) {
  .booking-dialog[open] {
    animation: none;
  }
}
</style>
