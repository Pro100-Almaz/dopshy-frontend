<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, CalendarPlus, Check, CreditCard, Loader2 } from 'lucide-vue-next'
import { ApiError } from '@/services/api'
import { createBookingsBatch, RESERVATION_TTL_MINUTES } from '@/services/booking'
import { useBookingStore } from '@/stores/booking'
import { useLang, fmt, money } from '../i18n'
import Modal from './Modal.vue'

const props = defineProps<{ open: boolean; fieldLabel: string; lines: string[] }>()
// conflict: some selected time was taken meanwhile — the parent rechecks the grid.
const emit = defineEmits<{ close: []; done: []; conflict: [] }>()

const { t, lang } = useLang()
const c = computed(() => t.value.checkout)
const store = useBookingStore()

const step = ref(0)
const name = ref('')
const phone = ref('')
const team = ref('')
const touched = ref(false)
const sending = ref(false)
const failed = ref(false)
// Bot rejected the number (NO_KASPI); cleared as soon as the phone is edited.
const noKaspi = ref(false)
watch(phone, () => (noKaspi.value = false))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    step.value = 0
    touched.value = false
    failed.value = false
    noKaspi.value = false
  },
)

function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+7')) d = d.slice(1)
  else if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1)
  d = d.slice(0, 10)
  if (!d) return ''
  let out = `+7 (${d.slice(0, 3)}`
  if (d.length >= 3) out += ')'
  if (d.length > 3) out += ` ${d.slice(3, 6)}`
  if (d.length > 6) out += ` ${d.slice(6, 8)}`
  if (d.length > 8) out += ` ${d.slice(8, 10)}`
  return out
}
const phoneComplete = (v: string) => v.replace(/\D/g, '').length === 11

const nameErr = computed(() => (touched.value && !name.value.trim() ? c.value.required : ''))
const phoneErr = computed(() =>
  noKaspi.value
    ? c.value.noKaspi
    : touched.value && !phoneComplete(phone.value)
      ? phone.value
        ? c.value.phoneInvalid
        : c.value.required
      : '',
)

function toPayment() {
  touched.value = true
  if (!name.value.trim() || !phoneComplete(phone.value)) return
  step.value = 1
}

async function confirm() {
  sending.value = true
  failed.value = false
  try {
    await createBookingsBatch({
      slots: store.batchSlots,
      customer: name.value.trim(),
      phone: `+${phone.value.replace(/\D/g, '')}`,
      notes: team.value.trim() ? `${c.value.team}: ${team.value.trim()}` : undefined,
      // 0 не отправляем — бэкенд подставит дефолт (как в CreateBookingModal).
      prepayment: store.prepaymentTotal || undefined,
      reserved_until: RESERVATION_TTL_MINUTES,
    })
    step.value = 2
  } catch (e) {
    const code = e instanceof ApiError ? e.code : undefined
    // Nothing was created in either case (the bot batch is all-or-nothing), so retrying is safe.
    if (code === 'SLOT_TAKEN' || code === 'TIME_IN_PAST') emit('conflict')
    else if (code === 'NO_KASPI') {
      noKaspi.value = true
      step.value = 0
    } else failed.value = true
  } finally {
    sending.value = false
  }
}

function downloadIcs() {
  const stamp = (date: string, time: string) =>
    `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  const events = store.intervals.map(
    (iv, i) =>
      `BEGIN:VEVENT\nUID:${iv.id}-${i}@dopsy.kz\nDTSTAMP:${now}Z\nDTSTART:${stamp(iv.date, iv.start)}\n` +
      // 24:00 is not a valid ICS time; the last slot of the day ends at 23:59.
      `DTEND:${stamp(iv.date, iv.end === '24:00' ? '23:59' : iv.end)}\n` +
      `SUMMARY:DOPȘÝ ARENA — ${props.fieldLabel}\nLOCATION:Астана\\, ул. Сыганак 6ф\nEND:VEVENT`,
  )
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DOPSY ARENA//booking//RU\n${events.join('\n')}\nEND:VCALENDAR`
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'dopsy-booking.ics'
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const inputCls =
  'min-h-13 w-full rounded-xl border border-line-2 bg-ink px-4 text-fg placeholder:text-fg-dim focus:border-acid focus:outline-none'
const btnPrimary =
  'min-h-13 rounded-full bg-acid font-semibold text-acid-ink hover:bg-acid-soft disabled:cursor-not-allowed disabled:opacity-70'
</script>

<template>
  <Modal
    :open="open"
    :title="c.title"
    :close-label="c.close"
    @close="step === 2 ? emit('done') : emit('close')"
  >
    <h2 class="pr-10 font-display text-3xl text-fg">{{ c.title }}</h2>

    <ol class="mt-5 flex gap-2" :aria-label="c.title">
      <li
        v-for="(s, i) in c.steps"
        :key="s"
        :aria-current="i === step ? 'step' : undefined"
        class="flex-1"
      >
        <span
          :class="['block h-1.5 rounded-full transition-colors', i <= step ? 'bg-acid' : 'bg-line']"
        />
        <span :class="['mt-1.5 block text-xs', i === step ? 'text-fg' : 'text-fg-dim']">
          {{ i + 1 }}. {{ s }}
        </span>
      </li>
    </ol>

    <div class="mt-5 rounded-2xl bg-ink-2 p-4 text-sm">
      <p class="font-semibold text-fg">{{ fieldLabel }}</p>
      <ul class="mt-1 max-h-20 overflow-auto text-fg-muted">
        <li v-for="l in lines" :key="l">{{ l }}</li>
      </ul>
      <p class="mt-2 flex justify-between border-t border-line pt-2 text-fg">
        <span>{{ t.booking.total }}</span>
        <span class="font-display text-xl text-acid">{{ money(store.total, lang) }}</span>
      </p>
    </div>

    <form v-if="step === 0" class="mt-6 space-y-4" novalidate @submit.prevent="toPayment">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-fg-muted">{{ c.name }}</span>
        <input
          v-model="name"
          :class="inputCls"
          :placeholder="c.namePh"
          autocomplete="name"
          :aria-invalid="!!nameErr"
        />
        <span v-if="nameErr" role="alert" class="mt-1.5 block text-xs text-boxy-soft">
          {{ nameErr }}
        </span>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-fg-muted">{{ c.phone }}</span>
        <input
          :value="phone"
          :class="inputCls"
          placeholder="+7 (7__) ___ __ __"
          inputmode="tel"
          autocomplete="tel"
          :aria-invalid="!!phoneErr"
          @input="phone = formatPhone(($event.target as HTMLInputElement).value)"
        />
        <span v-if="phoneErr" role="alert" class="mt-1.5 block text-xs text-boxy-soft">
          {{ phoneErr }}
        </span>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-fg-muted">{{ c.team }}</span>
        <input
          v-model="team"
          :class="inputCls"
          :placeholder="c.teamPh"
          autocomplete="organization"
        />
      </label>
      <button type="submit" :class="[btnPrimary, 'w-full']">{{ c.next }}</button>
    </form>

    <div v-else-if="step === 1" class="mt-6">
      <div class="flex items-start gap-4 rounded-2xl border-2 border-acid bg-acid/5 p-4">
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-acid text-acid-ink"
        >
          <CreditCard class="size-5" aria-hidden="true" />
        </span>
        <span class="flex-1">
          <span class="block font-semibold text-fg">{{ c.payTitle }}</span>
          <span class="block text-sm text-fg-muted">
            {{
              store.prepaymentTotal > 0
                ? fmt(c.payText, {
                    sum: money(store.prepaymentTotal, lang),
                    phone,
                    min: RESERVATION_TTL_MINUTES,
                  })
                : c.noPrepay
            }}
          </span>
        </span>
      </div>
      <p v-if="failed" role="alert" class="mt-4 text-sm text-boxy-soft">{{ c.error }}</p>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          class="flex min-h-13 items-center gap-2 rounded-full border border-line-2 px-5 text-fg-muted hover:text-fg"
          :disabled="sending"
          @click="step = 0"
        >
          <ArrowLeft class="size-4" aria-hidden="true" />
          {{ c.back }}
        </button>
        <button
          type="button"
          :class="[btnPrimary, 'flex flex-1 items-center justify-center gap-2']"
          :disabled="sending"
          @click="confirm"
        >
          <Loader2 v-if="sending" class="size-5 animate-spin" aria-hidden="true" />
          {{ c.confirm }}
        </button>
      </div>
    </div>

    <div v-else class="mt-6 text-center" role="status">
      <span
        class="mx-auto flex size-20 items-center justify-center rounded-full bg-acid text-acid-ink"
      >
        <Check class="size-10" :stroke-width="3" aria-hidden="true" />
      </span>
      <h3 class="mt-5 font-display text-4xl text-fg">{{ c.successTitle }}</h3>
      <p class="mt-2 text-fg-muted">
        {{
          store.prepaymentTotal > 0
            ? fmt(c.successText, { phone, min: RESERVATION_TTL_MINUTES })
            : c.successNoPrepay
        }}
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          class="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-full border border-line-2 text-fg hover:border-fg-dim"
          @click="downloadIcs"
        >
          <CalendarPlus class="size-4" aria-hidden="true" />
          {{ c.calendar }}
        </button>
        <button type="button" :class="[btnPrimary, 'flex-1']" @click="emit('done')">
          {{ c.done }}
        </button>
      </div>
    </div>
  </Modal>
</template>
