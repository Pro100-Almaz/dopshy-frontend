<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  Loader2,
  Home,
  Sun,
  Users,
  Ruler,
  Check,
  X,
  ArrowRight,
  AlertTriangle,
  CalendarX,
} from 'lucide-vue-next'
import type { Field, Slot } from '@/types'
import { getField, getSlots, toISO, formatPrice, formatDayLabel, FIELD_TYPE_LABEL } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import BookingHeader from './components/BookingHeader.vue'
import SlotGrid from './components/SlotGrid.vue'
import LocationMap from './components/LocationMap.vue'

const route = useRoute()
const router = useRouter()
const store = useBookingStore()

const fieldId = route.params.fieldId as string
const field = ref<Field | null>(null)
const activePhoto = ref(0)
const fieldLoading = ref(true)
const notFound = ref(false)

const date = ref((route.query.date as string) || toISO(new Date()))
const slots = ref<Slot[]>([])
const slotsLoading = ref(false)

const days = computed(() => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return toISO(d)
  })
})

const selectedIds = computed(() => store.selectedSlots.map((s) => s.id))
const hasAvailable = computed(() => slots.value.some((s) => s.status === 'available'))

async function loadSlots() {
  if (!field.value) return
  slotsLoading.value = true
  store.setContext(field.value, date.value)
  try {
    slots.value = await getSlots(field.value.id, date.value)
  } finally {
    slotsLoading.value = false
  }
}

function selectDate(iso: string) {
  if (iso === date.value) return
  date.value = iso
}

watch(date, loadSlots)

function goCheckout() {
  if (store.count === 0) return
  router.push('/booking/checkout')
}

onMounted(async () => {
  fieldLoading.value = true
  const f = await getField(fieldId)
  fieldLoading.value = false
  if (!f) {
    notFound.value = true
    return
  }
  field.value = f
  await loadSlots()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-800" style="font-family: Outfit, sans-serif">
    <BookingHeader :back="{ to: '/booking', label: 'Все поля' }" />

    <!-- Loading -->
    <div v-if="fieldLoading" class="flex min-h-[60vh] items-center justify-center">
      <Loader2 class="h-8 w-8 animate-spin text-success-600" aria-hidden="true" />
      <span class="sr-only">Загрузка…</span>
    </div>

    <!-- Not found -->
    <div
      v-else-if="notFound"
      class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <AlertTriangle class="h-8 w-8 text-error-500" aria-hidden="true" />
      <p class="text-gray-600">Поле не найдено или было удалено.</p>
      <RouterLink
        to="/booking"
        class="rounded-full bg-success-600 px-5 py-2.5 font-bebas text-lg tracking-wide text-white hover:bg-success-700"
      >
        Ко всем полям
      </RouterLink>
    </div>

    <main v-else-if="field" class="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8 lg:pb-14">
      <div class="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <!-- Main column -->
        <div>
          <!-- Photos -->
          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm">
            <div class="relative aspect-[16/10] bg-gray-100">
              <img
                :src="field.photos[activePhoto]"
                :alt="`${field.name} — ${field.surface}`"
                class="h-full w-full object-cover"
              />
              <div class="absolute left-4 top-4 flex gap-2">
                <span
                  class="rounded-full bg-success-600 px-3 py-1 font-bebas leading-none tracking-wide text-white"
                  >{{ FIELD_TYPE_LABEL[field.type] }}</span
                >
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm"
                >
                  <component :is="field.indoor ? Home : Sun" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ field.indoor ? 'Крытое' : 'Открытое' }}
                </span>
              </div>
            </div>
            <div v-if="field.photos.length > 1" class="flex gap-2 p-2">
              <button
                v-for="(p, i) in field.photos"
                :key="i"
                type="button"
                class="h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors"
                :class="i === activePhoto ? 'border-success-600' : 'border-transparent opacity-60 hover:opacity-100'"
                :aria-label="`Фото ${i + 1}`"
                :aria-pressed="i === activePhoto"
                @click="activePhoto = i"
              >
                <img :src="p" alt="" loading="lazy" class="h-full w-full object-cover" />
              </button>
            </div>
          </div>

          <!-- Title + meta -->
          <div class="mt-6">
            <h1 class="font-bebas text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] tracking-wide text-gray-900">
              {{ field.name }}
            </h1>
            <p class="mt-3 max-w-prose text-gray-600">{{ field.description }}</p>

            <dl class="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-700">
              <div class="flex items-center gap-2">
                <Ruler class="h-4 w-4 text-success-600" aria-hidden="true" />
                <dt class="sr-only">Размер</dt>
                <dd>{{ field.sizeMeters }}</dd>
              </div>
              <div class="flex items-center gap-2">
                <Users class="h-4 w-4 text-success-600" aria-hidden="true" />
                <dt class="sr-only">Вместимость</dt>
                <dd>{{ field.capacity }}</dd>
              </div>
            </dl>

            <ul class="mt-5 flex flex-wrap gap-2">
              <li
                v-for="a in field.amenities"
                :key="a"
                class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600"
              >
                <Check class="h-3.5 w-3.5 text-success-600" aria-hidden="true" /> {{ a }}
              </li>
            </ul>
          </div>

          <!-- Slot picker -->
          <section class="mt-10">
            <h2 class="mb-4 font-bebas text-2xl tracking-wide text-gray-900">ВЫБЕРИТЕ ДАТУ И ВРЕМЯ</h2>

            <!-- Date strip -->
            <div class="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2">
              <button
                v-for="d in days"
                :key="d"
                type="button"
                class="flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600"
                :class="
                  d === date
                    ? 'border-success-600 bg-success-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                "
                :aria-pressed="d === date"
                @click="selectDate(d)"
              >
                <span class="text-[11px] uppercase" :class="d === date ? 'text-white/70' : 'text-gray-400'">{{
                  formatDayLabel(d).weekday
                }}</span>
                <span class="font-bebas text-xl leading-none">{{ formatDayLabel(d).day }}</span>
                <span class="text-[11px]" :class="d === date ? 'text-white/70' : 'text-gray-400'">{{
                  formatDayLabel(d).month
                }}</span>
              </button>
            </div>

            <!-- Slots -->
            <div v-if="slotsLoading" class="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
              <div v-for="i in 16" :key="i" class="h-14 animate-pulse rounded-md bg-gray-100" />
            </div>
            <div
              v-else-if="!hasAvailable"
              class="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center"
            >
              <CalendarX class="h-7 w-7 text-gray-400" aria-hidden="true" />
              <p class="text-gray-600">На эту дату свободных слотов нет. Попробуйте другой день.</p>
            </div>
            <SlotGrid v-else :slots="slots" :selected-ids="selectedIds" @toggle="store.toggleSlot" />
          </section>

          <!-- Map -->
          <section class="mt-10">
            <h2 class="mb-4 font-bebas text-2xl tracking-wide text-gray-900">КАК ДОБРАТЬСЯ</h2>
            <LocationMap />
          </section>
        </div>

        <!-- Summary rail (desktop) -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
            <h2 class="font-bebas text-2xl tracking-wide text-gray-900">ВАШ ВЫБОР</h2>
            <p class="mt-1 text-sm text-gray-500">{{ field.name }}</p>

            <div v-if="store.count === 0" class="mt-6 text-sm text-gray-500">
              Выберите один или несколько временных слотов выше.
            </div>
            <ul v-else class="mt-5 space-y-2">
              <li
                v-for="s in store.sortedSlots"
                :key="s.id"
                class="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 text-sm"
              >
                <span class="text-gray-700">{{ s.start }}–{{ s.end }}</span>
                <span class="flex items-center gap-3">
                  <span class="text-gray-600">{{ formatPrice(s.price) }}</span>
                  <button
                    type="button"
                    class="text-gray-400 hover:text-error-500"
                    :aria-label="`Убрать слот ${s.start}`"
                    @click="store.toggleSlot(s)"
                  >
                    <X class="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            </ul>

            <div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <span class="text-sm text-gray-500">Итого</span>
              <span class="font-bebas text-3xl leading-none text-gray-900">{{ formatPrice(store.total) }}</span>
            </div>

            <button
              type="button"
              :disabled="store.count === 0"
              class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-3.5 font-bebas text-xl tracking-wide text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              @click="goCheckout"
            >
              Забронировать <ArrowRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    </main>

    <!-- Sticky summary bar (mobile) -->
    <div
      v-if="field && !notFound && store.count > 0"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_-2px_rgba(16,24,40,0.08)] backdrop-blur-lg lg:hidden"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p class="text-xs text-gray-500">{{ store.count }} слот(а) · итого</p>
          <p class="font-bebas text-2xl leading-none text-gray-900">{{ formatPrice(store.total) }}</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-success-600 px-6 py-3 font-bebas text-lg tracking-wide text-white hover:bg-success-700"
          @click="goCheckout"
        >
          Забронировать <ArrowRight class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
