<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { Loader2, X } from 'lucide-vue-next'

import Modal from '@/components/ui/Modal.vue'
import type { Booking, BookingState, Field } from '@/types'
import { getManagerFields, updateBooking, BOOKING_STATE_LABEL } from '@/services/booking'

const props = defineProps<{ booking: Booking }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const fields = ref<Field[]>([])
const saving = ref(false)
const error = ref('')

const STATUS_OPTIONS = Object.keys(BOOKING_STATE_LABEL) as BookingState[]

// Верхний предел для любой суммы оплаты — защита от опечаток/переполнения.
const MAX_PAYMENT = 10_000_000

// Метка для сырого статуса — известные из справочника, неизвестные показываем как есть.
function stateLabel(state: string): string {
  return BOOKING_STATE_LABEL[state as BookingState] ?? state
}

const form = reactive({
  customerName: '',
  fieldId: '',
  date: '',
  start: '',
  end: '',
  status: 'draft' as string,
  paidKaspiQr: 0,
  paidCash: 0,
  paidAvans: 0,
})

function fillFrom(b: Booking) {
  form.customerName = b.customerName
  form.fieldId = b.fieldId
  form.date = b.date
  form.start = b.start
  form.end = b.end
  form.status = b.state
  form.paidKaspiQr = b.paidKaspiQr
  form.paidCash = b.paidCash
  form.paidAvans = b.paidAvans
}

watch(() => props.booking, fillFrom, { immediate: true })

onMounted(async () => {
  try {
    fields.value = await getManagerFields()
  } catch {
    // Список полей недоступен — оставляем текущее поле как единственный вариант.
    fields.value = []
  }
})

async function save() {
  error.value = ''
  if (!form.customerName.trim()) {
    error.value = 'Укажите имя клиента'
    return
  }
  if (form.end <= form.start) {
    error.value = 'Время окончания должно быть позже начала'
    return
  }
  const payments = [
    { value: Number(form.paidKaspiQr), label: 'Kaspi QR' },
    { value: Number(form.paidCash), label: 'Наличные' },
    { value: Number(form.paidAvans), label: 'Аванс' },
  ]
  const over = payments.find((p) => p.value > MAX_PAYMENT)
  if (over) {
    error.value = `Сумма «${over.label}» не может превышать ${MAX_PAYMENT.toLocaleString('ru-RU')} ₸`
    return
  }
  saving.value = true
  try {
    await updateBooking(props.booking.id, {
      field_id: Number(form.fieldId),
      customer_name: form.customerName.trim(),
      time_start: form.start,
      time_end: form.end,
      date: form.date,
      end_date: form.date,
      status: form.status as BookingState,
      paid_kaspi_qr: Number(form.paidKaspiQr) || 0,
      paid_cash: Number(form.paidCash) || 0,
      paid_avans: Number(form.paidAvans) || 0,
    })
    emit('saved')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось сохранить бронь'
  } finally {
    saving.value = false
  }
}

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800'
</script>

<template>
  <Modal :fullScreenBackdrop="true" @close="emit('close')">
    <template #body>
      <div
        class="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <button
          class="absolute right-5 top-5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white/90"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          <X class="h-5 w-5" />
        </button>

        <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Редактировать бронь
        </h3>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">{{ booking.ref }}</p>

        <form class="space-y-4" @submit.prevent="save">
          <!-- Customer name -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Клиент
            </label>
            <input v-model="form.customerName" type="text" :class="inputClass" />
          </div>

          <!-- Field -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Поле
            </label>
            <select v-model="form.fieldId" :class="inputClass" class="appearance-none pr-11">
              <option v-if="!fields.length" :value="form.fieldId">
                Поле №{{ form.fieldId }}
              </option>
              <option v-for="f in fields" :key="f.id" :value="f.id">
                {{ f.name }}
              </option>
            </select>
          </div>

          <!-- Date
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Дата
            </label>
            <input v-model="form.date" type="date" :class="inputClass" />
          </div>

          Times
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Начало
              </label>
              <input v-model="form.start" type="time" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Конец
              </label>
              <input v-model="form.end" type="time" :class="inputClass" />
            </div>
          </div> -->

          <!-- Status -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Статус
            </label>
            <select v-model="form.status" :class="inputClass" class="appearance-none pr-11">
              <option
                v-if="!STATUS_OPTIONS.includes(form.status as BookingState)"
                :value="form.status"
              >
                {{ stateLabel(form.status) }}
              </option>
              <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">
                {{ BOOKING_STATE_LABEL[s] }}
              </option>
            </select>
          </div>

          <!-- Payments -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Kaspi QR
              </label>
              <input
                v-model.number="form.paidKaspiQr"
                type="number"
                min="0"
                :max="MAX_PAYMENT"
                step="1"
                inputmode="numeric"
                :class="inputClass"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Наличные
              </label>
              <input
                v-model.number="form.paidCash"
                type="number"
                min="0"
                :max="MAX_PAYMENT"
                step="1"
                inputmode="numeric"
                :class="inputClass"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Аванс
              </label>
              <input
                v-model.number="form.paidAvans"
                type="number"
                min="0"
                :max="MAX_PAYMENT"
                step="1"
                inputmode="numeric"
                :class="inputClass"
              />
            </div>
          </div>

          <p v-if="error" class="text-sm text-error-600 dark:text-error-500">{{ error }}</p>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              @click="emit('close')"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-success-700 disabled:opacity-60"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>
