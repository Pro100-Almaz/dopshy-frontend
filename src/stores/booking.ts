import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Field, Slot, RepeatRule, SlotInterval } from '@/types'
import {
  groupSlotsByDate,
  mergeContiguousSlots,
  buildBatchSlots,
  computeOccurrences,
  dayFullLabel,
} from '@/services/booking'

/** 'HH:mm' → минуты от полуночи ('24:00' → 1440). */
function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export const useBookingStore = defineStore('booking', () => {
  const field = ref<Field | null>(null)
  const selectedSlots = ref<Slot[]>([])
  // Правила повтора живут в сторе — переживают переключение недель (как selectedSlots),
  // поэтому производные ячейки перерисовываются на любой открытой неделе.
  const repeatRules = ref<RepeatRule[]>([])

  const sortedSlots = computed(() =>
    [...selectedSlots.value].sort((a, b) =>
      a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
    ),
  )
  const groupedByDate = computed(() => groupSlotsByDate(selectedSlots.value))
  const total = computed(() => selectedSlots.value.reduce((sum, s) => sum + s.price, 0))
  const count = computed(() => selectedSlots.value.length)

  // Границы залоченных повтором интервалов — точки разрыва слияния.
  const cutSet = computed(() => {
    const s = new Set<number>()
    for (const r of repeatRules.value) {
      s.add(toMin(r.start))
      s.add(toMin(r.end))
    }
    return s
  })

  // Слитные интервалы из выбранных слотов (то, что уходит на бэкенд / в сводки).
  const intervals = computed<SlotInterval[]>(() =>
    mergeContiguousSlots(selectedSlots.value, cutSet.value),
  )

  // Интервалы, сгруппированные по дате — для сводок и модалки создания.
  const groupedIntervals = computed(() => {
    const map = new Map<string, SlotInterval[]>()
    for (const iv of [...intervals.value].sort((a, b) =>
      a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
    )) {
      const arr = map.get(iv.date) ?? []
      arr.push(iv)
      map.set(iv.date, arr)
    }
    return map
  })

  // Множитель повтора интервала: число вхождений (1 без повтора).
  function occurrenceCount(id: string): number {
    const r = repeatRules.value.find((x) => x.id === id)
    return r ? computeOccurrences(r.date, r.until, r.mode).length : 1
  }

  // Интервалы по датам с подписью и подытогом — для сводок/модалки. `count` — число
  // вхождений повтора, `lineTotal` — цена интервала × count (учёт производных броней).
  const intervalGroups = computed(() =>
    [...groupedIntervals.value.entries()]
      .map(([date, items]) => {
        const intervals = items.map((iv) => {
          const count = occurrenceCount(iv.id)
          return { ...iv, count, lineTotal: iv.price * count }
        })
        return {
          date,
          label: dayFullLabel(date),
          intervals,
          subtotal: intervals.reduce((sum, iv) => sum + iv.lineTotal, 0),
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date)),
  )

  // Итог с учётом всех вхождений повтора (не только исходного интервала).
  const projectedTotal = computed(() =>
    intervalGroups.value.reduce((sum, g) => sum + g.subtotal, 0),
  )

  // Строки для /bookings/batch — слитые интервалы + повтор.
  const batchSlots = computed(() => buildBatchSlots(intervals.value, repeatRules.value))

  // Мемо дат вхождений на каждое правило — чтобы не пересчитывать на каждую ячейку.
  const occurrenceIndex = computed(() =>
    repeatRules.value.map((r) => ({
      rule: r,
      startMin: toMin(r.start),
      endMin: toMin(r.end),
      dates: new Set(computeOccurrences(r.date, r.until, r.mode)),
    })),
  )

  // Switching field invalidates the current selection.
  function setField(f: Field) {
    if (field.value?.id !== f.id) {
      selectedSlots.value = []
      repeatRules.value = []
    }
    field.value = f
  }

  function toggleSlot(slot: Slot) {
    const i = selectedSlots.value.findIndex((s) => s.id === slot.id)
    if (i >= 0) selectedSlots.value.splice(i, 1)
    else selectedSlots.value.push({ ...slot })
  }

  function isSelected(id: string): boolean {
    return selectedSlots.value.some((s) => s.id === id)
  }

  function clearSlots() {
    selectedSlots.value = []
    repeatRules.value = []
  }

  function clear() {
    field.value = null
    selectedSlots.value = []
    repeatRules.value = []
  }

  // ── Повтор ──────────────────────────────────────────
  function addRepeatRule(rule: RepeatRule) {
    const rest = repeatRules.value.filter((r) => r.id !== rule.id)
    repeatRules.value = [...rest, rule]
  }

  function removeRepeatRule(id: string) {
    repeatRules.value = repeatRules.value.filter((r) => r.id !== id)
  }

  function ruleFor(id: string): RepeatRule | undefined {
    return repeatRules.value.find((r) => r.id === id)
  }

  /**
   * Роль ячейки в повторе: 'source' — исходный интервал (изменяемый),
   * 'occurrence' — производное вхождение (неизменяемое), null — обычная ячейка.
   */
  function cellRepeatState(
    fieldId: string,
    date: string,
    start: string,
    end: string,
  ): 'source' | 'occurrence' | null {
    const cs = toMin(start)
    const ce = toMin(end)
    for (const o of occurrenceIndex.value) {
      if (o.rule.fieldId !== fieldId) continue
      if (cs < o.startMin || ce > o.endMin) continue // ячейка должна быть внутри интервала
      if (date === o.rule.date) return 'source'
      if (o.dates.has(date)) return 'occurrence'
    }
    return null
  }

  // Реконсиляция: если исходный интервал изменился (нет точного совпадения id
  // среди текущих интервалов) — повтор отменяется, производные ячейки освобождаются.
  watch(selectedSlots, () => {
    const validIds = new Set(intervals.value.map((iv) => iv.id))
    const kept = repeatRules.value.filter((r) => validIds.has(r.id))
    if (kept.length !== repeatRules.value.length) repeatRules.value = kept
  }, { deep: true })

  return {
    field,
    selectedSlots,
    repeatRules,
    sortedSlots,
    groupedByDate,
    intervals,
    intervalGroups,
    batchSlots,
    total,
    projectedTotal,
    occurrenceCount,
    count,
    setField,
    toggleSlot,
    isSelected,
    clearSlots,
    clear,
    addRepeatRule,
    removeRepeatRule,
    ruleFor,
    cellRepeatState,
  }
})
