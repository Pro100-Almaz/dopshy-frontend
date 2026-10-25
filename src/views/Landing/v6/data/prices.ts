import { ref } from 'vue'
import type { PricingType } from '@/types'
import { FIELD_TYPE_LABEL, getManagerFields } from '@/services/booking'
import { ZONE_ORDER, type Zone } from './site'

// Landing zones ↔ admin price list types (same hour windows as services/booking).
const ZONE_TYPE: Record<Zone, PricingType> = {
  night: 'after_midnight',
  day: 'morning_day',
  prime: 'evening',
  evening: 'late_night',
}

export type FormatPrices = { format: string; zones: Record<Zone, number> }

// Prices come from the admin price list, so the site can't drift from what booking charges.
const formats = ref<FormatPrices[]>([])
let started = false

async function load() {
  const fields = await getManagerFields()
  const seen = new Map<string, FormatPrices>()
  for (const f of fields) {
    if (seen.has(f.type) || !f.pricing) continue
    const zones = Object.fromEntries(
      ZONE_ORDER.map((z) => [z, f.pricing![ZONE_TYPE[z]] ?? f.pricePerHour]),
    ) as Record<Zone, number>
    seen.set(f.type, { format: FIELD_TYPE_LABEL[f.type] ?? f.type, zones })
  }
  // Cheapest format first: its price is the «от» figure.
  formats.value = [...seen.values()].sort((a, b) => a.zones.day - b.zones.day)
}

/** Arena prices per field format; empty until the API answers (retried on next mount). */
export function useArenaPrices() {
  if (!started) {
    started = true
    load().catch(() => (started = false))
  }
  return formats
}
