<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, ArrowRight, Loader2, RotateCcw } from 'lucide-vue-next'
import type { Field } from '@/types'
import { FIELD_TYPE_LABEL, formatPrice, getManagerFields } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import WeekSchedulePanel from '@/views/Booking/components/WeekSchedulePanel.vue'
import CreateBookingModal from '@/views/Booking/components/CreateBookingModal.vue'

const store = useBookingStore()

const fields = ref<Field[]>([])
const selectedId = ref('')
const isLoading = ref(true)
const loadError = ref(false)
const showBookingModal = ref(false)
const bookingDraftCreated = ref(false)

const selectedField = computed(() => fields.value.find((field) => field.id === selectedId.value))
const grouped = computed(() => store.groupedByDate)

function selectField(field: Field) {
  selectedId.value = field.id
  store.setField(field)
}

async function loadFields() {
  isLoading.value = true
  loadError.value = false
  try {
    fields.value = await getManagerFields()
    if (fields.value[0]) selectField(fields.value[0])
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

function openBooking() {
  if (store.count === 0) return
  showBookingModal.value = true
}

function onBookingCreated() {
  bookingDraftCreated.value = true
}

function onBookingModalClose() {
  showBookingModal.value = false
  if (bookingDraftCreated.value) window.location.reload()
}

onMounted(loadFields)
</script>

<template>
  <section id="booking" class="landing-snap-section bg-white py-16 sm:py-20">
    <div class="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 class="text-3xl font-bebas text-gray-900 sm:text-4xl">
            <span class="text-success-600">БРОНИРОВАНИЕ</span>
          </h2>
          <p class="mt-2 max-w-2xl text-xs text-gray-500 sm:text-sm">
            Выберите поле, отметьте свободные слоты и сразу увидите итоговую стоимость.
          </p>
        </div>

        <div
          v-if="fields.length > 0"
          class="flex max-w-full flex-wrap gap-2 pb-1"
          role="tablist"
          aria-label="Выбор поля"
        >
          <button
            v-for="field in fields"
            :key="field.id"
            type="button"
            class="shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm"
            :class="
              selectedId === field.id
                ? 'border-success-600 bg-success-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-success-600 hover:text-success-600'
            "
            :aria-selected="selectedId === field.id"
            role="tab"
            @click="selectField(field)"
          >
            {{ field.name }}
          </button>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="flex min-h-80 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50"
      >
        <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
        <span class="sr-only">Загрузка расписания…</span>
      </div>

      <div
        v-else-if="loadError"
        class="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-error-200 bg-error-25 px-6 text-center"
      >
        <AlertTriangle class="h-8 w-8 text-error-500" aria-hidden="true" />
        <p class="text-gray-600">Не удалось загрузить поля. Проверьте соединение.</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-success-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-success-700"
          @click="loadFields"
        >
          <RotateCcw class="h-4 w-4" aria-hidden="true" /> Повторить
        </button>
      </div>

      <div
        v-else-if="selectedField"
        class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
      >
        <WeekSchedulePanel
          :key="selectedField.id"
          :field="selectedField"
          large
          hide-booking-details
        />

        <aside class="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-theme-sm">
          <div class="rounded-2xl bg-white p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-bold text-gray-900">Ваш выбор</h3>
                <p class="mt-1 text-xs text-gray-500">{{ selectedField.name }}</p>
              </div>
              <span
                class="rounded-full bg-success-600 px-2.5 py-1 text-xs font-bold leading-none text-white"
              >
                {{ FIELD_TYPE_LABEL[selectedField.type] }}
              </span>
            </div>

            <div v-if="store.count === 0" class="mt-6 text-xs text-gray-500">
              Выберите один или несколько слотов в таблице.
            </div>
            <div v-else class="mt-5 max-h-64 space-y-4 overflow-auto pr-1">
              <div v-for="group in grouped" :key="group.date">
                <div class="mb-1.5 flex items-baseline justify-between gap-3">
                  <p class="text-xs font-semibold uppercase text-gray-500">{{ group.label }}</p>
                  <p class="text-xs text-gray-500">{{ formatPrice(group.subtotal) }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="slot in group.slots"
                    :key="slot.id"
                    class="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700"
                  >
                    {{ slot.start }}–{{ slot.end }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <span class="text-xs text-gray-500">Итого</span>
              <span class="text-xl font-bold text-gray-900">{{ formatPrice(store.total) }}</span>
            </div>
            <div
              v-if="store.prepaymentTotal > 0"
              class="mt-1.5 flex items-center justify-between text-xs"
            >
              <span class="text-gray-500">Предоплата в Kaspi</span>
              <span class="font-semibold text-gray-700">{{
                formatPrice(store.prepaymentTotal)
              }}</span>
            </div>

            <button
              type="button"
              :disabled="store.count === 0"
              class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-success-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              @click="openBooking"
            >
              Забронировать <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    </div>

    <CreateBookingModal
      :open="showBookingModal"
      @close="onBookingModalClose"
      @created="onBookingCreated"
    />
  </section>
</template>
