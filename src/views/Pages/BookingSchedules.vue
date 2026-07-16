<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Loader2, AlertTriangle, Ruler, Users, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import WeekGrid from '@/views/Booking/components/WeekGrid.vue'
import CreateBookingModal from '@/views/Booking/components/CreateBookingModal.vue'

import type { Field } from '@/types'
import {
  getManagerFields,
  getManagerWeek,
  toISO,
  formatPrice,
  FIELD_TYPE_LABEL,
  type WeekSlots,
} from '@/services/booking'
import { useBookingStore } from '@/stores/booking'

const currentPageTitle = 'Слоты полей'

const fields = ref<Field[]>([])
const selectedFieldId = ref('')
const week = ref<WeekSlots>({ days: [], rows: [] })
const store = useBookingStore()

const fieldsLoading = ref(true)
const slotsLoading = ref(false)
const weekOffset = ref(0) // 0 = текущая неделя

const MAX_WEEKS = 4

const selectedField = computed(
  () => fields.value.find((f) => f.id === selectedFieldId.value) ?? null,
)
const grouped = computed(() => store.groupedByDate)

function startISO(offset: number): string {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offset * 7)
  return toISO(base)
}

const rangeLabel = computed(() => {
  const d = week.value.days
  if (d.length < 7) return ''
  const a = d[0].label
  const b = d[6].label
  return a.month === b.month
    ? `${a.day}–${b.day} ${a.month}`
    : `${a.day} ${a.month} – ${b.day} ${b.month}`
})

async function loadWeek() {
  const field = selectedField.value
  if (!field) return
  slotsLoading.value = true
  store.setField(field)
  try {
    week.value = await getManagerWeek(field, startISO(weekOffset.value))
  } finally {
    slotsLoading.value = false
  }
}

// ── Модалка создания брони ─────────────────────────
const showBookingModal = ref(false)
const bookingDraftCreated = ref(false)

// Черновик создан внутри модалки.
function onBookingCreated() {
  bookingDraftCreated.value = true
}

// При закрытии модалки после создания черновика перезагружаем страницу —
// иначе сетка не всегда сразу отражает только что занятый слот.
function onBookingModalClose() {
  showBookingModal.value = false
  if (bookingDraftCreated.value) {
    window.location.reload()
  }
}

function selectField(id: string) {
  if (id === selectedFieldId.value) return
  selectedFieldId.value = id
  weekOffset.value = 0
}

function prevWeek() {
  if (weekOffset.value <= 0) return
  weekOffset.value--
}
function nextWeek() {
  if (weekOffset.value >= MAX_WEEKS) return
  weekOffset.value++
}

watch([selectedFieldId, weekOffset], loadWeek)

onMounted(async () => {
  fieldsLoading.value = true
  fields.value = await getManagerFields()
  fieldsLoading.value = false

  if (fields.value.length) {
    selectedFieldId.value = fields.value[0].id
    await loadWeek()
  }
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div
        class="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12"
      >
        <!-- Loading fields -->
        <div v-if="fieldsLoading" class="flex min-h-[60vh] items-center justify-center">
          <Loader2 class="h-8 w-8 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- No fields -->
        <div
          v-else-if="!fields.length"
          class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
        >
          <AlertTriangle class="h-8 w-8 text-error-500" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">Пока нет ни одного поля.</p>
        </div>

        <!-- Content -->
        <main v-else class="mx-auto max-w-5xl">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                class="font-bebas text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] tracking-wide text-gray-900 dark:text-white/90"
              >
                РАСПИСАНИЕ СЛОТОВ
              </h1>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                Выберите поле и неделю, чтобы посмотреть загруженность.
              </p>
            </div>
          </div>

          <!-- Field selector -->
          <section class="mt-8">
            <h2 class="mb-3 font-bebas text-xl tracking-wide text-gray-900 dark:text-white/90">
              ПОЛЕ
            </h2>

            <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              <button
                v-for="f in fields"
                :key="f.id"
                type="button"
                class="flex shrink-0 flex-col items-start rounded-lg border px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600"
                :class="
                  f.id === selectedFieldId
                    ? 'border-success-600 bg-success-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                "
                :aria-pressed="f.id === selectedFieldId"
                @click="selectField(f.id)"
              >
                <span class="font-bebas text-lg leading-none tracking-wide">{{ f.name }}</span>
                <span
                  class="mt-1 text-[11px] uppercase"
                  :class="f.id === selectedFieldId ? 'text-white/70' : 'text-gray-400'"
                >
                  {{ FIELD_TYPE_LABEL[f.type] }}
                </span>
              </button>
            </div>
          </section>

          <!-- Schedule (week grid — тот же дизайн, что и на странице поля) -->
          <section class="mt-8">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white/90">
                РАСПИСАНИЕ
              </h2>

              <!-- Week navigation -->
              <div
                class="flex items-center gap-1 rounded-full border border-gray-200 p-0.5 dark:border-gray-700"
              >
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                  :disabled="weekOffset <= 0"
                  aria-label="Предыдущая неделя"
                  @click="prevWeek"
                >
                  <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>
                <span
                  class="min-w-[6.5rem] text-center text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >{{ rangeLabel }}</span
                >
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                  :disabled="weekOffset >= MAX_WEEKS"
                  aria-label="Следующая неделя"
                  @click="nextWeek"
                >
                  <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Grid (общий компонент с клиентской стороной) -->
            <WeekGrid :week="week" :loading="slotsLoading" />
          </section>

          <!-- Мобильная сводка + бронирование (на десктопе — боковая панель) -->
          <div
            v-if="selectedField"
            class="sticky bottom-0 z-20 mt-8 border-t border-gray-200 bg-white/95 py-4 backdrop-blur lg:hidden dark:border-gray-800 dark:bg-gray-900/95"
          >
            <div
              v-if="store.count > 0"
              class="mb-3 max-h-32 space-y-2 overflow-y-auto pr-1"
            >
              <div v-for="g in grouped" :key="g.date">
                <p class="text-[11px] font-semibold uppercase text-gray-500">{{ g.label }}</p>
                <ul class="mt-1 space-y-1">
                  <li
                    v-for="s in g.slots"
                    :key="s.id"
                    class="flex items-center justify-between text-sm"
                  >
                    <span class="text-gray-700 dark:text-gray-300">{{ s.start }}–{{ s.end }}</span>
                    <span class="text-gray-500 dark:text-gray-400">{{ formatPrice(s.price) }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="min-w-0">
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  {{ store.count > 0 ? `Выбрано слотов: ${store.count}` : 'Выберите слоты' }}
                </p>
                <p class="text-lg font-bold text-gray-900 dark:text-white/90">
                  {{ formatPrice(store.total) }}
                </p>
              </div>
              <button
                type="button"
                :disabled="store.count === 0"
                class="ml-auto flex shrink-0 items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-3 font-bebas text-lg tracking-wide text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                @click="showBookingModal = true"
              >
                Забронировать <ArrowRight class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </main>
      </div>

      <aside class="hidden lg:block">
        <div
          v-if="selectedField"
          class="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm"
        >
          <h2 class="font-bebas text-2xl tracking-wide text-gray-900">ВАШ ВЫБОР</h2>
          <p class="mt-1 text-sm text-gray-500">{{ selectedField.name }}</p>

          <dl class="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-700">
            <div class="flex items-center gap-2">
              <Ruler class="h-4 w-4 text-success-600" aria-hidden="true" />
              <dt class="sr-only">Размер</dt>
              <dd>{{ selectedField.sizeMeters }}</dd>
            </div>
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-success-600" aria-hidden="true" />
              <dt class="sr-only">Вместимость</dt>
              <dd>{{ selectedField.capacity }}</dd>
            </div>
          </dl>

          <div v-if="store.count === 0" class="mt-6 text-sm text-gray-500">
            Выберите слоты в расписании.
          </div>
          <div v-else class="mt-5 space-y-4">
            <div v-for="g in grouped" :key="g.date">
              <p class="text-xs font-semibold uppercase text-gray-500">{{ g.label }}</p>
              <ul class="mt-1.5 space-y-1.5">
                <li
                  v-for="s in g.slots"
                  :key="s.id"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-gray-700">{{ s.start }}–{{ s.end }}</span>
                  <span class="text-gray-600">{{ formatPrice(s.price) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <span class="text-sm text-gray-500">Итого</span>
            <span class="text-2xl font-bold text-gray-900">{{ formatPrice(store.total) }}</span>
          </div>

          <button
            type="button"
            :disabled="store.count === 0"
            class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-3.5 font-bebas text-xl tracking-wide text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            @click="showBookingModal = true"
          >
            Забронировать <ArrowRight class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </div>

    <CreateBookingModal
      :open="showBookingModal"
      @close="onBookingModalClose"
      @created="onBookingCreated"
    />
  </AdminLayout>
</template>
