<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Component } from 'vue'
import {
  Loader2,
  History as HistoryIcon,
  Bot,
  UserCog,
  Globe,
  UserRound,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

import flatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.css'
import { Russian } from 'flatpickr/dist/l10n/ru.js'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BookingDetailModal from '@/components/bookings/BookingDetailModal.vue'

import type { HistoryChannel, HistoryEntry, SourceKind } from '@/types'
import { listHistory, parseSource, SOURCE_META, formatDateTime } from '@/services/history'

// Иконка по типу источника; цвета/метки — в SOURCE_META сервиса.
const SOURCE_ICON: Record<SourceKind, Component> = {
  manager: UserCog,
  chatbot: Bot,
  landing: Globe,
  account: UserRound,
  other: HelpCircle,
}

const currentPageTitle = 'История действий'

const PAGE_SIZE = 20

const entries = ref<HistoryEntry[]>([])
const loading = ref(true)
const error = ref('')

const page = ref(1)
const total = ref(0)
const totalPages = ref(1)

// Открытая карточка брони (клик по строке журнала). null — модалка закрыта.
const selectedBookingId = ref<number | null>(null)

// ── Фильтры ─────────────────────────────────────────
type ChannelFilter = 'all' | HistoryChannel
const channel = ref<ChannelFilter>('all')
const startDate = ref('')
const endDate = ref('')

// TODO: вернуть вместе с фильтром по источнику (кнопки скрыты в шаблоне).
// const CHANNELS: { key: ChannelFilter; label: string }[] = [
//   { key: 'all', label: 'Все' },
//   { key: 'whatsapp', label: 'Бот' },
//   { key: 'manager', label: 'Менеджер' },
// ]

// Минимальная форма инстанса flatpickr, которая нам нужна.
interface FpInstance {
  input: HTMLElement
  altInput?: HTMLElement
  calendarContainer?: HTMLElement
  close: () => void
}

// Пока открыт календарь, блокируем прокрутку контейнера контента:
// он приклеен к body (position: absolute), и скролл «отклеивал» бы его от поля.
let lockedScrollEl: HTMLElement | null = null
let openFp: FpInstance | null = null

function scrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const oy = getComputedStyle(node).overflowY
    if (/(auto|scroll)/.test(oy) && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return null
}

// Клик вне календаря и вне его поля — закрываем (надёжнее дефолта flatpickr,
// т.к. календарь вынесен в body).
function onDocPointerDown(e: PointerEvent) {
  if (!openFp) return
  const t = e.target as Node
  if (openFp.calendarContainer?.contains(t)) return
  if (openFp.input.contains(t) || openFp.altInput?.contains(t)) return
  openFp.close()
}

function lockScroll(_dates: Date[], _str: string, fp: FpInstance) {
  openFp = fp
  document.addEventListener('pointerdown', onDocPointerDown, true)
  lockedScrollEl = scrollableAncestor(fp.input)
  if (lockedScrollEl) lockedScrollEl.style.overflowY = 'hidden'
}

function unlockScroll() {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  openFp = null
  if (lockedScrollEl) {
    lockedScrollEl.style.overflowY = ''
    lockedScrollEl = null
  }
}

// Конфиги flatpickr: значение в формате Y-m-d (как ждёт бэкенд),
// отображение — d.m.Y на русском. Диапазон ограничивает второе поле.
const startConfig = computed(() => ({
  dateFormat: 'Y-m-d',
  altInput: true,
  altFormat: 'd.m.Y',
  locale: Russian,
  disableMobile: true,
  maxDate: endDate.value || undefined,
  onOpen: lockScroll,
  onClose: unlockScroll,
}))

const endConfig = computed(() => ({
  dateFormat: 'Y-m-d',
  altInput: true,
  altFormat: 'd.m.Y',
  locale: Russian,
  disableMobile: true,
  minDate: startDate.value || undefined,
  onOpen: lockScroll,
  onClose: unlockScroll,
}))

async function load() {
  loading.value = true
  try {
    const res = await listHistory({
      page: page.value,
      page_size: PAGE_SIZE,
      channel: channel.value === 'all' ? undefined : channel.value,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    })
    entries.value = res.data
    total.value = res.total
    totalPages.value = res.total_pages || 1
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить историю'
    entries.value = []
  } finally {
    loading.value = false
  }
}

// Смена фильтра сбрасывает на первую страницу и перезагружает.
watch([channel, startDate, endDate], () => {
  page.value = 1
  load()
})

// Смена страницы — перезагрузка (пагинация серверная).
watch(page, load)

function resetFilters() {
  channel.value = 'all'
  startDate.value = ''
  endDate.value = ''
}

function goTo(p: number) {
  const clamped = Math.min(Math.max(1, p), totalPages.value)
  if (clamped !== page.value) page.value = clamped
}

// Компактный ряд номеров страниц: первая, последняя, соседи текущей, «…».
const pageItems = computed<(number | '…')[]>(() => {
  const tp = totalPages.value
  const cur = page.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const items: (number | '…')[] = [1]
  const from = Math.max(2, cur - 1)
  const to = Math.min(tp - 1, cur + 1)
  if (from > 2) items.push('…')
  for (let i = from; i <= to; i++) items.push(i)
  if (to < tp - 1) items.push('…')
  items.push(tp)
  return items
})

// Записи с разобранным источником: иконка + цвет по типу, текст — правая часть.
const rows = computed(() =>
  entries.value.map((e) => {
    const src = parseSource(e.source)
    return { ...e, src, meta: SOURCE_META[src.kind], icon: SOURCE_ICON[src.kind] }
  }),
)

// Диапазон отображаемых записей: «1–20 из 37».
const rangeLabel = computed(() => {
  if (!total.value) return '0'
  const start = (page.value - 1) * PAGE_SIZE + 1
  const end = Math.min(page.value * PAGE_SIZE, total.value)
  return `${start}–${end} из ${total.value}`
})

// ── Живое обновление журнала ────────────────────────
// Реального времени пока нет — тихо опрашиваем бэкенд каждые 5 секунд. Обновляем
// список только при реальном изменении данных и не трогаем индикатор загрузки,
// поэтому для пользователя незаметно. Живёт, пока открыта страница.
const POLL_MS = 5000
let pollId: ReturnType<typeof setInterval> | null = null
let silentInFlight = false

async function pollHistory() {
  if (document.hidden) return
  if (selectedBookingId.value !== null) return // открыта карточка брони
  if (loading.value || silentInFlight) return

  silentInFlight = true
  try {
    const res = await listHistory({
      page: page.value,
      page_size: PAGE_SIZE,
      channel: channel.value === 'all' ? undefined : channel.value,
      start_date: startDate.value || undefined,
      end_date: endDate.value || undefined,
    })
    // Присваиваем массив только при изменении — иначе лишний ре-рендер и мигание.
    if (JSON.stringify(entries.value) !== JSON.stringify(res.data)) {
      entries.value = res.data
    }
    total.value = res.total
    totalPages.value = res.total_pages || 1
    if (error.value) error.value = '' // тихо восстановились после сбоя
  } catch {
    /* временный сбой сети — оставляем текущие данные, следующий тик повторит */
  } finally {
    silentInFlight = false
  }
}

function onVisibility() {
  // Вернулись на вкладку — сразу обновляемся, чтобы не показывать устаревшее.
  if (!document.hidden) pollHistory()
}

onMounted(() => {
  load()
  pollId = setInterval(pollHistory, POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  unlockScroll()
  if (pollId) clearInterval(pollId)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div class="space-y-6">
      <div
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <!-- Header -->
        <div
          class="flex flex-col gap-1 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6"
        >
          <h3 class="font-medium text-gray-800 dark:text-white/90">Журнал действий</h3>
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            Действия менеджеров и бота по бронированиям, новые сверху
          </p>
        </div>

        <!-- Filters -->
        <div
          class="flex flex-col gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <!-- TODO: фильтр по источнику (Бот/Менеджер) — включить, когда бэкенд
               будет отдавать канал стабильно. Пока скрыт, чтобы не путать.
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in CHANNELS"
              :key="c.key"
              type="button"
              class="rounded-full px-3 py-1.5 text-theme-xs font-medium transition-colors"
              :class="
                channel === c.key
                  ? 'bg-success-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
              "
              @click="channel = c.key"
            >
              {{ c.label }}
            </button>
          </div>
          -->

          <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div class="flex flex-1 items-center gap-1.5 sm:flex-none">
              <label class="text-theme-xs text-gray-500 dark:text-gray-400">с</label>
              <flat-pickr
                v-model="startDate"
                :config="startConfig"
                placeholder="дд.мм.гггг"
                class="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-2.5 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 sm:w-32"
              />
            </div>
            <div class="flex flex-1 items-center gap-1.5 sm:flex-none">
              <label class="text-theme-xs text-gray-500 dark:text-gray-400">по</label>
              <flat-pickr
                v-model="endDate"
                :config="endConfig"
                placeholder="дд.мм.гггг"
                class="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-2.5 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 sm:w-32"
              />
            </div>
            <button
              v-if="channel !== 'all' || startDate || endDate"
              type="button"
              class="text-theme-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
              @click="resetFilters"
            >
              Сбросить
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex min-h-[280px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center"
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

        <!-- Empty -->
        <div
          v-else-if="!entries.length"
          class="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <HistoryIcon class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">
            {{
              total || channel !== 'all' || startDate || endDate
                ? 'По выбранным фильтрам записей нет.'
                : 'История действий пока пуста.'
            }}
          </p>
        </div>

        <!-- Table -->
        <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Дата</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Источник
                  </p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Бронь</p>
                </th>
                <th class="px-5 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Действие</p>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="e in rows"
                :key="e.id"
                class="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.02]"
                role="button"
                tabindex="0"
                :aria-label="`Открыть бронь №${e.booking_id}`"
                @click="selectedBookingId = e.booking_id"
                @keydown.enter.prevent="selectedBookingId = e.booking_id"
                @keydown.space.prevent="selectedBookingId = e.booking_id"
              >
                <!-- Date -->
                <td class="whitespace-nowrap px-5 py-4 sm:px-6">
                  <span class="block text-gray-600 text-theme-sm dark:text-gray-300">
                    {{ formatDateTime(e.created_at) }}
                  </span>
                </td>

                <!-- Source -->
                <td class="whitespace-nowrap px-5 py-4 sm:px-6">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
                    :class="e.meta.badgeClass"
                    :title="e.meta.typeLabel"
                  >
                    <component :is="e.icon" class="h-3.5 w-3.5" />
                    {{ e.src.label }}
                  </span>
                </td>

                <!-- Booking id -->
                <td class="whitespace-nowrap px-5 py-4 sm:px-6">
                  <span class="text-gray-500 text-theme-sm dark:text-gray-400">
                    #{{ e.booking_id }}
                  </span>
                </td>

                <!-- Description -->
                <td class="px-5 py-4 sm:px-6">
                  <span class="block text-gray-800 text-theme-sm dark:text-white/90">
                    {{ e.description }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && !error && entries.length"
          class="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            Показано {{ rangeLabel }}
          </p>
          <nav class="flex items-center gap-1" aria-label="Пагинация">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              :disabled="page <= 1"
              aria-label="Предыдущая страница"
              @click="goTo(page - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>

            <template v-for="(item, i) in pageItems" :key="i">
              <span
                v-if="item === '…'"
                class="flex h-9 w-9 items-center justify-center text-theme-sm text-gray-400"
                >…</span
              >
              <button
                v-else
                type="button"
                class="flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-theme-sm font-medium transition-colors"
                :class="
                  item === page
                    ? 'border-success-500 bg-success-500 text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]'
                "
                :aria-current="item === page ? 'page' : undefined"
                @click="goTo(item as number)"
              >
                {{ item }}
              </button>
            </template>

            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              :disabled="page >= totalPages"
              aria-label="Следующая страница"
              @click="goTo(page + 1)"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>

    <BookingDetailModal
      v-if="selectedBookingId !== null"
      :id="selectedBookingId"
      @close="selectedBookingId = null"
    />
  </AdminLayout>
</template>
