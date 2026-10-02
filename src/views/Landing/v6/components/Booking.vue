<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Moon, RotateCcw, Users, X } from 'lucide-vue-next'
import type { Field, Slot } from '@/types'
import {
  FIELD_TYPE_LABEL,
  getManagerFields,
  getManagerWeek,
  toISO,
  type WeekSlots,
} from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import { useLang, fmt, money } from '../i18n'
import { ZONE_HOURS, zoneAt, type Zone } from '../data/site'
import Section from './Section.vue'
import Reveal from './Reveal.vue'
import Picture from './Picture.vue'
import Checkout from './Checkout.vue'

const DAYS = 7
const MAX_WEEK = 3 // горизонт бронирования ~4 недели
const START_HOUR = 18 // сетка открывается на вечере — его бронируют чаще всего
const GROUPS: Zone[] = ['day', 'prime', 'evening', 'night']
const RAIL: Record<Zone, string> = {
  night: 'bg-fg-dim/50',
  day: 'bg-acid/60',
  prime: 'bg-prime',
  evening: 'bg-acid/35',
}
// Backend fields have no real photos (Field.photos are generic placeholders) — use the design's hall shots.
const FALLBACK_IMAGES = ['hall-main', 'hall-glass', 'hall-balcony']

const { t, lang } = useLang()
const b = computed(() => t.value.booking)
const store = useBookingStore()

const fields = ref<Field[]>([])
const fieldsState = ref<'loading' | 'error' | 'ready'>('loading')
const fieldIdx = ref(0)
const week = ref(0)
const data = ref<WeekSlots>({ days: [], rows: [] })
const weekLoading = ref(false)
const showNight = ref(false)
const focus = ref<[number, number]>([0, 0])
const checkout = ref(false)

const field = computed<Field | undefined>(() => fields.value[fieldIdx.value])
// Backend names carry the format ("Поле 1 (6x6)"); the design shows it as a separate badge.
const shortName = (f: Field) => f.name.replace(/\s*\([^)]*\)\s*$/, '')
const formatLabel = (f: Field) => FIELD_TYPE_LABEL[f.type] ?? f.type
const fieldLabel = computed(() =>
  field.value ? `${shortName(field.value)} · ${formatLabel(field.value)}` : '',
)

async function loadFields() {
  fieldsState.value = 'loading'
  try {
    fields.value = await getManagerFields()
    fieldsState.value = 'ready'
    if (fields.value.length) selectField(0)
  } catch {
    fieldsState.value = 'error'
  }
}

let req = 0
async function loadWeek() {
  if (!field.value) return
  const id = ++req
  weekLoading.value = true
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + week.value * DAYS)
  try {
    const w = await getManagerWeek(field.value, toISO(start), new Date(), DAYS)
    if (id === req) data.value = w
  } finally {
    if (id === req) weekLoading.value = false
  }
}

function selectField(i: number) {
  fieldIdx.value = i
  store.setField(fields.value[i]) // другое поле сбрасывает выбор
  week.value = 0
  loadWeek()
}

function shiftWeek(d: number) {
  week.value = Math.min(MAX_WEEK, Math.max(0, week.value + d))
  loadWeek()
}

const days = computed(() =>
  data.value.days.map((d) => {
    const [y, m, day] = d.iso.split('-').map(Number)
    return { iso: d.iso, date: new Date(y, m - 1, day) }
  }),
)
const todayISO = toISO(new Date())

type Row = { startMin: number; label: string; cells: Slot[]; zone: Zone }
const rowsByZone = computed(() => {
  const map = Object.fromEntries(GROUPS.map((z) => [z, [] as Row[]])) as Record<Zone, Row[]>
  for (const r of data.value.rows) {
    const zone = zoneAt(Math.floor(r.startMin / 60))
    map[zone].push({ ...r, zone })
  }
  return map
})
// Rows actually rendered, in display order — the keyboard grid walks this list.
const rows = computed(() =>
  GROUPS.flatMap((z) => (z === 'night' && !showNight.value ? [] : rowsByZone.value[z])),
)
const rowIndex = computed(() => new Map(rows.value.map((r, i) => [r.startMin, i])))

// Zone badge: cheapest hourly rate in that zone this week (weekends can cost more).
function zonePrice(z: Zone): number {
  const prices = rowsByZone.value[z].flatMap((r) => r.cells.map((c) => c.price * 2))
  return prices.length ? Math.min(...prices) : 0
}

const busy = (cell: Slot) => cell.status !== 'available' && !store.isSelected(cell.id)

function toggle(cell: Slot) {
  if (busy(cell)) return
  store.toggleSlot(cell)
}

const dayLabel = (d: Date) => `${b.value.weekdays[d.getDay()]} ${d.getDate()}`
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const summary = computed(() =>
  store.sortedSlots.map((s) => ({ slot: s, date: dateOf(s.date) })),
)
const lines = computed(() =>
  store.intervals.map((iv) => {
    const d = dateOf(iv.date)
    return `${dayLabel(d)} ${b.value.months[d.getMonth()]} · ${iv.start}–${iv.end}`
  }),
)

function cellLabel(d: Date, row: Row, cell: Slot) {
  const state = store.isSelected(cell.id)
    ? b.value.ariaSelected
    : busy(cell)
      ? b.value.ariaBusy
      : b.value.ariaFree
  const price = fmt(b.value.ariaPrice, { p: cell.price * 2 })
  return `${dayLabel(d)} ${b.value.months[d.getMonth()]}, ${row.label}, ${price}, ${state}`
}

// ── Keyboard: arrow keys move a roving tabindex over the grid ──
const gridRef = ref<HTMLElement>()
function onKeyDown(e: KeyboardEvent) {
  const [r, c] = focus.value
  const maxR = rows.value.length - 1
  let next: [number, number] | null = null
  switch (e.key) {
    case 'ArrowUp': next = [Math.max(0, r - 1), c]; break
    case 'ArrowDown': next = [Math.min(maxR, r + 1), c]; break
    case 'ArrowLeft': next = [r, Math.max(0, c - 1)]; break
    case 'ArrowRight': next = [r, Math.min(DAYS - 1, c + 1)]; break
    case 'Home': next = e.ctrlKey ? [0, 0] : [r, 0]; break
    case 'End': next = e.ctrlKey ? [maxR, DAYS - 1] : [r, DAYS - 1]; break
    case 'PageUp': next = [Math.max(0, r - 8), c]; break
    case 'PageDown': next = [Math.min(maxR, r + 8), c]; break
    case ' ':
    case 'Enter': {
      e.preventDefault()
      const cell = rows.value[r]?.cells[c]
      if (cell) toggle(cell)
      return
    }
    default:
      return
  }
  e.preventDefault()
  focus.value = next
  nextTick(() => gridRef.value?.querySelector<HTMLElement>(`[data-cell="${next![0]}-${next![1]}"]`)?.focus())
}

// ── First load: scroll the grid so the evening is in view ──
const scrollRef = ref<HTMLElement>()
let didScroll = false
watch(rows, async () => {
  if (didScroll || !rows.value.length) return
  await nextTick()
  const box = scrollRef.value
  const idx = rows.value.findIndex((r) => r.startMin === START_HOUR * 60)
  const row = box?.querySelector<HTMLElement>(`[data-row="${idx}"]`)
  if (!box || !row) return
  const head = box.querySelector<HTMLElement>('[data-head]')?.getBoundingClientRect().height ?? 56
  box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - head
  didScroll = true
})

// ── Mobile summary bar slides in while the grid is on screen ──
const areaRef = ref<HTMLElement>()
const areaInView = ref(false)
let io: IntersectionObserver | undefined
// The area renders only once fields have loaded, so observe it whenever it appears.
watch(areaRef, (el) => {
  io?.disconnect()
  if (!el) return
  io = new IntersectionObserver(([e]) => (areaInView.value = e.isIntersecting), {
    rootMargin: '-30% 0px -20% 0px',
  })
  io.observe(el)
})
onMounted(loadFields)
onBeforeUnmount(() => io?.disconnect())

function onDone() {
  checkout.value = false
  store.clearSlots()
  loadWeek() // только что созданная бронь должна стать «занято»
}
</script>

<template>
  <Section id="booking" :kicker="b.kicker" :title="b.title" :lead="b.lead">
    <div
      v-if="fieldsState === 'loading'"
      class="mb-6 grid gap-3 sm:grid-cols-3"
      aria-busy="true"
    >
      <div v-for="i in 3" :key="i" class="min-h-24 animate-pulse rounded-2xl bg-surface" />
    </div>

    <div
      v-else-if="fieldsState === 'error'"
      class="flex flex-col items-center gap-4 rounded-[1.5rem] border border-line bg-surface px-6 py-16 text-center"
    >
      <p class="text-fg-muted">{{ b.loadError }}</p>
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-full bg-acid px-5 font-semibold text-acid-ink hover:bg-acid-soft"
        @click="loadFields"
      >
        <RotateCcw class="size-4" aria-hidden="true" /> {{ b.retry }}
      </button>
    </div>

    <template v-else>
      <Reveal>
        <div role="radiogroup" :aria-label="b.field" class="mb-6 grid gap-3 sm:grid-cols-3">
          <button
            v-for="(f, i) in fields"
            :key="f.id"
            type="button"
            role="radio"
            :aria-checked="i === fieldIdx"
            :class="[
              'group relative flex min-h-24 items-end overflow-hidden rounded-2xl border-2 p-4 text-left transition-colors',
              i === fieldIdx ? 'border-acid' : 'border-line hover:border-line-2',
            ]"
            @click="i !== fieldIdx && selectField(i)"
          >
            <Picture
              :name="FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]"
              alt=""
              sizes="(max-width: 640px) 92vw, 30vw"
              class="absolute inset-0 size-full object-cover opacity-50 transition-opacity group-hover:opacity-70"
            />
            <span
              aria-hidden="true"
              class="absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-transparent"
            />
            <span class="relative flex w-full items-end justify-between gap-2">
              <span>
                <span class="block font-display text-2xl text-fg">{{ shortName(f) }}</span>
                <span v-if="f.capacity" class="flex items-center gap-1.5 text-xs text-fg-muted">
                  <Users class="size-3.5" aria-hidden="true" />
                  {{ fmt(b.players, { n: f.capacity }) }}
                </span>
              </span>
              <span
                :class="[
                  'rounded-full px-3 py-1 font-display text-lg',
                  i === fieldIdx ? 'bg-acid text-acid-ink' : 'bg-ink/70 text-fg',
                ]"
              >
                {{ formatLabel(f) }}
              </span>
            </span>
          </button>
        </div>
      </Reveal>

      <div ref="areaRef" class="grid gap-6 pb-28 lg:grid-cols-[1fr_22rem] lg:items-start lg:pb-0">
        <Reveal class="min-w-0">
          <div class="overflow-hidden rounded-[1.5rem] border border-line bg-surface">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3"
            >
              <h3 class="font-display text-xl text-fg">{{ b.schedule }}</h3>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  :disabled="week === 0"
                  :aria-label="b.prev"
                  class="flex size-11 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                  @click="shiftWeek(-1)"
                >
                  <ChevronLeft class="size-5" aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  class="min-w-28 text-center text-sm font-medium text-fg tabular-nums"
                >
                  <template v-if="days.length">
                    {{ days[0].date.getDate() }} – {{ days[days.length - 1].date.getDate() }}
                    {{ b.months[days[days.length - 1].date.getMonth()] }}
                  </template>
                </span>
                <button
                  type="button"
                  :disabled="week === MAX_WEEK"
                  :aria-label="b.next"
                  class="flex size-11 items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                  @click="shiftWeek(1)"
                >
                  <ChevronRight class="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <ul
              class="flex flex-wrap gap-x-5 gap-y-2 border-b border-line px-5 py-3 text-xs text-fg-muted"
            >
              <li class="flex items-center gap-2">
                <span class="size-4 rounded border border-line-2 bg-surface-2" aria-hidden="true" />
                {{ b.free }}
              </li>
              <li class="flex items-center gap-2">
                <span
                  class="slot-busy flex size-4 items-center justify-center rounded border border-line-2"
                  aria-hidden="true"
                >
                  <X class="size-3" />
                </span>
                {{ b.busy }}
              </li>
              <li class="flex items-center gap-2">
                <span class="flex size-4 items-center justify-center rounded bg-acid" aria-hidden="true">
                  <Check class="size-3 text-acid-ink" :stroke-width="3" />
                </span>
                {{ b.selected }}
              </li>
            </ul>

            <div ref="scrollRef" class="relative max-h-[34rem] overflow-auto overscroll-contain">
              <div
                v-if="weekLoading"
                class="absolute inset-0 z-30 flex items-center justify-center bg-surface/60"
              >
                <Loader2 class="size-7 animate-spin text-acid" aria-hidden="true" />
              </div>
              <div
                ref="gridRef"
                role="grid"
                :aria-label="`${b.schedule}: ${fieldLabel}`"
                :aria-rowcount="rows.length + 1"
                :aria-colcount="DAYS + 1"
                class="min-w-[40rem]"
                @keydown="onKeyDown"
              >
                <div
                  role="row"
                  data-head
                  class="sticky top-0 z-20 flex bg-surface shadow-[0_1px_0_var(--color-line)]"
                >
                  <div
                    role="columnheader"
                    class="sticky left-0 z-10 w-18 shrink-0 border-r border-line bg-surface px-3 py-3 text-xs text-fg-dim"
                  >
                    {{ b.time }}
                  </div>
                  <div
                    v-for="d in days"
                    :key="d.iso"
                    role="columnheader"
                    class="flex-1 px-1 py-2 text-center"
                  >
                    <span class="block text-[0.7rem] text-fg-dim uppercase">
                      {{ b.weekdays[d.date.getDay()] }}
                    </span>
                    <span
                      :class="['font-display text-lg', d.iso === todayISO ? 'text-acid' : 'text-fg']"
                    >
                      {{ d.date.getDate() }}
                    </span>
                    <span v-if="d.iso === todayISO" class="sr-only">{{ b.today }}</span>
                  </div>
                </div>

                <div v-for="z in GROUPS" :key="z" role="rowgroup">
                  <div role="row" class="flex">
                    <div
                      role="gridcell"
                      :aria-colspan="DAYS + 1"
                      class="flex w-full items-center gap-3 border-y border-line bg-ink-2/80 px-3 py-1.5"
                    >
                      <span :class="['h-5 w-1 rounded-full', RAIL[z]]" aria-hidden="true" />
                      <button
                        v-if="z === 'night'"
                        type="button"
                        :aria-expanded="showNight"
                        class="flex min-h-11 flex-1 items-center gap-2 text-left text-sm font-semibold text-fg-muted hover:text-fg"
                        @click="showNight = !showNight"
                      >
                        <Moon class="size-4" aria-hidden="true" />
                        {{ t.prices.zones.night }}
                        <span class="font-normal text-fg-dim tabular-nums">{{ ZONE_HOURS.night }}</span>
                        <ChevronDown
                          :class="['size-4 transition-transform', showNight ? 'rotate-180' : '']"
                          aria-hidden="true"
                        />
                      </button>
                      <p v-else class="flex min-h-11 flex-1 flex-wrap items-center gap-x-2 text-sm">
                        <span class="font-semibold text-fg">{{ t.prices.zones[z] }}</span>
                        <span class="text-fg-dim tabular-nums">{{ ZONE_HOURS[z] }}</span>
                      </p>
                      <span
                        v-if="zonePrice(z)"
                        :class="[
                          'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                          z === 'prime' ? 'bg-prime/15 text-prime' : 'bg-surface-2 text-fg-muted',
                        ]"
                      >
                        {{ b.from }} {{ money(zonePrice(z), lang) }}{{ t.prices.perHour }}
                      </span>
                    </div>
                  </div>

                  <template v-if="z !== 'night' || showNight">
                    <div
                      v-for="row in rowsByZone[z]"
                      :key="row.startMin"
                      role="row"
                      :data-row="rowIndex.get(row.startMin)"
                      class="flex border-b border-line/40"
                    >
                      <div
                        role="rowheader"
                        class="sticky left-0 z-10 flex w-18 shrink-0 items-center border-r border-line bg-surface px-3 text-xs text-fg-muted tabular-nums"
                      >
                        {{ row.label }}
                      </div>
                      <div
                        v-for="(cell, dayIdx) in row.cells"
                        :key="cell.id"
                        role="gridcell"
                        :data-cell="`${rowIndex.get(row.startMin)}-${dayIdx}`"
                        :tabindex="
                          focus[0] === rowIndex.get(row.startMin) && focus[1] === dayIdx ? 0 : -1
                        "
                        :aria-selected="store.isSelected(cell.id)"
                        :aria-disabled="busy(cell) || undefined"
                        :aria-label="cellLabel(days[dayIdx].date, row, cell)"
                        :class="[
                          'm-0.5 flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-xs transition-colors select-none',
                          store.isSelected(cell.id)
                            ? 'bg-acid font-semibold text-acid-ink'
                            : cell.status === 'booked'
                              ? 'slot-busy cursor-not-allowed text-fg-dim'
                              : cell.status === 'past'
                                ? 'cursor-not-allowed text-fg-dim/40'
                                : 'bg-surface-2/60 text-fg-muted hover:bg-acid/20 hover:text-fg',
                        ]"
                        @focus="focus = [rowIndex.get(row.startMin)!, dayIdx]"
                        @click="toggle(cell)"
                      >
                        <Check
                          v-if="store.isSelected(cell.id)"
                          class="size-4"
                          :stroke-width="3"
                          aria-hidden="true"
                        />
                        <X
                          v-else-if="cell.status === 'booked'"
                          class="size-3.5 opacity-60"
                          aria-hidden="true"
                        />
                        <span v-else-if="cell.status === 'available'" class="tabular-nums opacity-80">
                          {{ Math.round((cell.price * 2) / 1000) }}K
                        </span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <aside
          :aria-label="b.yourChoice"
          :class="[
            'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 p-4 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-24 lg:translate-y-0 lg:rounded-[1.5rem] lg:border lg:bg-surface lg:p-6',
            areaInView || store.count > 0 ? 'translate-y-0' : 'translate-y-full',
          ]"
        >
          <div class="mx-auto flex max-w-7xl items-center gap-4 lg:block">
            <div class="hidden lg:block">
              <h3 class="font-display text-2xl text-fg">{{ b.yourChoice }}</h3>
              <p class="text-sm text-fg-dim">{{ fieldLabel }}</p>
              <div class="mt-4 min-h-24 border-t border-line pt-4">
                <p v-if="store.count === 0" class="text-sm text-fg-dim">{{ b.empty }}</p>
                <TransitionGroup
                  v-else
                  tag="ul"
                  class="max-h-48 space-y-1.5 overflow-auto pr-1 text-sm"
                  enter-from-class="opacity-0 -translate-x-2"
                  enter-active-class="transition duration-200"
                >
                  <li
                    v-for="x in summary"
                    :key="x.slot.id"
                    class="flex justify-between gap-3 text-fg-muted"
                  >
                    <span>{{ dayLabel(x.date) }} · {{ x.slot.start }}</span>
                    <span class="text-fg-dim tabular-nums">{{ money(x.slot.price, lang) }}</span>
                  </li>
                </TransitionGroup>
              </div>
            </div>

            <div
              class="min-w-0 flex-1 lg:mt-5 lg:flex lg:items-end lg:justify-between lg:border-t lg:border-line lg:pt-5"
            >
              <span class="text-xs text-fg-muted lg:text-sm">{{ b.total }}</span>
              <span class="block lg:text-right" aria-live="polite">
                <span class="block font-display text-3xl whitespace-nowrap text-acid tabular-nums lg:text-4xl">
                  {{ money(store.total, lang) }}
                </span>
                <span class="block text-xs text-fg-dim">
                  {{ fmt(b.slots, { n: store.count }) }}
                  <template v-if="store.prepaymentTotal > 0">
                    <span class="hidden lg:inline">· {{ b.prepayment }} {{ money(store.prepaymentTotal, lang) }}</span>
                  </template>
                </span>
              </span>
            </div>

            <div class="flex shrink-0 gap-2 lg:mt-5">
              <button
                v-if="store.count > 0"
                type="button"
                class="hidden min-h-13 rounded-full border border-line-2 px-4 text-sm text-fg-muted hover:text-fg lg:block"
                @click="store.clearSlots()"
              >
                {{ b.clear }}
              </button>
              <button
                type="button"
                :disabled="store.count === 0"
                class="min-h-13 flex-1 rounded-full bg-acid px-6 font-semibold text-acid-ink transition-colors hover:bg-acid-soft disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-dim lg:w-full"
                @click="checkout = true"
              >
                {{ b.book }}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <Checkout
        :open="checkout"
        :field-label="fieldLabel"
        :lines="lines"
        @close="checkout = false"
        @done="onDone"
      />
    </template>
  </Section>
</template>
