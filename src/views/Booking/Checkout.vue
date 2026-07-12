<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  User,
  Phone,
  CreditCard,
  Lock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  ArrowRight,
} from 'lucide-vue-next'
import type { BookingConfirmation } from '@/types'
import {
  submitBooking,
  formatPrice,
  groupSlotsByDate,
  directionsUrl,
  FIELD_TYPE_LABEL,
} from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import BookingHeader from './components/BookingHeader.vue'

const router = useRouter()
const store = useBookingStore()

type Status = 'idle' | 'processing' | 'error' | 'success'
const status = ref<Status>('idle')
const errorMessage = ref('')
const confirmation = ref<BookingConfirmation | null>(null)

const confirmationGroups = computed(() =>
  confirmation.value ? groupSlotsByDate(confirmation.value.slots) : [],
)

const form = reactive({ name: '', phone: '', cardName: '', cardNumber: '', expiry: '', cvc: '' })
const errors = reactive({ name: '', phone: '', cardName: '', cardNumber: '', expiry: '', cvc: '' })

function onCardInput(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16)
  form.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim()
}
function onExpiryInput(e: Event) {
  const digits = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4)
  form.expiry = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}
function onCvcInput(e: Event) {
  form.cvc = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4)
}

function validate(): boolean {
  errors.name = form.name.trim() ? '' : 'Введите имя'
  errors.phone = form.phone.trim() ? '' : 'Введите номер телефона'
  errors.cardName = form.cardName.trim() ? '' : 'Введите имя держателя'
  errors.cardNumber = form.cardNumber.replace(/\s/g, '').length === 16 ? '' : 'Введите 16 цифр карты'
  const exp = /^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)
  errors.expiry = exp ? '' : 'ММ/ГГ'
  errors.cvc = form.cvc.length >= 3 ? '' : 'CVC'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  if (!validate() || !store.field) return
  status.value = 'processing'
  errorMessage.value = ''
  try {
    const result = await submitBooking({
      fieldId: store.field.id,
      slots: store.selectedSlots,
      name: form.name,
      phone: form.phone,
      cardNumber: form.cardNumber,
    })
    confirmation.value = result
    status.value = 'success'
    store.clear()
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось выполнить оплату'
  }
}

function newBooking() {
  confirmation.value = null
  status.value = 'idle'
  router.push('/booking')
}

let redirectTimer: ReturnType<typeof setTimeout> | null = null
onMounted(() => {
  // Direct hit / refresh with no draft in memory → back to selection.
  if (!store.field || store.count === 0) {
    redirectTimer = setTimeout(() => router.replace('/booking'), 0)
  }
})
onBeforeUnmount(() => {
  if (redirectTimer) clearTimeout(redirectTimer)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-800" style="font-family: Outfit, sans-serif">
    <BookingHeader
      :back="store.field ? { to: `/booking/${store.field.id}`, label: 'Назад к выбору' } : undefined"
    />

    <!-- Success -->
    <main
      v-if="status === 'success' && confirmation"
      class="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 ring-1 ring-success-500/30">
        <CheckCircle2 class="h-9 w-9 text-success-600" aria-hidden="true" />
      </div>
      <h1 class="mt-6 text-2xl font-bold text-gray-900">Бронь подтверждена</h1>
      <p class="mt-2 text-gray-500">
        Номер брони <span class="font-semibold text-gray-900">{{ confirmation.ref }}</span>. Мы отправили
        детали на WhatsApp — приходите за 15 минут до начала.
      </p>

      <div class="mt-8 w-full rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-theme-sm">
        <p class="text-lg font-bold text-gray-900">{{ confirmation.field.name }}</p>
        <div class="mt-4 space-y-4">
          <div v-for="g in confirmationGroups" :key="g.date">
            <p class="text-xs font-semibold uppercase text-gray-500">{{ g.label }}</p>
            <ul class="mt-1.5 space-y-1.5 text-sm">
              <li
                v-for="s in g.slots"
                :key="s.id"
                class="flex justify-between border-b border-gray-100 pb-1.5"
              >
                <span class="text-gray-700">{{ s.start }}–{{ s.end }}</span>
                <span class="text-gray-600">{{ formatPrice(s.price) }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
          <span class="text-sm text-gray-500">Оплачено</span>
          <span class="text-2xl font-bold text-gray-900">{{ formatPrice(confirmation.total) }}</span>
        </div>
      </div>

      <div class="mt-6 flex w-full flex-col gap-3 sm:flex-row">
        <a
          :href="directionsUrl()"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-success-600 hover:text-success-600"
        >
          <Navigation class="h-4 w-4" aria-hidden="true" /> Маршрут
        </a>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-success-600 px-5 py-3 text-base font-semibold text-white hover:bg-success-700"
          @click="newBooking"
        >
          Забронировать ещё
        </button>
      </div>
    </main>

    <!-- Checkout form -->
    <main v-else-if="store.field && store.count > 0" class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 class="mb-8 text-3xl font-bold text-gray-900">Оформление</h1>

      <div class="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <!-- Forms -->
        <form class="space-y-8" novalidate @submit.prevent="submit">
          <!-- Contact -->
          <fieldset class="space-y-5">
            <legend class="mb-4 text-lg font-bold text-gray-900">Контактные данные</legend>
            <div class="grid gap-5 sm:grid-cols-2">
              <div class="space-y-2">
                <label for="co-name" class="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User class="h-4 w-4 text-success-600" aria-hidden="true" /> Имя и фамилия
                </label>
                <input
                  id="co-name"
                  v-model="form.name"
                  placeholder="Иван Иванов"
                  :aria-invalid="!!errors.name"
                  :aria-describedby="errors.name ? 'co-name-err' : undefined"
                  class="w-full rounded-lg border bg-white px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-success-600"
                  :class="errors.name ? 'border-error-500' : 'border-gray-300 focus:border-success-600'"
                />
                <span v-if="errors.name" id="co-name-err" class="text-xs text-error-500">{{ errors.name }}</span>
              </div>
              <div class="space-y-2">
                <label for="co-phone" class="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone class="h-4 w-4 text-success-600" aria-hidden="true" /> Телефон
                </label>
                <input
                  id="co-phone"
                  v-model="form.phone"
                  type="tel"
                  placeholder="+7 (700) 000-0000"
                  :aria-invalid="!!errors.phone"
                  :aria-describedby="errors.phone ? 'co-phone-err' : undefined"
                  class="w-full rounded-lg border bg-white px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-success-600"
                  :class="errors.phone ? 'border-error-500' : 'border-gray-300 focus:border-success-600'"
                />
                <span v-if="errors.phone" id="co-phone-err" class="text-xs text-error-500">{{ errors.phone }}</span>
              </div>
            </div>
          </fieldset>

          <!-- Payment -->
          <fieldset class="space-y-5">
            <legend class="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
              Оплата <Lock class="h-4 w-4 text-success-600" aria-hidden="true" />
            </legend>
            <p class="text-xs text-gray-500">
              Демо-оплата: карта, оканчивающаяся на 0000, имитирует отказ банка. Реальные средства не
              списываются.
            </p>

            <div class="space-y-2">
              <label for="co-cardname" class="text-sm font-semibold text-gray-700">Имя на карте</label>
              <input
                id="co-cardname"
                v-model="form.cardName"
                placeholder="IVAN IVANOV"
                :aria-invalid="!!errors.cardName"
                :aria-describedby="errors.cardName ? 'co-cardname-err' : undefined"
                class="w-full rounded-lg border bg-white px-4 py-3 uppercase text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-success-600"
                :class="errors.cardName ? 'border-error-500' : 'border-gray-300 focus:border-success-600'"
              />
              <span v-if="errors.cardName" id="co-cardname-err" class="text-xs text-error-500">{{ errors.cardName }}</span>
            </div>

            <div class="space-y-2">
              <label for="co-card" class="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CreditCard class="h-4 w-4 text-success-600" aria-hidden="true" /> Номер карты
              </label>
              <input
                id="co-card"
                :value="form.cardNumber"
                inputmode="numeric"
                autocomplete="cc-number"
                placeholder="0000 0000 0000 0000"
                :aria-invalid="!!errors.cardNumber"
                :aria-describedby="errors.cardNumber ? 'co-card-err' : undefined"
                class="w-full rounded-lg border bg-white px-4 py-3st text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-success-600"
                :class="errors.cardNumber ? 'border-error-500' : 'border-gray-300 focus:border-success-600'"
                @input="onCardInput"
              />
              <span v-if="errors.cardNumber" id="co-card-err" class="text-xs text-error-500">{{ errors.cardNumber }}</span>
            </div>

            <div class="grid grid-cols-2 gap-5">
              <div class="space-y-2">
                <label for="co-exp" class="text-sm font-semibold text-gray-700">Срок (ММ/ГГ)</label>
                <input
                  id="co-exp"
                  :value="form.expiry"
                  inputmode="numeric"
                  autocomplete="cc-exp"
                  placeholder="12/27"
                  :aria-invalid="!!errors.expiry"
                  :aria-describedby="errors.expiry ? 'co-exp-err' : undefined"
                  class="w-full rounded-lg border bg-white px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-success-600"
                  :class="errors.expiry ? 'border-error-500' : 'border-gray-300 focus:border-success-600'"
                  @input="onExpiryInput"
                />
                <span v-if="errors.expiry" id="co-exp-err" class="text-xs text-error-500">{{ errors.expiry }}</span>
              </div>
              <div class="space-y-2">
                <label for="co-cvc" class="text-sm font-semibold text-gray-700">CVC</label>
                <input
                  id="co-cvc"
                  :value="form.cvc"
                  inputmode="numeric"
                  autocomplete="cc-csc"
                  placeholder="123"
                  :aria-invalid="!!errors.cvc"
                  :aria-describedby="errors.cvc ? 'co-cvc-err' : undefined"
                  class="w-full rounded-lg border bg-white px-4 py-3 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-success-600"
                  :class="errors.cvc ? 'border-error-500' : 'border-gray-300 focus:border-success-600'"
                  @input="onCvcInput"
                />
                <span v-if="errors.cvc" id="co-cvc-err" class="text-xs text-error-500">{{ errors.cvc }}</span>
              </div>
            </div>
          </fieldset>

          <!-- Error -->
          <div
            v-if="status === 'error'"
            role="alert"
            class="flex items-start gap-3 rounded-lg border border-error-200 bg-error-50 px-4 py-3"
          >
            <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-error-500" aria-hidden="true" />
            <div class="text-sm">
              <p class="font-semibold text-gray-900">{{ errorMessage }}</p>
              <p class="mt-0.5 text-gray-600">Проверьте данные карты и попробуйте снова.</p>
            </div>
          </div>

          <button
            type="submit"
            :disabled="status === 'processing'"
            class="flex w-full items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <template v-if="status === 'processing'">
              <Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" /> Обработка…
            </template>
            <template v-else-if="status === 'error'">
              Попробовать снова <ArrowRight class="h-5 w-5" aria-hidden="true" />
            </template>
            <template v-else> Оплатить {{ formatPrice(store.total) }} </template>
          </button>
        </form>

        <!-- Summary -->
        <aside>
          <div class="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
            <h2 class="text-lg font-bold text-gray-900">Ваша бронь</h2>
            <div class="mt-4 flex items-center gap-2">
              <span class="rounded-full bg-success-600 px-2.5 py-0.5 text-xs font-bold leading-none text-white">
                {{ FIELD_TYPE_LABEL[store.field.type] }}
              </span>
              <p class="text-sm font-semibold text-gray-900">{{ store.field.name }}</p>
            </div>

            <div class="mt-5 space-y-4">
              <div v-for="g in store.groupedByDate" :key="g.date">
                <p class="text-xs font-semibold uppercase text-gray-500">{{ g.label }}</p>
                <ul class="mt-1.5 space-y-1.5 text-sm">
                  <li
                    v-for="s in g.slots"
                    :key="s.id"
                    class="flex justify-between border-b border-gray-100 pb-1.5"
                  >
                    <span class="text-gray-700">{{ s.start }}–{{ s.end }}</span>
                    <span class="text-gray-600">{{ formatPrice(s.price) }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
              <span class="text-sm text-gray-500">Итого</span>
              <span class="text-2xl font-bold text-gray-900">{{ formatPrice(store.total) }}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- Redirecting placeholder (empty draft) -->
    <main v-else class="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <p class="text-gray-500">Нет активной брони. Перенаправляем к выбору поля…</p>
    </main>
  </div>
</template>
