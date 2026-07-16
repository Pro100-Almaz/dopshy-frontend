<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MapPin, Navigation, SearchX, RotateCcw, AlertTriangle } from 'lucide-vue-next'
import type { Field, FieldType } from '@/types'
import { getManagerFields, toISO, ARENA, directionsUrl } from '@/services/booking'
import BookingHeader from './components/BookingHeader.vue'
import FieldCard from './components/FieldCard.vue'

const fields = ref<Field[]>([])
const isLoading = ref(true)
const loadError = ref(false)

const date = ref(toISO(new Date()))
const minDate = toISO(new Date())
const typeFilter = ref<'all' | FieldType>('all')
const coverFilter = ref<'all' | 'indoor' | 'outdoor'>('all')

const typeOptions: { value: 'all' | FieldType; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: '5x5', label: '5×5' },
  { value: '7x7', label: '7×7' },
  { value: '8x8', label: '8×8' },
]
const coverOptions: { value: 'all' | 'indoor' | 'outdoor'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'outdoor', label: 'Открытые' },
  { value: 'indoor', label: 'Крытые' },
]

const filtered = computed(() =>
  fields.value.filter((f) => {
    if (typeFilter.value !== 'all' && f.type !== typeFilter.value) return false
    if (coverFilter.value === 'indoor' && !f.indoor) return false
    if (coverFilter.value === 'outdoor' && f.indoor) return false
    return true
  }),
)

function resetFilters() {
  typeFilter.value = 'all'
  coverFilter.value = 'all'
}

async function load() {
  isLoading.value = true
  loadError.value = false
  try {
    fields.value = await getManagerFields()
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-800" style="font-family: Outfit, sans-serif">
    <BookingHeader :back="{ to: '/', label: 'На главную' }" />

    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <!-- Page head -->
      <div class="mb-8 max-w-2xl">
        <h1 class="text-3xl font-bold text-gray-900">
          Бронирование <span class="text-success-600">полей</span>
        </h1>
        <p class="mt-3 text-gray-500">
          Выберите поле и удобное время. Оплата онлайн, подтверждение — сразу после брони.
        </p>
      </div>

      <!-- Filter bar -->
      <div class="mb-8 flex flex-col gap-4 border-y border-gray-200 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-4">
          <!-- Date -->
          <label class="flex items-center gap-2 text-sm">
            <span class="font-semibold text-gray-500">Дата</span>
            <input
              v-model="date"
              type="date"
              :min="minDate"
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-success-600 focus:outline-none focus:ring-1 focus:ring-success-600"
            />
          </label>

          <!-- Type -->
          <div class="flex items-center gap-2" role="group" aria-label="Формат поля">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              type="button"
              class="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors"
              :class="
                typeFilter === opt.value
                  ? 'border-success-600 bg-success-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              "
              :aria-pressed="typeFilter === opt.value"
              @click="typeFilter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Cover -->
          <div class="flex items-center gap-2" role="group" aria-label="Тип покрытия">
            <button
              v-for="opt in coverOptions"
              :key="opt.value"
              type="button"
              class="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors"
              :class="
                coverFilter === opt.value
                  ? 'border-success-600 bg-success-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              "
              :aria-pressed="coverFilter === opt.value"
              @click="coverFilter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <p class="text-sm text-gray-500" aria-live="polite">
          <template v-if="!isLoading">{{ filtered.length }} из {{ fields.length }} полей</template>
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="i in 6"
          :key="i"
          class="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          <div class="aspect-[16/10] bg-gray-100" />
          <div class="space-y-3 p-5">
            <div class="h-6 w-2/3 rounded bg-gray-200" />
            <div class="h-4 w-1/2 rounded bg-gray-100" />
            <div class="h-8 w-full rounded bg-gray-100" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="loadError"
        class="flex flex-col items-center gap-4 rounded-2xl border border-error-200 bg-error-25 px-6 py-16 text-center"
      >
        <AlertTriangle class="h-8 w-8 text-error-500" aria-hidden="true" />
        <p class="text-gray-600">Не удалось загрузить поля. Проверьте соединение.</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-success-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-success-700"
          @click="load"
        >
          <RotateCcw class="h-4 w-4" aria-hidden="true" /> Повторить
        </button>
      </div>

      <!-- Empty (filters) -->
      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center"
      >
        <SearchX class="h-8 w-8 text-gray-400" aria-hidden="true" />
        <p class="text-gray-600">Нет полей под выбранные фильтры.</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          @click="resetFilters"
        >
          <RotateCcw class="h-4 w-4" aria-hidden="true" /> Сбросить фильтры
        </button>
      </div>

      <!-- Grid -->
      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FieldCard v-for="f in filtered" :key="f.id" :field="f" :date="date" />
      </div>

      <!-- Location -->
      <section
        class="mt-12 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start gap-3">
          <MapPin class="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden="true" />
          <div>
            <h2 class="text-lg font-bold text-gray-900">Где мы находимся</h2>
            <p class="text-sm text-gray-500">{{ ARENA.address }}</p>
          </div>
        </div>
        <a
          :href="directionsUrl()"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-success-600 hover:text-success-600"
        >
          <Navigation class="h-4 w-4" aria-hidden="true" /> Проложить маршрут
        </a>
      </section>
    </main>
  </div>
</template>
