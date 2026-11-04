<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ContractCreateDialog from '@/components/contracts/ContractCreateDialog.vue'
import ContractPaymentsDialog from '@/components/contracts/ContractPaymentsDialog.vue'
import Modal from '@/components/ui/Modal.vue'
import ModalBackButton from '@/components/ui/ModalBackButton.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'
import type { ContractListRow, ContractStatus, CreateContractResult } from '@/services/contracts'
import {
  CONTRACT_STATUS_LABEL,
  PAYMENT_CHANNEL_LABEL,
  contractErrorMessage,
  contractStatusClass,
  contractStatusLabel,
  deleteContract,
  listContracts,
  paymentStatusClass,
  paymentStatusLabel,
  updateContract,
} from '@/services/contracts'
import { formatDateTime, formatPrice, getManagerFields, toISO } from '@/services/booking'
import type { Field } from '@/types'

const currentPageTitle = 'Контракты'
const PAGE_SIZE = 20

const auth = useAuthStore()
const bookingStore = useBookingStore()

const contracts = ref<ContractListRow[]>([])
const fields = ref<Field[]>([])
const loading = ref(true)
const saving = ref(false)
const deletingId = ref<number | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const editError = ref('')
const search = ref('')
const page = ref(1)
const atEnd = ref(false)
const createOpen = ref(false)
const editOpen = ref(false)
const editing = ref<ContractListRow | null>(null)
const paymentsOpen = ref(false)
const paymentsContract = ref<ContractListRow | null>(null)
const actionOpen = ref<number | null>(null)
// Меню вынесено в body (таблица обрезает overflow), поэтому позиция — fixed.
const actionPos = ref({ top: 0, right: 0, up: false })
const ACTION_MENU_HEIGHT = 140

function toggleActions(id: number, event: MouseEvent) {
  if (actionOpen.value === id) {
    actionOpen.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const up = rect.bottom + ACTION_MENU_HEIGHT > window.innerHeight
  actionPos.value = {
    top: up ? rect.top : rect.bottom,
    right: window.innerWidth - rect.right,
    up,
  }
  actionOpen.value = id
}

// На телефоне в строке только «Контракт» и «Клиент»; остальное и действия — в модалке по нажатию.
const isMobile = useMediaQuery('(max-width: 767px)')
const detailContract = ref<ContractListRow | null>(null)

function openDetails(contract: ContractListRow) {
  if (isMobile.value) detailContract.value = contract
}
watch(isMobile, (mobile) => {
  if (!mobile) detailContract.value = null
})

// Платежи и редактирование открываются поверх деталей. «Назад» (и «Отмена»,
// и успешное сохранение) возвращают к деталям; X / Escape закрывают всё.
let returningToDetails = false
function backToDetails() {
  returningToDetails = true
}
// «Отмена» в редактировании: из деталей — шаг назад, иначе просто закрыть.
function cancelEdit() {
  if (detailContract.value) backToDetails()
  editOpen.value = false
}
function onStackedChildClosed() {
  if (!returningToDetails) detailContract.value = null
  returningToDetails = false
}

const hasPrev = computed(() => page.value > 1)
const hasNext = computed(() => contracts.value.length >= PAGE_SIZE && !atEnd.value)

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

async function goToPage(target: number) {
  if (target < 1) return
  loading.value = true
  errorMessage.value = ''
  try {
    const rows = await listContracts(target, search.value)
    if (rows.length === 0 && target > 1) {
      atEnd.value = true
      return
    }
    contracts.value = rows
    page.value = target
    // Открытые детали — на свежие данные строки.
    const open = detailContract.value
    if (open) detailContract.value = rows.find((row) => row.id === open.id) ?? open
    atEnd.value = false
  } catch (e) {
    errorMessage.value = contractErrorMessage(e, 'Не удалось загрузить контракты')
  } finally {
    loading.value = false
  }
}

let searchTimer: number | undefined
watch(search, () => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
    atEnd.value = false
    goToPage(1)
  }, 350)
})

onMounted(async () => {
  await Promise.all([
    goToPage(1),
    getManagerFields()
      .then((rows) => {
        fields.value = rows
      })
      .catch(() => {
        fields.value = []
      }),
  ])
})

onUnmounted(() => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
  bookingStore.clear()
})

function prevPage() {
  if (hasPrev.value) goToPage(page.value - 1)
}

function nextPage() {
  if (hasNext.value) goToPage(page.value + 1)
}

function openPayments(contract: ContractListRow) {
  paymentsContract.value = contract
  actionOpen.value = null
  paymentsOpen.value = true
}

// Статус оплаты в строке списка обновляется при закрытии диалога платежей.
let paymentsChanged = false
function onPaymentsChanged() {
  paymentsChanged = true
}
watch(paymentsOpen, (isOpen) => {
  if (!isOpen) onStackedChildClosed()
  if (isOpen || !paymentsChanged) return
  paymentsChanged = false
  goToPage(page.value)
})

function openEdit(contract: ContractListRow) {
  editing.value = contract
  actionOpen.value = null
  editOpen.value = true
}

async function onDelete(contract: ContractListRow) {
  actionOpen.value = null
  detailContract.value = null
  const ok = window.confirm(`Отменить контракт #${contract.id} и активные связанные брони?`)
  if (!ok) return
  deletingId.value = contract.id
  errorMessage.value = ''
  try {
    await deleteContract(contract.id)
    await goToPage(page.value)
  } catch (e) {
    errorMessage.value = contractErrorMessage(e, 'Не удалось отменить контракт')
  } finally {
    deletingId.value = null
  }
}

type ContractForm = {
  customer_name: string
  phone: string
  start_date: string
  end_date: string
  price: string
  status: ContractStatus
  notes: string
  source: string
}

function emptyForm(): ContractForm {
  const today = toISO(new Date())
  return {
    customer_name: '',
    phone: '',
    start_date: today,
    end_date: today,
    price: '',
    status: 'confirmed',
    notes: '',
    source: 'manager',
  }
}

const form = reactive<ContractForm>(emptyForm())
const formTouched = ref(false)

function fillForm(contract?: ContractListRow | null) {
  const next = contract
    ? {
        customer_name: contract.customer_name,
        phone: contract.phone ?? '',
        start_date: contract.start_date,
        end_date: contract.end_date,
        price: String(contract.price),
        status: contract.status,
        notes: contract.notes ?? '',
        source: contract.source ?? 'manager',
      }
    : emptyForm()
  Object.assign(form, next)
  formTouched.value = false
}

const formError = computed(() => {
  if (!form.customer_name.trim()) return 'Укажите клиента или компанию'
  if (!form.start_date) return 'Укажите дату начала'
  if (!form.end_date) return 'Укажите дату окончания'
  if (form.end_date < form.start_date) return 'Дата окончания не может быть раньше начала'
  const price = Number(form.price)
  if (form.price === '' || !Number.isFinite(price) || price < 1) return 'Укажите сумму контракта'
  if (
    editing.value?.payment_status &&
    editing.value.payment_status !== 'none' &&
    !Number.isInteger(price)
  )
    return 'При онлайн-оплате сумма — в целых тенге'
  return ''
})

function contractPayload() {
  return {
    customer_name: form.customer_name.trim(),
    phone: form.phone.trim() || null,
    start_date: form.start_date,
    end_date: form.end_date,
    price: Number(form.price),
    status: form.status,
    notes: form.notes.trim(),
    source: form.source.trim() || 'manager',
    updated_by: auth.user?.name || auth.user?.email || undefined,
  }
}

const editDialog = ref<HTMLDialogElement | null>(null)

function openCreate() {
  successMessage.value = ''
  createOpen.value = true
}

async function onCreated(result: CreateContractResult) {
  const channel = result.payment_plan?.payment_channel
  successMessage.value =
    `Контракт #${result.contract_id} создан, броней: ${result.created_count}.` +
    (channel ? ` Оплата: ${PAYMENT_CHANNEL_LABEL[channel].toLowerCase()}.` : '')
  await goToPage(1)
}

async function submitEdit() {
  if (!editing.value) return
  formTouched.value = true
  if (formError.value) return
  saving.value = true
  editError.value = ''
  try {
    await updateContract(editing.value.id, contractPayload())
    backToDetails()
    editOpen.value = false
    editing.value = null
    await goToPage(page.value)
  } catch (e) {
    editError.value = contractErrorMessage(e, 'Не удалось сохранить контракт')
  } finally {
    saving.value = false
  }
}

watch(editOpen, (isOpen) => {
  if (isOpen) {
    fillForm(editing.value)
    editError.value = ''
    editDialog.value?.showModal()
  } else {
    editDialog.value?.close()
    onStackedChildClosed()
  }
})

function onEditClose() {
  if (editOpen.value) editOpen.value = false
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div
      v-if="errorMessage"
      class="mb-4 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-gray-700"
    >
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-error-500" aria-hidden="true" />
      <span>{{ errorMessage }}</span>
    </div>
    <div
      v-if="successMessage"
      class="mb-4 flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-gray-700"
    >
      <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
      <span class="flex-1">{{ successMessage }}</span>
      <button
        type="button"
        class="text-gray-400 hover:text-gray-700"
        aria-label="Скрыть"
        @click="successMessage = ''"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div
        class="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div>
          <h3 class="font-medium text-gray-800 dark:text-white/90">Корпоративные контракты</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ contracts.length }} на странице
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative w-full sm:w-80">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="search"
              type="search"
              placeholder="Поиск по клиенту или телефону"
              class="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-semibold text-white hover:bg-success-700"
            @click="openCreate"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
            Новый контракт
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex min-h-[260px] items-center justify-center">
        <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
      </div>

      <div
        v-else-if="!contracts.length"
        class="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <CalendarX class="h-7 w-7 text-gray-400" aria-hidden="true" />
        <p class="text-gray-600 dark:text-gray-400">
          {{ search.trim() ? 'По запросу ничего не найдено.' : 'Контрактов пока нет.' }}
        </p>
      </div>

      <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
        <table class="w-full table-fixed md:min-w-full md:table-auto">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="w-28 px-4 py-3 text-left sm:px-6 md:w-auto">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Контракт</p>
              </th>
              <th class="px-4 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Клиент</p>
              </th>
              <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Период</p>
              </th>
              <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Брони</p>
              </th>
              <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Сумма</p>
              </th>
              <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Статус</p>
              </th>
              <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Оплата</p>
              </th>
              <th class="hidden px-5 py-3 text-right sm:px-6 md:table-cell">
                <span class="sr-only">Действия</span>
              </th>
              <th class="w-10 md:hidden"><span class="sr-only">Подробнее</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="contract in contracts"
              :key="contract.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] max-md:cursor-pointer max-md:active:bg-gray-100 dark:max-md:active:bg-white/5"
              :tabindex="isMobile ? 0 : undefined"
              :aria-label="
                isMobile
                  ? `Контракт #${contract.id}, ${contract.customer_name} — подробнее`
                  : undefined
              "
              @click="openDetails(contract)"
              @keydown.enter="openDetails(contract)"
            >
              <td class="px-4 py-4 sm:px-6">
                <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  #{{ contract.id }}
                </span>
                <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                  {{ formatDateTime(contract.created_at) }}
                </span>
              </td>
              <td class="px-4 py-4 sm:px-6 min-w-0">
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:h-10 md:w-10 bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                  >
                    {{ initials(contract.customer_name) }}
                  </div>
                  <div class="min-w-0">
                    <span
                      class="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90"
                    >
                      {{ contract.customer_name }}
                    </span>
                    <span class="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
                      {{ contract.phone || 'Телефон не указан' }}
                    </span>
                    <span
                      v-if="contract.notes"
                      class="mt-0.5 hidden max-w-[18rem] truncate text-theme-xs italic text-gray-400 md:block"
                      :title="contract.notes"
                    >
                      {{ contract.notes }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                  {{ contract.start_date }} - {{ contract.end_date }}
                </span>
              </td>
              <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                  {{ contract.bookings_count }}
                </span>
              </td>
              <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ formatPrice(contract.price) }}
                </span>
              </td>
              <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                  :class="contractStatusClass(contract.status)"
                >
                  {{ contractStatusLabel(contract.status) }}
                </span>
              </td>
              <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                <button
                  type="button"
                  class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium hover:opacity-80"
                  :class="paymentStatusClass(contract.payment_status)"
                  @click="openPayments(contract)"
                >
                  {{ paymentStatusLabel(contract.payment_status) }}
                </button>
              </td>
              <td class="hidden px-5 py-4 text-right sm:px-6 md:table-cell">
                <div class="relative inline-flex">
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5"
                    aria-label="Действия"
                    @click="toggleActions(contract.id, $event)"
                  >
                    <MoreHorizontal class="h-5 w-5" aria-hidden="true" />
                  </button>
                  <Teleport to="body">
                    <div
                      v-if="actionOpen === contract.id"
                      class="fixed inset-0 z-[99998]"
                      @click="actionOpen = null"
                    />
                    <div
                      v-if="actionOpen === contract.id"
                      class="fixed z-[99999] w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
                      :class="actionPos.up ? '-translate-y-full -mt-1' : 'mt-1'"
                      :style="{ top: `${actionPos.top}px`, right: `${actionPos.right}px` }"
                    >
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                        @click="openPayments(contract)"
                      >
                        <Wallet class="h-4 w-4" aria-hidden="true" />
                        Платежи
                      </button>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                        @click="openEdit(contract)"
                      >
                        <Edit3 class="h-4 w-4" aria-hidden="true" />
                        Изменить
                      </button>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 disabled:opacity-50"
                        :disabled="deletingId === contract.id"
                        @click="onDelete(contract)"
                      >
                        <Loader2
                          v-if="deletingId === contract.id"
                          class="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        <Trash2 v-else class="h-4 w-4" aria-hidden="true" />
                        Удалить
                      </button>
                    </div>
                  </Teleport>
                </div>
              </td>
              <td class="py-4 pr-3 text-right md:hidden">
                <ChevronRight class="ml-auto h-5 w-5 text-gray-400" aria-hidden="true" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="flex items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Страница {{ page }}</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
            :disabled="!hasPrev || loading"
            aria-label="Предыдущая страница"
            @click="prevPage"
          >
            <ChevronLeft class="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
            :disabled="!hasNext || loading"
            aria-label="Следующая страница"
            @click="nextPage"
          >
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Телефон: подробности контракта и действия (в строке только контракт и клиент) -->
    <Modal v-if="detailContract" :fullScreenBackdrop="true" @close="detailContract = null">
      <template #body>
        <div
          class="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-label="`Контракт #${detailContract.id}`"
        >
          <div
            class="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5 dark:border-gray-800 flex items-start justify-between gap-3"
          >
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                Контракт #{{ detailContract.id }}
              </h2>
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                {{ formatDateTime(detailContract.created_at) }}
              </p>
            </div>
            <button
              type="button"
              class="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5"
              aria-label="Закрыть"
              @click="detailContract = null"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <div
              class="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
              >
                {{ initials(detailContract.customer_name) }}
              </div>
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ detailContract.customer_name }}
                </p>
                <a
                  v-if="detailContract.phone"
                  :href="`tel:${detailContract.phone}`"
                  class="text-theme-xs text-success-600 dark:text-success-500"
                >
                  {{ detailContract.phone }}
                </a>
                <p v-else class="text-theme-xs text-gray-500 dark:text-gray-400">
                  Телефон не указан
                </p>
              </div>
            </div>

            <dl class="mt-4 divide-y divide-gray-100 text-theme-sm dark:divide-gray-800">
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Период</dt>
                <dd class="text-right text-gray-800 dark:text-white/90">
                  {{ detailContract.start_date }} – {{ detailContract.end_date }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Брони</dt>
                <dd class="text-gray-800 dark:text-white/90">
                  {{ detailContract.bookings_count }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Сумма</dt>
                <dd class="font-semibold text-gray-800 dark:text-white/90">
                  {{ formatPrice(detailContract.price) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Статус</dt>
                <dd>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                    :class="contractStatusClass(detailContract.status)"
                  >
                    {{ contractStatusLabel(detailContract.status) }}
                  </span>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Оплата</dt>
                <dd>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                    :class="paymentStatusClass(detailContract.payment_status)"
                  >
                    {{ paymentStatusLabel(detailContract.payment_status) }}
                  </span>
                </dd>
              </div>
            </dl>

            <p
              v-if="detailContract.notes"
              class="mt-3 whitespace-pre-line break-words rounded-xl bg-gray-50 p-3 text-theme-sm italic text-gray-600 dark:bg-white/[0.03] dark:text-gray-300"
            >
              {{ detailContract.notes }}
            </p>
          </div>
          <div class="shrink-0 border-t border-gray-100 px-5 py-4 dark:border-gray-800 grid gap-2">
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-semibold text-white hover:bg-success-700"
              @click="openPayments(detailContract)"
            >
              <Wallet class="h-4 w-4" aria-hidden="true" />
              Платежи
            </button>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                @click="openEdit(detailContract)"
              >
                <Edit3 class="h-4 w-4" aria-hidden="true" />
                Изменить
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-error-200 px-4 text-sm font-semibold text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:hover:bg-error-500/10"
                :disabled="deletingId === detailContract.id"
                @click="onDelete(detailContract)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
                Удалить
              </button>
            </div>
          </div>
        </div>
      </template>
    </Modal>

    <ContractCreateDialog v-model:open="createOpen" :fields="fields" @created="onCreated" />

    <ContractPaymentsDialog
      v-model:open="paymentsOpen"
      :contract="paymentsContract"
      :stacked="!!detailContract"
      @changed="onPaymentsChanged"
      @back="backToDetails"
    />

    <dialog
      ref="editDialog"
      class="contract-dialog m-auto w-[min(38rem,94vw)] max-h-[calc(100dvh-1.5rem)] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
      @close="onEditClose"
    >
      <div class="flex max-h-[calc(100dvh-1.5rem)] flex-col">
        <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div class="flex min-w-0 items-center gap-1">
            <ModalBackButton v-if="detailContract" @back="cancelEdit" />
            <h2 class="text-lg font-bold text-gray-900">Изменить контракт</h2>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Закрыть"
            @click="editOpen = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">
          <div class="grid gap-4">
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Клиент или компания
              <input v-model="form.customer_name" class="contract-input" />
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Телефон
              <input v-model="form.phone" type="tel" class="contract-input" />
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1.5 text-sm font-medium text-gray-700">
                Начало
                <input v-model="form.start_date" type="date" class="contract-input" />
              </label>
              <label class="grid gap-1.5 text-sm font-medium text-gray-700">
                Окончание
                <input v-model="form.end_date" type="date" class="contract-input" />
              </label>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1.5 text-sm font-medium text-gray-700">
                Сумма договора
                <input v-model="form.price" type="number" min="1" step="1" class="contract-input" />
              </label>
              <label class="grid gap-1.5 text-sm font-medium text-gray-700">
                Статус
                <select v-model="form.status" class="contract-input">
                  <option
                    v-for="(label, status) in CONTRACT_STATUS_LABEL"
                    :key="status"
                    :value="status"
                  >
                    {{ label }}
                  </option>
                </select>
              </label>
            </div>
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Заметка
              <textarea v-model="form.notes" rows="3" class="contract-input resize-none" />
            </label>
          </div>
          <p v-if="formTouched && formError" class="mt-4 text-sm text-error-500">{{ formError }}</p>
          <p v-if="editError" class="mt-4 text-sm text-error-500">{{ editError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="cancelEdit"
          >
            Отмена
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            :disabled="saving"
            @click="submitEdit"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
            Сохранить
          </button>
        </div>
      </div>
    </dialog>
  </AdminLayout>
</template>

<style scoped>
.contract-dialog::backdrop {
  background: color-mix(in srgb, var(--color-gray-900) 55%, transparent);
  backdrop-filter: blur(2px);
}
</style>
