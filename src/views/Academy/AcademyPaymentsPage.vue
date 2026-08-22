<script setup lang="ts">
/**
 * Платежи и чеки академии.
 *
 * ТЗ §2.7: бот читает чек AI, но подтверждает платёж человек. ТЗ §2.6:
 * напоминание уходит по `due_date` и только активным абонементам. Оба решения
 * принимаются здесь.
 *
 * Ручек на бэкенде пока нет — тогда экран показывает состояние ожидания с
 * контрактом, а не пустую таблицу.
 */
import { computed, onMounted, ref, watch } from 'vue'
import {
  Check,
  LoaderCircle,
  Pencil,
  Receipt,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import AcademyHeader from '@/components/academy/AcademyHeader.vue'
import ContactActions from '@/components/academy/ContactActions.vue'
import ModulePending from '@/components/academy/ModulePending.vue'
import StateBlock from '@/components/academy/StateBlock.vue'
import StatusPill from '@/components/academy/StatusPill.vue'
import {
  buttonDanger,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  buttonSize,
  inputSm,
  panel,
  td,
  th,
} from '@/components/academy/ui'
import { SPORTS, type SportKey } from '@/services/academy'
import {
  CHECK_STATUS_LABEL,
  formatTenge,
  listPayments,
  ModuleUnavailableError,
  overdueDays,
  setPaymentConfirmed,
  updatePayment,
  type AcademyPayment,
  type CheckStatus,
} from '@/services/academyPayments'
import { formatDate } from '@/services/academy'
import { setPending, type PendingMap } from '@/utils/pending'
import { plural, pluralize } from '@/utils/plural'

const props = defineProps<{ sport: SportKey }>()

const payments = ref<AcademyPayment[]>([])
const loading = ref(true)
const loadError = ref('')
const unavailable = ref(false)
const actionError = ref('')
const savingIds = ref<PendingMap<number>>({})
const query = ref('')
const tab = ref<'all' | 'review' | 'pending' | 'confirmed' | 'overdue'>('all')

const CONTRACT = computed(() => [
  {
    method: 'GET',
    path: `/api/${props.sport}/payments`,
    returns:
      'список платежей: child_name, parent_phone, discount, amount, sender_bank, receiver_bank, check_number, payment_date, due_date, check_status, is_active, confirmed, notes',
  },
  {
    method: 'PATCH',
    path: `/api/${props.sport}/payments/{payment_id}/confirmed`,
    returns: 'подтверждение платежа менеджером: { confirmed: boolean }',
  },
  {
    method: 'PATCH',
    path: `/api/${props.sport}/payments/{payment_id}`,
    returns: 'дата следующей оплаты и активность абонемента: { due_date, is_active, notes }',
  },
])

async function load() {
  loading.value = true
  actionError.value = ''
  try {
    payments.value = await listPayments(props.sport)
    unavailable.value = false
    loadError.value = ''
  } catch (e) {
    if (e instanceof ModuleUnavailableError) {
      unavailable.value = true
      loadError.value = ''
    } else {
      unavailable.value = false
      loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить платежи'
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.sport, load)

// ── Фильтры и производные ───────────────────────────────────────────

function statusTone(status: CheckStatus): 'pitch' | 'warning' | 'danger' | 'neutral' {
  if (status === 'read') return 'pitch'
  if (status === 'blurry' || status === 'manual') return 'warning'
  if (status === 'amount_mismatch') return 'danger'
  return 'neutral'
}

const counts = computed(() => ({
  review: payments.value.filter((item) => item.check_status !== 'read').length,
  pending: payments.value.filter((item) => item.confirmed !== true).length,
  overdue: payments.value.filter((item) => item.is_active && overdueDays(item.due_date) > 0).length,
}))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')

  return payments.value.filter((item) => {
    if (tab.value === 'review' && item.check_status === 'read') return false
    if (tab.value === 'pending' && item.confirmed === true) return false
    if (tab.value === 'confirmed' && item.confirmed !== true) return false
    if (tab.value === 'overdue' && !(item.is_active && overdueDays(item.due_date) > 0)) return false
    if (!q) return true

    return (
      item.child_name.toLowerCase().includes(q) ||
      item.check_number.toLowerCase().includes(q) ||
      (digits.length > 1 && item.parent_phone.replace(/\D/g, '').includes(digits))
    )
  })
})

const listedTotal = computed(() =>
  filtered.value.reduce((sum, item) => sum + (item.amount ?? 0), 0),
)

const state = computed(() => {
  if (loading.value) return 'loading' as const
  if (loadError.value) return 'error' as const
  if (!filtered.value.length) return 'empty' as const
  return 'ready' as const
})

const TABS = computed(() => [
  { value: 'all' as const, label: 'Все', count: payments.value.length },
  { value: 'review' as const, label: 'Проверить чек', count: counts.value.review },
  { value: 'pending' as const, label: 'Не подтверждены', count: counts.value.pending },
  { value: 'overdue' as const, label: 'Просрочены', count: counts.value.overdue },
  { value: 'confirmed' as const, label: 'Подтверждены', count: null },
])

const tabClass = (active: boolean) =>
  [
    'focus-ring rounded-lg px-3 py-1.5 text-theme-xs font-semibold transition-colors duration-150',
    active
      ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  ].join(' ')

// ── Дата следующей оплаты (ТЗ §2.6) ─────────────────────────────────

/** Правим дату прямо в строке: отдельная модалка ради одного поля не нужна. */
const editingDueId = ref(0)
const dueDraft = ref('')

function openDue(payment: AcademyPayment) {
  editingDueId.value = payment.payment_id
  dueDraft.value = (payment.due_date ?? '').slice(0, 10)
}

function cancelDue() {
  editingDueId.value = 0
  dueDraft.value = ''
}

async function saveDue(payment: AcademyPayment) {
  savingIds.value = setPending(savingIds.value, payment.payment_id, true)
  actionError.value = ''
  try {
    await updatePayment(props.sport, payment.payment_id, { due_date: dueDraft.value })
    payment.due_date = dueDraft.value || null
    cancelDue()
  } catch (e) {
    actionError.value =
      e instanceof ModuleUnavailableError
        ? 'Изменение даты оплаты ещё не поддерживается бэкендом.'
        : e instanceof Error
          ? e.message
          : 'Не удалось сохранить дату оплаты'
  } finally {
    savingIds.value = setPending(savingIds.value, payment.payment_id, false)
  }
}

// ── Подтверждение ───────────────────────────────────────────────────

async function confirm(payment: AcademyPayment, confirmed: boolean) {
  savingIds.value = setPending(savingIds.value, payment.payment_id, true)
  actionError.value = ''
  try {
    await setPaymentConfirmed(props.sport, payment.payment_id, confirmed)
    payment.confirmed = confirmed
  } catch (e) {
    actionError.value =
      e instanceof ModuleUnavailableError
        ? 'Подтверждение платежей ещё не поддерживается бэкендом.'
        : e instanceof Error
          ? e.message
          : 'Не удалось сохранить подтверждение'
  } finally {
    savingIds.value = setPending(savingIds.value, payment.payment_id, false)
  }
}
</script>

<template>
  <AdminLayout>
    <AcademyHeader
      :sport="sport"
      title="Платежи и чеки"
      subtitle="Бот распознаёт чек автоматически, но подтверждает платёж менеджер — как и требует ТЗ."
    >
      <template #actions>
        <button
          type="button"
          :class="[buttonSecondary, buttonSize.sm]"
          :disabled="loading"
          @click="load"
        >
          <LoaderCircle
            v-if="loading"
            class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <RefreshCw v-else class="h-3.5 w-3.5" aria-hidden="true" />
          Обновить
        </button>
      </template>
    </AcademyHeader>

    <ModulePending
      v-if="unavailable"
      title="Модуль платежей ждёт бэкенд"
      :description="`Интерфейс подтверждения чеков готов, но API платежей ${SPORTS[sport].genitive} пока не отвечает. Как только ручки появятся, экран заработает без изменений — он уже читает формат из листа «Төлемдер» технического задания.`"
      :endpoints="CONTRACT"
      @retry="load"
    />

    <template v-else>
      <section :class="panel">
        <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              aria-label="Состояние платежей"
              class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
            >
              <button
                v-for="item in TABS"
                :key="item.value"
                type="button"
                role="tab"
                :aria-selected="tab === item.value"
                :class="tabClass(tab === item.value)"
                @click="tab = item.value"
              >
                {{ item.label }}
                <span v-if="item.count" class="ml-1 tabular-nums">{{ item.count }}</span>
              </button>
            </div>

            <div class="relative sm:w-64">
              <label class="sr-only" for="payment-search">Поиск</label>
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <input
                id="payment-search"
                v-model="query"
                type="search"
                placeholder="Ребёнок, телефон, номер чека"
                :class="[inputSm, 'pl-9']"
              />
            </div>
          </div>

          <p v-if="filtered.length" class="mt-3 text-theme-xs text-gray-600 dark:text-gray-400">
            В списке {{ pluralize(filtered.length, 'платёж', 'платежа', 'платежей') }} на
            <strong class="font-semibold tabular-nums text-gray-900 dark:text-white">
              {{ formatTenge(listedTotal) }}</strong
            >.
          </p>
        </div>

        <p
          v-if="actionError"
          class="border-b border-error-200 bg-error-50 px-5 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300 sm:px-6"
          role="alert"
        >
          {{ actionError }}
        </p>

        <StateBlock
          :state="state"
          :error="loadError"
          :rows="6"
          empty-title="Платежей нет"
          empty-hint="Чеки появляются здесь после того, как родитель отправил их боту в WhatsApp."
          @retry="load"
        >
          <template #icon><Receipt class="h-5 w-5" aria-hidden="true" /></template>

          <table class="hidden w-full lg:table">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-800">
                <th :class="th">Ребёнок</th>
                <th :class="th">Сумма</th>
                <th :class="th">Чек</th>
                <th :class="th">Оплата до</th>
                <th :class="[th, 'text-right']">Подтверждение</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="payment in filtered"
                :key="payment.id"
                class="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/70 dark:hover:bg-white/[0.02]"
              >
                <td :class="[td, 'w-[22%]']">
                  <p class="text-theme-sm font-semibold text-gray-900 dark:text-white">
                    {{ payment.child_name || 'Без имени' }}
                  </p>
                  <div class="mt-1">
                    <ContactActions :phone="payment.parent_phone" />
                  </div>
                </td>

                <td :class="[td, 'w-[16%]']">
                  <p class="text-theme-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                    {{ formatTenge(payment.amount) }}
                  </p>
                  <StatusPill v-if="payment.has_discount" tone="info" class="mt-1">
                    Со скидкой
                  </StatusPill>
                </td>

                <td :class="[td, 'w-[26%]']">
                  <StatusPill :tone="statusTone(payment.check_status)">
                    {{ CHECK_STATUS_LABEL[payment.check_status] }}
                  </StatusPill>
                  <p class="mt-1.5 text-theme-xs text-gray-700 dark:text-gray-400">
                    <span v-if="payment.sender_bank">{{ payment.sender_bank }}</span>
                    <span v-if="payment.receiver_bank"> → {{ payment.receiver_bank }}</span>
                  </p>
                  <p
                    v-if="payment.check_number"
                    class="text-theme-xs tabular-nums text-gray-600 dark:text-gray-400"
                  >
                    {{ payment.check_number }}
                  </p>
                  <a
                    v-if="payment.check_url"
                    :href="payment.check_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="focus-ring mt-1 inline-block rounded text-theme-xs font-medium text-pitch-700 underline dark:text-pitch-400"
                  >
                    Открыть чек
                  </a>
                </td>

                <td :class="[td, 'w-[18%]']">
                  <div v-if="editingDueId === payment.payment_id" class="space-y-2">
                    <label class="sr-only" :for="`due-${payment.payment_id}`">
                      Дата следующей оплаты
                    </label>
                    <input
                      :id="`due-${payment.payment_id}`"
                      v-model="dueDraft"
                      type="date"
                      :class="inputSm"
                    />
                    <div class="flex gap-2">
                      <button
                        type="button"
                        :class="[buttonPrimary, buttonSize.sm]"
                        :disabled="savingIds[payment.payment_id]"
                        @click="saveDue(payment)"
                      >
                        Сохранить
                      </button>
                      <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="cancelDue">
                        Отмена
                      </button>
                    </div>
                  </div>

                  <template v-else>
                    <button
                      type="button"
                      class="focus-ring group inline-flex items-center gap-1.5 rounded text-theme-sm tabular-nums text-gray-900 dark:text-gray-200"
                      :title="'Изменить дату следующей оплаты'"
                      @click="openDue(payment)"
                    >
                      {{ payment.due_date ? formatDate(payment.due_date) : 'Задать дату' }}
                      <Pencil class="h-3 w-3 shrink-0 text-gray-500" aria-hidden="true" />
                    </button>
                    <StatusPill
                      v-if="payment.is_active && overdueDays(payment.due_date) > 0"
                      tone="danger"
                      class="mt-1"
                    >
                      Просрочка {{ pluralize(overdueDays(payment.due_date), 'день', 'дня', 'дней') }}
                    </StatusPill>
                    <StatusPill v-else-if="!payment.is_active" tone="neutral" class="mt-1">
                      Абонемент неактивен
                    </StatusPill>
                  </template>
                </td>

                <td :class="[td, 'w-[18%]']">
                  <div class="flex flex-col items-end gap-2">
                    <StatusPill
                      :tone="
                        payment.confirmed === true
                          ? 'pitch'
                          : payment.confirmed === false
                            ? 'danger'
                            : 'warning'
                      "
                    >
                      {{
                        payment.confirmed === true
                          ? 'Подтверждён'
                          : payment.confirmed === false
                            ? 'Отклонён'
                            : 'Ждёт проверки'
                      }}
                    </StatusPill>

                    <div class="flex gap-2">
                      <button
                        v-if="payment.confirmed !== true"
                        type="button"
                        :class="[buttonPrimary, buttonSize.sm]"
                        :disabled="savingIds[payment.payment_id]"
                        @click="confirm(payment, true)"
                      >
                        <Check class="h-3.5 w-3.5" aria-hidden="true" />
                        Подтвердить
                      </button>
                      <button
                        v-if="payment.confirmed !== false"
                        type="button"
                        :class="[buttonDanger, buttonSize.sm]"
                        :disabled="savingIds[payment.payment_id]"
                        @click="confirm(payment, false)"
                      >
                        <X class="h-3.5 w-3.5" aria-hidden="true" />
                        Отклонить
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800/70 lg:hidden">
            <li v-for="payment in filtered" :key="payment.id" class="px-5 py-4 sm:px-6">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-theme-sm font-semibold text-gray-900 dark:text-white">
                    {{ payment.child_name || 'Без имени' }}
                  </p>
                  <p class="mt-0.5 text-theme-sm font-bold tabular-nums text-gray-900 dark:text-white">
                    {{ formatTenge(payment.amount) }}
                  </p>
                </div>
                <StatusPill :tone="statusTone(payment.check_status)">
                  {{ CHECK_STATUS_LABEL[payment.check_status] }}
                </StatusPill>
              </div>

              <dl class="mt-3 space-y-1.5 text-theme-xs">
                <div class="flex gap-2">
                  <dt class="w-24 shrink-0 text-gray-600 dark:text-gray-400">Чек</dt>
                  <dd class="text-gray-900 dark:text-gray-200">
                    {{ payment.sender_bank || '—' }}
                    <template v-if="payment.receiver_bank"> → {{ payment.receiver_bank }}</template>
                    <span v-if="payment.check_number" class="tabular-nums">
                      · {{ payment.check_number }}</span
                    >
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt class="w-24 shrink-0 text-gray-600 dark:text-gray-400">Оплата до</dt>
                  <dd class="tabular-nums text-gray-900 dark:text-gray-200">
                    <button
                      type="button"
                      class="focus-ring inline-flex items-center gap-1.5 rounded"
                      @click="openDue(payment)"
                    >
                      {{ payment.due_date ? formatDate(payment.due_date) : 'Задать дату' }}
                      <Pencil class="h-3 w-3 shrink-0 text-gray-500" aria-hidden="true" />
                    </button>
                  </dd>
                </div>
                <div v-if="editingDueId === payment.payment_id" class="flex flex-wrap gap-2 pt-1">
                  <input v-model="dueDraft" type="date" :class="[inputSm, 'w-40']" aria-label="Дата следующей оплаты" />
                  <button
                    type="button"
                    :class="[buttonPrimary, buttonSize.sm]"
                    :disabled="savingIds[payment.payment_id]"
                    @click="saveDue(payment)"
                  >
                    Сохранить
                  </button>
                  <button type="button" :class="[buttonGhost, buttonSize.sm]" @click="cancelDue">
                    Отмена
                  </button>
                </div>
                <div class="flex gap-2">
                  <dt class="w-24 shrink-0 text-gray-600 dark:text-gray-400">Контакт</dt>
                  <dd><ContactActions :phone="payment.parent_phone" /></dd>
                </div>
              </dl>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  v-if="payment.confirmed !== true"
                  type="button"
                  :class="[buttonPrimary, buttonSize.sm]"
                  :disabled="savingIds[payment.payment_id]"
                  @click="confirm(payment, true)"
                >
                  <Check class="h-3.5 w-3.5" aria-hidden="true" />
                  Подтвердить
                </button>
                <button
                  v-if="payment.confirmed !== false"
                  type="button"
                  :class="[buttonGhost, buttonSize.sm]"
                  :disabled="savingIds[payment.payment_id]"
                  @click="confirm(payment, false)"
                >
                  Отклонить
                </button>
              </div>
            </li>
          </ul>
        </StateBlock>
      </section>

      <p
        v-if="counts.overdue"
        class="mt-4 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-theme-xs text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200"
      >
        <TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {{ pluralize(counts.overdue, 'активный абонемент', 'активных абонемента', 'активных абонементов') }}
        с просрочкой — {{ plural(counts.overdue, 'ждёт', 'ждут', 'ждут') }} решения. Бот напоминает
        об оплате повторно через три дня, как требует ТЗ §2.6.
      </p>
    </template>
  </AdminLayout>
</template>
