<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Component } from 'vue'
import {
  X,
  Loader2,
  CalendarDays,
  Clock,
  MapPin,
  User,
  Phone,
  StickyNote,
  Bot,
  UserCog,
  Globe,
  UserRound,
  HelpCircle,
} from 'lucide-vue-next'

import Modal from '@/components/ui/Modal.vue'
import type { BookingDetailApi, SourceKind } from '@/types'
import { getBookingDetail, formatPrice, formatDateTime, BOOKING_STATE_LABEL } from '@/services/booking'
import { parseSource, SOURCE_META } from '@/services/history'

// Иконка по типу источника; цвета/метки — в SOURCE_META сервиса.
const SOURCE_ICON: Record<SourceKind, Component> = {
  manager: UserCog,
  chatbot: Bot,
  landing: Globe,
  account: UserRound,
  other: HelpCircle,
}

const props = defineProps<{ id: number | string }>()
defineEmits<{ close: [] }>()

const detail = ref<BookingDetailApi | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  detail.value = null
  try {
    detail.value = await getBookingDetail(props.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить бронь'
  } finally {
    loading.value = false
  }
}

// Перезагружаем при смене id (модалка переиспользуется между строками).
watch(() => props.id, load, { immediate: true })

const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const trim = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')

// '77011234567' → '+7 701 123 45 67' (KZ); иначе — как есть.
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`
  }
  return raw
}

// ISO datetime → «22.07.2026, 17:30»; чистая дата (yyyy-mm-dd) → «22.07.2026».
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d ? `${d}.${m}.${y}` : iso
}

const stateLabel = computed(() => {
  const s = detail.value?.state ?? ''
  return BOOKING_STATE_LABEL[s as keyof typeof BOOKING_STATE_LABEL] ?? s
})

// Цвет бейджа статуса — по грубым группам.
const stateClass = computed(() => {
  const s = detail.value?.state ?? ''
  if (s === 'confirmed' || s === 'paid')
    return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
  if (s === 'cancelled' || s === 'unpaid' || s === 'rejected')
    return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
  return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
})

const src = computed(() => parseSource(detail.value?.source ?? ''))

const payments = computed(() => {
  const b = detail.value
  if (!b) return []
  return [
    { label: 'Бот', value: num(b.paid_bot) },
    { label: 'Kaspi QR', value: num(b.paid_kaspi_qr) },
    { label: 'Наличные', value: num(b.paid_cash) },
    { label: 'Аванс', value: num(b.paid_avans) },
  ].filter((r) => r.value > 0)
})

const total = computed(() => num(detail.value?.price_total))
const paidTotal = computed(() =>
  payments.value.reduce((sum, r) => sum + r.value, 0),
)
const remaining = computed(() => total.value - paidTotal.value)
</script>

<template>
  <Modal :fullScreenBackdrop="true" @close="$emit('close')">
    <template #body>
      <div
        class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 custom-scrollbar"
      >
        <button
          class="absolute right-5 top-5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white/90"
          aria-label="Закрыть"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>

        <h3 class="mb-5 pr-8 text-lg font-semibold text-gray-800 dark:text-white/90">
          Бронь №{{ id }}
        </h3>

        <!-- Loading -->
        <div v-if="loading" class="flex min-h-[180px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center"
        >
          <p class="text-error-600 dark:text-error-500">{{ error }}</p>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            @click="load"
          >
            Повторить
          </button>
        </div>

        <!-- Content -->
        <div v-else-if="detail" class="space-y-5">
          <!-- Status + source -->
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
              :class="stateClass"
            >
              {{ stateLabel }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
              :class="SOURCE_META[src.kind].badgeClass"
              :title="SOURCE_META[src.kind].typeLabel"
            >
              <component :is="SOURCE_ICON[src.kind]" class="h-3.5 w-3.5" />
              {{ src.label }}
            </span>
          </div>

          <!-- Booking facts -->
          <dl class="space-y-3 text-theme-sm">
            <div class="flex items-center gap-2.5">
              <MapPin class="h-4 w-4 shrink-0 text-gray-400" />
              <dt class="sr-only">Поле</dt>
              <dd class="text-gray-800 dark:text-white/90">Поле №{{ detail.field }}</dd>
            </div>
            <div class="flex items-center gap-2.5">
              <CalendarDays class="h-4 w-4 shrink-0 text-gray-400" />
              <dt class="sr-only">Дата</dt>
              <dd class="text-gray-800 dark:text-white/90">{{ formatDate(detail.date) }}</dd>
            </div>
            <div class="flex items-center gap-2.5">
              <Clock class="h-4 w-4 shrink-0 text-gray-400" />
              <dt class="sr-only">Время</dt>
              <dd class="text-gray-800 dark:text-white/90">
                {{ trim(detail.time_start) }} – {{ trim(detail.time_end) }}
              </dd>
            </div>
            <div class="flex items-center gap-2.5">
              <User class="h-4 w-4 shrink-0 text-gray-400" />
              <dt class="sr-only">Клиент</dt>
              <dd class="text-gray-800 dark:text-white/90">
                {{ detail.customer_name || '—' }}
              </dd>
            </div>
            <div class="flex items-center gap-2.5">
              <Phone class="h-4 w-4 shrink-0 text-gray-400" />
              <dt class="sr-only">Телефон</dt>
              <dd>
                <a
                  :href="`tel:${detail.phone}`"
                  class="text-brand-600 hover:underline dark:text-brand-400"
                >
                  {{ formatPhone(detail.phone) }}
                </a>
              </dd>
            </div>
            <div v-if="detail.notes" class="flex items-start gap-2.5">
              <StickyNote class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <dt class="sr-only">Заметка</dt>
              <dd class="text-gray-600 dark:text-gray-300">{{ detail.notes }}</dd>
            </div>
          </dl>

          <!-- Payments -->
          <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <dl class="space-y-2.5 text-theme-sm">
              <div
                v-for="r in payments"
                :key="r.label"
                class="flex items-center justify-between"
              >
                <dt class="text-gray-600 dark:text-gray-400">{{ r.label }}</dt>
                <dd class="font-medium text-gray-800 dark:text-white/90">
                  {{ formatPrice(r.value) }}
                </dd>
              </div>
              <div
                class="flex items-center justify-between border-t border-gray-200 pt-2.5 dark:border-gray-800"
              >
                <dt class="font-semibold text-gray-700 dark:text-gray-300">Оплачено</dt>
                <dd class="font-semibold text-success-600 dark:text-success-500">
                  {{ formatPrice(paidTotal) }}
                </dd>
              </div>
              <div v-if="remaining > 0" class="flex items-center justify-between">
                <dt class="text-gray-600 dark:text-gray-400">Остаток</dt>
                <dd class="font-medium text-warning-600 dark:text-warning-400">
                  {{ formatPrice(remaining) }}
                </dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-gray-600 dark:text-gray-400">Итого</dt>
                <dd class="font-medium text-gray-800 dark:text-white/90">
                  {{ formatPrice(total) }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Meta -->
          <dl class="space-y-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            <div class="flex items-center justify-between gap-4">
              <dt>Создана</dt>
              <dd>{{ formatDateTime(detail.created_at) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt>Обновлена</dt>
              <dd>{{ formatDateTime(detail.updated_at) }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </template>
  </Modal>
</template>
