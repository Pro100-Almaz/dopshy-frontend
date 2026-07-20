<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
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
  CalendarDays,
} from 'lucide-vue-next'
import type { Field } from '@/types'
import { getManagerField, formatPrice, FIELD_TYPE_LABEL } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import BookingHeader from './components/BookingHeader.vue'
import LocationMap from './components/LocationMap.vue'
import WeekScheduleModal from './components/WeekScheduleModal.vue'
import CreateBookingModal from './components/CreateBookingModal.vue'

const route = useRoute()
const store = useBookingStore()

const fieldId = route.params.fieldId as string
const field = ref<Field | null>(null)
const activePhoto = ref(0)
const fieldLoading = ref(true)
const notFound = ref(false)
const showSchedule = ref(false)
const showBookingModal = ref(false)

const grouped = computed(() => store.groupedByDate)

function openBooking() {
  if (store.count === 0) return
  showBookingModal.value = true
}

onMounted(async () => {
  fieldLoading.value = true
  const f = await getManagerField(fieldId)
  fieldLoading.value = false
  if (!f) {
    notFound.value = true
    return
  }
  field.value = f
  store.setField(f)
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
        class="rounded-full bg-success-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-success-700"
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
                v-if="field.photos[activePhoto]"
                :src="field.photos[activePhoto]"
                :alt="`${field.name} — ${field.surface}`"
                class="h-full w-full object-cover"
              />
              <div v-else class="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
              <div class="absolute left-4 top-4 flex gap-2">
                <span
                  class="rounded-full bg-success-600 px-3 py-1 text-xs font-bold leading-none text-white"
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
            <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
              {{ field.name }}
            </h1>
            <p v-if="field.description" class="mt-3 max-w-prose text-gray-600">
              {{ field.description }}
            </p>

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

          <!-- Schedule -->
          <section class="mt-10">
            <h2 class="mb-4 text-lg font-bold text-gray-900">Выберите время</h2>

            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:border-success-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600"
              @click="showSchedule = true"
            >
              <span class="flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-full bg-success-50 text-success-600">
                  <CalendarDays class="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span class="block font-semibold text-gray-900">Расписание на неделю</span>
                  <span class="block text-sm text-gray-500">
                    {{ store.count > 0 ? `Выбрано слотов: ${store.count}` : 'Выберите один или несколько слотов' }}
                  </span>
                </span>
              </span>
              <ArrowRight class="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            </button>

            <!-- Selected preview (grouped by day) -->
            <div v-if="store.count > 0" class="mt-6 space-y-5">
              <div v-for="g in grouped" :key="g.date">
                <div class="mb-2 flex items-baseline justify-between">
                  <p class="text-sm font-semibold text-gray-900">{{ g.label }}</p>
                  <p class="text-sm text-gray-500">{{ formatPrice(g.subtotal) }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="s in g.slots"
                    :key="s.id"
                    class="inline-flex items-center gap-1.5 rounded-full border border-success-100 bg-success-50 py-1 pl-3 pr-1.5 text-sm text-success-700"
                  >
                    {{ s.start }}–{{ s.end }}
                    <button
                      type="button"
                      class="grid h-5 w-5 place-items-center rounded-full text-success-700 hover:bg-success-600 hover:text-white"
                      :aria-label="`Убрать ${g.label}, ${s.start}`"
                      @click="store.toggleSlot(s)"
                    >
                      <X class="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- Map -->
          <section class="mt-10">
            <h2 class="mb-4 text-lg font-bold text-gray-900">Как добраться</h2>
            <LocationMap />
          </section>
        </div>

        <!-- Summary rail (desktop) -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-4">
          <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
            <h2 class="text-lg font-bold text-gray-900">Ваш выбор</h2>
            <p class="mt-1 text-sm text-gray-500">{{ field.name }}</p>

            <div v-if="store.count === 0" class="mt-6 text-sm text-gray-500">
              Откройте расписание и выберите удобные слоты на неделю.
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
              class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-success-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-success-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              @click="openBooking"
            >
              Забронировать <ArrowRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm">
            <h2 class="text-lg font-bold text-gray-900">Внимание</h2>



            <div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <span class="text-sm text-gray-500">Если вы созздали бронь и хотите изменить/отменить её, напишите на данный WhatsApp: +7 (700) 123-4567</span>
            </div>
          </div>
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
          <p class="text-2xl font-bold text-gray-900">{{ formatPrice(store.total) }}</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-success-600 px-6 py-3 text-sm font-semibold text-white hover:bg-success-700"
          @click="openBooking"
        >
          Забронировать <ArrowRight class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Week schedule modal -->
    <WeekScheduleModal
      v-if="field"
      :field="field"
      :open="showSchedule"
      @close="showSchedule = false"
    />

    <!-- Create booking modal (общая с админкой) -->
    <CreateBookingModal
      :open="showBookingModal"
      @close="showBookingModal = false"
      @created="showBookingModal = false"
    />
  </div>
</template>
