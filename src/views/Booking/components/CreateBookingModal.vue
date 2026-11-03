<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Search,
  UserRound,
  X,
} from 'lucide-vue-next'
import {
  createBookingsBatch,
  formatPrice,
  HOLD_WITHOUT_PAYMENT_TTL_MINUTES,
  PREPAYMENT_PER_SLOT,
  RESERVATION_TTL_MINUTES,
} from '@/services/booking'
import {
  createDiscount as createDiscountRequest,
  discountUsageLeft,
  listDiscounts,
  type Discount,
  type DiscountStatus,
} from '@/services/discounts'
import {
  createCustomer as createCustomerRequest,
  findCustomerByPhone,
  type Customer,
} from '@/services/customers'
import { ApiError } from '@/services/api'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()
const store = useBookingStore(),
  auth = useAuthStore()
const dialog = ref<HTMLDialogElement | null>(null),
  customerDialog = ref<HTMLDialogElement | null>(null),
  discountDialog = ref<HTMLDialogElement | null>(null),
  step = ref<1 | 2 | 3>(1),
  busy = ref(false),
  error = ref('')
const form = reactive({ phone: '', notes: '', prepayment: '', kaspiPhone: '' })
const holdWithoutPayment = ref(false)
const holdCreated = ref(false)
// Бронь админа ждёт подтверждения клиента в WhatsApp (state awaiting_consent).
const consentPending = ref(false)
const customer = ref<Customer | null>(null),
  checked = ref(false),
  customerModal = ref(false),
  customerName = ref(''),
  customerCreating = ref(false)
const discountModal = ref(false),
  discountCreated = ref(false),
  discountCreating = ref(false),
  discountError = ref(''),
  discounts = ref<Discount[]>([]),
  selected = ref<(number | null)[]>([])
const draft = reactive({
  amount: 10000,
  usageLimit: 5,
  condition: '',
  status: 'pending' as DiscountStatus,
})
const isSuper = computed(() => auth.role === 'super_admin')
const canHoldWithoutPayment = computed(() => ['admin', 'super_admin'].includes(auth.role))
const canCreateDiscount = computed(() => ['admin', 'super_admin'].includes(auth.role))
const discountDraftValid = computed(
  () =>
    Number(draft.amount) > 0 &&
    Number.isInteger(Number(draft.usageLimit)) &&
    Number(draft.usageLimit) > 0,
)
const canCheckPhone = computed(() => form.phone.replace(/\D/g, '').length > 0)
// A match from /manager/customers is authoritative: contacts/booking rows are
// never used to infer registration in this flow.
const customerReady = computed(() => customer.value !== null)
const rows = computed(() => store.batchSlots)
const selectedRows = computed(() =>
  selected.value.map((id) => discounts.value.find((d) => d.id === id)),
)
const discountTotal = computed(() =>
  rows.value.reduce((sum, _, i) => {
    const interval = store.intervals[i]
    const occurrences = interval ? store.occurrenceCount(interval.id) : 1
    const perOccurrence = Math.min(
      interval?.price ?? 0,
      selectedRows.value[i]?.discount_amount ?? 0,
    )
    return sum + perOccurrence * occurrences
  }, 0),
)
const finalTotal = computed(() => Math.max(0, store.projectedTotal - discountTotal.value))
const kaspiDigits = computed(() => form.kaspiPhone.replace(/\D/g, ''))
const kaspiValid = computed(() => kaspiDigits.value.length === 11)
/** '77015551212' → '+7 701 555 12 12'. */
function formatKzPhone(raw: string) {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return raw
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}
const prepayment = computed(() =>
  Math.min(finalTotal.value, Math.max(0, Number(form.prepayment) || 0)),
)

function reset() {
  step.value = 1
  busy.value = false
  error.value = ''
  form.phone = ''
  form.notes = ''
  form.prepayment = ''
  form.kaspiPhone = ''
  consentPending.value = false
  holdWithoutPayment.value = false
  holdCreated.value = false
  customer.value = null
  checked.value = false
  discounts.value = []
  selected.value = []
  customerModal.value = false
  customerName.value = ''
  discountModal.value = false
  discountCreated.value = false
  discountError.value = ''
}
async function loadDiscounts() {
  if (!customer.value) return
  discounts.value = await listDiscounts({ phone: customer.value.phone, available_only: true })
}
async function checkCustomer() {
  busy.value = true
  error.value = ''
  try {
    customer.value = await findCustomerByPhone(form.phone)
    checked.value = true
    if (customerReady.value) await loadDiscounts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось найти клиента'
  } finally {
    busy.value = false
  }
}
function clearCustomerCheck() {
  customer.value = null
  checked.value = false
}
async function createCustomer() {
  if (!canCheckPhone.value || customerCreating.value) return
  customerCreating.value = true
  error.value = ''
  try {
    customer.value = await createCustomerRequest({
      name: customerName.value || undefined,
      phone: form.phone,
      is_regular_customer: false,
    })
    customerModal.value = false
    customerName.value = ''
    await loadDiscounts()
  } catch (e) {
    if (e instanceof ApiError && e.code === 'CONFLICT') {
      customer.value = await findCustomerByPhone(form.phone)
      customerModal.value = false
      if (customer.value) await loadDiscounts()
    } else error.value = e instanceof Error ? e.message : 'Не удалось создать клиента'
  } finally {
    customerCreating.value = false
  }
}
function goNext() {
  if (!customerReady.value) return
  step.value = 2
  form.prepayment = String(Math.min(PREPAYMENT_PER_SLOT, finalTotal.value))
  // Номер для оплаты по умолчанию — контактный; менеджер может заменить.
  if (customer.value && !form.kaspiPhone) form.kaspiPhone = formatKzPhone(customer.value.phone)
}
function discountAvailable(d: Discount, i: number) {
  const assignedElsewhere = selected.value.reduce<number>((count, id, index) => {
    if (index === i || id !== d.id) return count
    const interval = store.intervals[index]
    return count + (interval ? store.occurrenceCount(interval.id) : 1)
  }, 0)
  const interval = store.intervals[i]
  const neededHere = interval ? store.occurrenceCount(interval.id) : 1
  return discountUsageLeft(d) - assignedElsewhere >= neededHere
}
function recalcPrepayment() {
  form.prepayment = String(Math.min(PREPAYMENT_PER_SLOT, finalTotal.value))
}
async function createDiscount() {
  if (!customer.value || !canCreateDiscount.value || !discountDraftValid.value) return
  discountCreating.value = true
  discountError.value = ''
  try {
    await createDiscountRequest({
      customer_id: customer.value.id,
      discount_amount: Number(draft.amount),
      usage_limit: Number(draft.usageLimit),
      condition: draft.condition.trim() || null,
      status: isSuper.value ? draft.status : 'pending',
    })
    discountModal.value = false
    discountCreated.value = true
    await loadDiscounts()
    window.setTimeout(() => (discountCreated.value = false), 3500)
  } catch (e) {
    discountError.value = e instanceof Error ? e.message : 'Не удалось создать скидку'
  } finally {
    discountCreating.value = false
  }
}
function openDiscountModal() {
  draft.amount = 10000
  draft.usageLimit = 5
  draft.condition = ''
  draft.status = 'pending'
  discountError.value = ''
  discountModal.value = true
}
async function submit() {
  if (!customerReady.value || !customer.value || (!holdWithoutPayment.value && !kaspiValid.value))
    return
  busy.value = true
  error.value = ''
  try {
    const res = await createBookingsBatch({
      slots: rows.value.map((row, i) => ({
        ...row,
        discount_id: selected.value[i] ?? null,
      })),
      customer: customer.value.name || undefined,
      customer_id: customer.value.id,
      phone: customer.value.phone,
      notes: form.notes || undefined,
      prepayment: holdWithoutPayment.value ? 0 : prepayment.value,
      reserved_until: holdWithoutPayment.value
        ? HOLD_WITHOUT_PAYMENT_TTL_MINUTES
        : RESERVATION_TTL_MINUTES,
      hold_without_payment: holdWithoutPayment.value,
      kaspi_phone: holdWithoutPayment.value ? undefined : `+${kaspiDigits.value}`,
    })
    consentPending.value = res?.consent?.status === 'pending'
    holdCreated.value = res?.hold_without_payment === true
    step.value = 3
    emit('created')
  } catch (e) {
    if (
      e instanceof ApiError &&
      ['DISCOUNT_NOT_FOUND', 'DISCOUNT_CUSTOMER_MISMATCH', 'DISCOUNT_UNAVAILABLE'].includes(
        e.code ?? '',
      )
    ) {
      selected.value = rows.value.map(() => null)
      await loadDiscounts()
    }
    if (
      e instanceof ApiError &&
      [
        'CUSTOMER_REQUIRED',
        'INVALID_CUSTOMER',
        'CUSTOMER_NOT_FOUND',
        'CUSTOMER_PHONE_MISMATCH',
      ].includes(e.code ?? '')
    ) {
      step.value = 1
      customer.value = null
      checked.value = false
      discounts.value = []
    }
    error.value = e instanceof Error ? e.message : 'Не удалось создать бронь'
  } finally {
    busy.value = false
  }
}
function finish() {
  store.clearSlots()
  emit('close')
}
watch(
  () => props.open,
  (open) => {
    if (open) {
      reset()
      dialog.value?.showModal()
    } else dialog.value?.close()
  },
)
watch(
  discountModal,
  (open) => {
    if (open && !discountDialog.value?.open) discountDialog.value?.showModal()
    if (!open && discountDialog.value?.open) discountDialog.value.close()
  },
  { flush: 'post' },
)
watch(
  customerModal,
  (open) => {
    if (open && !customerDialog.value?.open) customerDialog.value?.showModal()
    if (!open && customerDialog.value?.open) customerDialog.value.close()
  },
  { flush: 'post' },
)
</script>

<template>
  <dialog
    ref="dialog"
    class="booking-dialog m-auto w-[min(38rem,94vw)] max-h-[calc(100dvh-1.5rem)] rounded-2xl bg-white p-0 text-gray-800 shadow-xl"
    @close="props.open && emit('close')"
  >
    <div class="flex max-h-[calc(100dvh-1.5rem)] flex-col">
      <header class="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4">
        <div>
          <h2 class="text-lg font-bold">
            {{ step === 1 ? 'Клиент' : step === 2 ? 'Детали брони' : 'Готово' }}
          </h2>
          <p class="text-sm text-gray-500">{{ store.field?.name }}</p>
        </div>
        <button
          class="-mr-1 shrink-0 rounded-full p-2.5 hover:bg-gray-100"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </header>
      <div v-if="step < 3" class="flex gap-2 px-4 pt-4 sm:px-6">
        <i class="h-1 flex-1 rounded bg-success-600"></i
        ><i class="h-1 flex-1 rounded" :class="step === 2 ? 'bg-success-600' : 'bg-gray-200'"></i>
      </div>
      <main class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <section v-if="step === 1" class="space-y-5">
          <div>
            <label class="mb-1 block text-sm font-medium">Номер телефона</label>
            <div class="flex gap-2">
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+7 701 555 12 12"
                class="h-11 flex-1 rounded-lg border px-4"
                @input="clearCustomerCheck"
              /><button
                :disabled="!canCheckPhone || busy"
                class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm text-white disabled:opacity-40"
                @click="checkCustomer"
              >
                <Search class="h-4 w-4" />Проверить
              </button>
            </div>
            <p v-if="form.phone && !canCheckPhone" class="mt-1 text-xs text-error-600">
              Введите номер телефона
            </p>
            <p v-else-if="error" class="mt-1 text-xs text-error-600">{{ error }}</p>
          </div>
          <div
            v-if="customer"
            class="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 p-4"
          >
            <UserRound class="h-8 w-8 rounded-full bg-white p-1.5 text-success-700" />
            <div>
              <b>{{ customer.name }}</b>
              <p class="text-sm text-gray-500">+{{ customer.phone }}</p>
            </div>
            <CheckCircle2 class="ml-auto h-5 w-5 text-success-600" />
          </div>
          <div v-else-if="checked" class="rounded-xl border border-dashed p-5 text-center">
            <p class="text-sm text-gray-600">
              {{ customer ? 'Клиент ещё не зарегистрирован' : 'Клиент не найден' }}
            </p>
            <button
              type="button"
              class="mt-3 rounded-lg bg-success-600 px-4 py-2 text-sm text-white"
              @click="customerModal = true"
            >
              Создать клиента
            </button>
          </div>
        </section>
        <section v-else-if="step === 2" class="space-y-5">
          <div class="rounded-xl border">
            <h3 class="border-b px-4 py-3 text-sm font-semibold">Выбранные записи</h3>
            <div
              v-for="(row, i) in rows"
              :key="`${row.date}-${row.time_start}`"
              class="grid gap-3 border-b p-4 last:border-0 sm:grid-cols-[1fr_250px]"
            >
              <div>
                <b class="text-sm">{{ row.date }} · {{ row.time_start }}–{{ row.time_end }}</b>
                <p class="text-xs text-gray-500">
                  {{ formatPrice(store.intervals[i]?.price ?? 0) }}
                </p>
              </div>
              <label class="text-xs text-gray-500"
                >Скидка<select
                  v-model="selected[i]"
                  class="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm"
                  @change="recalcPrepayment"
                >
                  <option :value="null">Без скидки</option>
                  <option
                    v-for="d in discounts"
                    :key="d.id"
                    :value="d.id"
                    :disabled="!discountAvailable(d, i)"
                  >
                    {{ formatPrice(d.discount_amount) }} · осталось {{ discountUsageLeft(d)
                    }}{{ d.condition ? ` · ${d.condition}` : '' }}
                  </option>
                </select></label
              >
            </div>
          </div>
          <div class="flex justify-between">
            <span></span
            ><button
              v-if="canCreateDiscount"
              class="inline-flex items-center gap-1 text-sm font-medium text-success-700"
              @click="openDiscountModal"
            >
              <BadgePercent class="h-4 w-4" />Создать скидку
            </button>
          </div>
          <p
            v-if="discountCreated"
            class="flex items-center gap-2 rounded-lg bg-success-50 p-3 text-sm text-success-700"
          >
            <CheckCircle2 class="h-4 w-4" />Заявка создана
          </p>
          <label
            v-if="canHoldWithoutPayment"
            class="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <input
              v-model="holdWithoutPayment"
              type="checkbox"
              class="mt-1 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span>
              <b class="block text-sm">Удержать слот 24 часа без оплаты</b>
              <small class="text-gray-600"
                >Счёт и аванс не создаются. Если оплату не запустить, слот освободится автоматически
                через 24 часа.</small
              >
            </span>
          </label>
          <label v-if="!holdWithoutPayment" class="block text-sm font-medium"
            >Предоплата<input
              v-model="form.prepayment"
              type="number"
              min="0"
              :max="finalTotal"
              class="mt-1 h-11 w-full rounded-lg border px-4"
            /><small class="text-gray-500"
              >По умолчанию: до {{ formatPrice(PREPAYMENT_PER_SLOT) }}</small
            ></label
          >
          <label v-if="!holdWithoutPayment" class="block text-sm font-medium"
            >Номер для оплаты (Kaspi)<input
              v-model="form.kaspiPhone"
              type="tel"
              placeholder="+7 701 555 12 12"
              class="mt-1 h-11 w-full rounded-lg border px-4"
            /><small v-if="form.kaspiPhone && !kaspiValid" class="text-error-600"
              >Введите номер полностью: +7 XXX XXX XX XX</small
            ><small v-else class="text-gray-500"
              >На этот номер уйдёт счёт Kaspi на аванс. По умолчанию — номер клиента.</small
            ></label
          >
          <label class="block text-sm font-medium"
            >Заметка<textarea
              v-model="form.notes"
              rows="2"
              class="mt-1 w-full rounded-lg border px-4 py-2"
            ></textarea>
          </label>
          <dl class="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
            <div class="flex justify-between">
              <dt>Стоимость</dt>
              <dd>{{ formatPrice(store.projectedTotal) }}</dd>
            </div>
            <div class="flex justify-between text-success-700">
              <dt>Скидка</dt>
              <dd>− {{ formatPrice(discountTotal) }}</dd>
            </div>
            <div class="flex justify-between border-t pt-2 text-base font-bold">
              <dt>Итого</dt>
              <dd>{{ formatPrice(finalTotal) }}</dd>
            </div>
          </dl>
          <p v-if="error" class="text-sm text-error-600">{{ error }}</p>
        </section>
        <section v-else class="py-10 text-center">
          <CheckCircle2 class="mx-auto h-14 w-14 text-success-600" />
          <h3 class="mt-3 text-xl font-bold">Бронь создана</h3>
          <p v-if="holdCreated" class="text-sm text-gray-500">
            Слот удерживается 24 часа без оплаты и без счёта
          </p>
          <p v-else class="text-sm text-gray-500">Предоплата {{ formatPrice(prepayment) }}</p>
          <div
            v-if="consentPending"
            class="mx-auto mt-5 flex max-w-sm items-start gap-3 rounded-xl border border-blue-light-200 bg-blue-light-50 p-4 text-left text-sm text-blue-light-700"
          >
            <MessageCircle class="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Клиенту отправлено сообщение в WhatsApp: он должен подтвердить бронь и принять оферту.
              Счёт на аванс уйдёт только после согласия. Без ответа в течение 30 минут бронь
              отменится автоматически.
            </p>
          </div>
        </section>
      </main>
      <footer class="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6 sm:py-4">
        <button v-if="step === 2" class="inline-flex items-center gap-2 text-sm" @click="step = 1">
          <ArrowLeft class="h-4 w-4" />Назад</button
        ><span v-else></span
        ><button
          v-if="step === 1"
          :disabled="!customerReady"
          class="inline-flex items-center gap-2 rounded-full bg-success-600 px-6 py-3 font-semibold text-white disabled:bg-gray-200"
          @click="goNext"
        >
          Далее<ArrowRight class="h-4 w-4" /></button
        ><button
          v-else-if="step === 2"
          :disabled="busy || (!holdWithoutPayment && !kaspiValid)"
          class="inline-flex items-center gap-2 rounded-full bg-success-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          @click="submit"
        >
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />Создать бронь</button
        ><button
          v-else
          class="rounded-full bg-success-600 px-6 py-3 font-semibold text-white"
          @click="finish"
        >
          Готово
        </button>
      </footer>
    </div>
  </dialog>
  <dialog
    ref="customerDialog"
    class="nested-dialog m-auto w-[min(27rem,92vw)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
    @close="customerModal = false"
    @cancel.prevent="customerModal = false"
  >
    <form @submit.prevent="createCustomer">
      <h3 class="text-lg font-bold">Новый клиент</h3>
      <label class="block text-sm"
        >Имя (необязательно)<input
          v-model="customerName"
          class="mt-1 h-11 w-full rounded-lg border px-4" /></label
      ><label class="mt-3 block text-sm"
        >Телефон<input
          :value="form.phone"
          disabled
          class="mt-1 h-11 w-full rounded-lg border bg-gray-50 px-4"
      /></label>
      <p v-if="error" class="mt-3 text-sm text-error-600">{{ error }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2" @click="customerModal = false">
          Отмена</button
        ><button
          :disabled="customerCreating || !canCheckPhone"
          class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-white disabled:opacity-50"
        >
          <Loader2 v-if="customerCreating" class="h-4 w-4 animate-spin" />Создать
        </button>
      </div>
    </form>
  </dialog>
  <dialog
    ref="discountDialog"
    class="nested-dialog m-auto w-[min(28rem,92vw)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
    @close="discountModal = false"
    @cancel.prevent="discountModal = false"
  >
    <form @submit.prevent="createDiscount">
      <h3 class="text-lg font-bold">Новая скидка</h3>
      <label class="block text-sm"
        >Клиент<input
          :value="customer?.name"
          disabled
          class="mt-1 h-11 w-full rounded-lg border bg-gray-50 px-4" /></label
      ><label class="mt-3 block text-sm"
        >Сумма<input
          v-model.number="draft.amount"
          type="number"
          min="1"
          class="mt-1 h-11 w-full rounded-lg border px-4" /></label
      ><label class="mt-3 block text-sm"
        >Условие<textarea
          v-model="draft.condition"
          rows="2"
          class="mt-1 w-full rounded-lg border px-4 py-2"
        ></textarea></label
      ><label class="mt-3 block text-sm"
        >Использований<input
          v-model.number="draft.usageLimit"
          type="number"
          min="1"
          class="mt-1 h-11 w-full rounded-lg border px-4" /></label
      ><label class="mt-3 block text-sm"
        >Статус<select
          v-model="draft.status"
          :disabled="!isSuper"
          class="mt-1 h-11 w-full rounded-lg border px-4 disabled:bg-gray-50"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select></label
      >
      <p v-if="!isSuper" class="mt-2 text-xs text-error-600">
        Только главный админ может менять статус
      </p>
      <p v-if="discountError" class="mt-3 text-sm text-error-600">{{ discountError }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2" @click="discountModal = false">
          Отмена</button
        ><button
          :disabled="discountCreating || !discountDraftValid"
          class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Loader2 v-if="discountCreating" class="h-4 w-4 animate-spin" />Создать
        </button>
      </div>
    </form>
  </dialog>
</template>
<style scoped>
.booking-dialog::backdrop,
.nested-dialog::backdrop {
  background: rgb(17 24 39/0.55);
  backdrop-filter: blur(2px);
}
.booking-dialog[open],
.nested-dialog[open] {
  animation: modal-in 0.2s ease-out;
}
.nested-dialog {
  z-index: 1000001;
}
@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>
