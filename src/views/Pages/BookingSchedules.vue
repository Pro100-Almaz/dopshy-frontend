<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader2, CalendarX, AlertTriangle, Plus } from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

import type { Field, Slot } from '@/types'
import { listFields, getSlots, toISO, formatDayLabel, FIELD_TYPE_LABEL } from '@/services/booking'

import SlotGrid from '@/views/Booking/components/SlotGrid.vue'

const currentPageTitle = 'Слоты полей'

const fields = ref<Field[]>([])
const selectedFieldId = ref('')
const date = ref(toISO(new Date()))
const slots = ref<Slot[]>([])

const fieldsLoading = ref(true)
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

const selectedField = computed(
  () => fields.value.find((f) => f.id === selectedFieldId.value) ?? null,
)
const hasAvailable = computed(() => slots.value.some((s) => s.status === 'available'))

async function loadSlots() {
  if (!selectedFieldId.value) return

  slotsLoading.value = true
  try {
    slots.value = await getSlots(selectedFieldId.value, date.value)
  } finally {
    slotsLoading.value = false
  }
}

function selectField(id: string) {
  if (id === selectedFieldId.value) return
  selectedFieldId.value = id
}

function selectDate(iso: string) {
  if (iso === date.value) return
  date.value = iso
}

watch([selectedFieldId, date], loadSlots)

onMounted(async () => {
  fieldsLoading.value = true
  fields.value = await listFields()
  fieldsLoading.value = false

  if (fields.value.length) {
    selectedFieldId.value = fields.value[0].id
    await loadSlots()
  }
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

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
              Выберите поле и дату, чтобы посмотреть загруженность.
            </p>
          </div>

          <RouterLink
            to="/bookings"
            class="inline-flex shrink-0 items-center gap-2 rounded-full bg-success-600 px-6 py-3 font-bebas text-lg tracking-wide text-white transition-colors hover:bg-success-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600 focus-visible:ring-offset-2"
          >
            <Plus class="h-5 w-5" aria-hidden="true" />
            Создать Бронь
          </RouterLink>
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

        <!-- Schedule -->
        <section class="mt-8">
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white/90">
              РАСПИСАНИЕ
            </h2>
            <span v-if="selectedField" class="text-sm text-gray-500 dark:text-gray-400">
              {{ selectedField.name }}
            </span>
          </div>

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
                  : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
              "
              :aria-pressed="d === date"
              @click="selectDate(d)"
            >
              <span
                class="text-[11px] uppercase"
                :class="d === date ? 'text-white/70' : 'text-gray-400'"
              >
                {{ formatDayLabel(d).weekday }}
              </span>
              <span class="font-bebas text-xl leading-none">{{ formatDayLabel(d).day }}</span>
              <span
                class="text-[11px]"
                :class="d === date ? 'text-white/70' : 'text-gray-400'"
              >
                {{ formatDayLabel(d).month }}
              </span>
            </button>
          </div>

          <!-- Slots -->
          <div
            v-if="slotsLoading"
            class="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5"
          >
            <div
              v-for="i in 16"
              :key="i"
              class="h-14 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"
            />
          </div>

          <div
            v-else-if="!hasAvailable"
            class="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <CalendarX class="h-7 w-7 text-gray-400" aria-hidden="true" />
            <p class="text-gray-600 dark:text-gray-400">
              На эту дату свободных слотов нет. Попробуйте другой день.
            </p>
          </div>

          <!-- Same schedule "table" as FieldDetail — read-only here (no selection). -->
          <SlotGrid v-else :slots="slots" :selected-ids="[]" />
        </section>
      </main>
    </div>
  </AdminLayout>
</template>
