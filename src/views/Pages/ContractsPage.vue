<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import WeekGrid from '@/views/Booking/components/WeekGrid.vue'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'
import type { ContractListRow, ContractStatus } from '@/services/contracts'
import {
  CONTRACT_STATUS_LABEL,
  contractStatusClass,
  contractStatusLabel,
  createContract,
  deleteContract,
  listContracts,
  toContractSlots,
  updateContract,
} from '@/services/contracts'
import {
  formatDateTime,
  formatPrice,
  getManagerFields,
  getManagerWeek,
  toISO,
  type WeekSlots,
} from '@/services/booking'
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
const search = ref('')
const page = ref(1)
const atEnd = ref(false)
const createOpen = ref(false)
const editOpen = ref(false)
const editing = ref<ContractListRow | null>(null)
const actionOpen = ref<number | null>(null)

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
    atEnd.value = false
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось загрузить контракты'
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

function openEdit(contract: ContractListRow) {
  editing.value = contract
  actionOpen.value = null
  editOpen.value = true
}

async function onDelete(contract: ContractListRow) {
  actionOpen.value = null
  const ok = window.confirm(`Отменить контракт #${contract.id} и активные связанные брони?`)
  if (!ok) return
  deletingId.value = contract.id
  errorMessage.value = ''
  try {
    await deleteContract(contract.id)
    await goToPage(page.value)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось отменить контракт'
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
    status: 'awaiting_payment',
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
  if (form.price === '' || !Number.isFinite(price) || price < 0) return 'Укажите сумму контракта'
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

const createDialog = ref<HTMLDialogElement | null>(null)
const editDialog = ref<HTMLDialogElement | null>(null)
const createStep = ref<'details' | 'slots'>('details')
const selectedFieldId = ref('')
const week = ref<WeekSlots>({ days: [], rows: [] })
const weekLoading = ref(false)
const pageOffset = ref(0)
const dayCount = 7
const horizonDays = 28
const maxOffset = Math.floor((horizonDays - dayCount) / dayCount)

const selectedField = computed(
  () => fields.value.find((field) => field.id === selectedFieldId.value) ?? null,
)

const rangeLabel = computed(() => {
  const days = week.value.days
  if (!days.length) return ''
  const first = days[0].label
  const last = days[days.length - 1].label
  return first.month === last.month
    ? `${first.day}-${last.day} ${first.month}`
    : `${first.day} ${first.month} - ${last.day} ${last.month}`
})

function startISO(offset: number): string {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offset * dayCount)
  return toISO(base)
}

async function loadWeek() {
  if (!selectedField.value) {
    week.value = { days: [], rows: [] }
    return
  }
  weekLoading.value = true
  try {
    week.value = await getManagerWeek(
      selectedField.value,
      startISO(pageOffset.value),
      new Date(),
      dayCount,
    )
  } finally {
    weekLoading.value = false
  }
}

watch(selectedField, (field) => {
  if (!field || createStep.value !== 'slots') return
  bookingStore.setField(field)
  pageOffset.value = 0
  loadWeek()
})

function openCreate() {
  fillForm()
  createStep.value = 'details'
  selectedFieldId.value = fields.value[0]?.id ?? ''
  bookingStore.clear()
  createOpen.value = true
}

function nextCreateStep() {
  formTouched.value = true
  if (formError.value) return
  createStep.value = 'slots'
  if (!selectedFieldId.value) selectedFieldId.value = fields.value[0]?.id ?? ''
  if (selectedField.value) bookingStore.setField(selectedField.value)
  pageOffset.value = 0
  loadWeek()
}

function prevWeek() {
  if (pageOffset.value <= 0) return
  pageOffset.value--
  loadWeek()
}

function nextWeek() {
  if (pageOffset.value >= maxOffset) return
  pageOffset.value++
  loadWeek()
}

async function submitCreate() {
  formTouched.value = true
  if (formError.value) return
  if (bookingStore.batchSlots.length === 0) {
    errorMessage.value = 'Выберите хотя бы один слот для контракта'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    await createContract({
      ...contractPayload(),
      slots: toContractSlots(bookingStore.batchSlots),
    })
    createOpen.value = false
    bookingStore.clear()
    await goToPage(1)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось создать контракт'
  } finally {
    saving.value = false
  }
}

async function submitEdit() {
  if (!editing.value) return
  formTouched.value = true
  if (formError.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await updateContract(editing.value.id, contractPayload())
    editOpen.value = false
    editing.value = null
    await goToPage(page.value)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Не удалось сохранить контракт'
  } finally {
    saving.value = false
  }
}

watch(createOpen, (isOpen) => {
  if (isOpen) createDialog.value?.showModal()
  else createDialog.value?.close()
})

watch(editOpen, (isOpen) => {
  if (isOpen) {
    fillForm(editing.value)
    editDialog.value?.showModal()
  } else {
    editDialog.value?.close()
  }
})

function onCreateClose() {
  if (createOpen.value) createOpen.value = false
}

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
        <table class="min-w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Контракт</p>
              </th>
              <th class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Клиент</p>
              </th>
              <th class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Период</p>
              </th>
              <th class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Брони</p>
              </th>
              <th class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Сумма</p>
              </th>
              <th class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Статус</p>
              </th>
              <th class="px-5 py-3 text-right sm:px-6">
                <span class="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="contract in contracts"
              :key="contract.id"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
            >
              <td class="px-5 py-4 sm:px-6">
                <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  #{{ contract.id }}
                </span>
                <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                  {{ formatDateTime(contract.created_at) }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                  >
                    {{ initials(contract.customer_name) }}
                  </div>
                  <div>
                    <span class="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {{ contract.customer_name }}
                    </span>
                    <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                      {{ contract.phone || 'Телефон не указан' }}
                    </span>
                    <span
                      v-if="contract.notes"
                      class="mt-0.5 block max-w-[18rem] truncate text-theme-xs italic text-gray-400"
                      :title="contract.notes"
                    >
                      {{ contract.notes }}
                    </span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                  {{ contract.start_date }} - {{ contract.end_date }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="text-gray-700 text-theme-sm dark:text-gray-300">
                  {{ contract.bookings_count }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span class="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {{ formatPrice(contract.price) }}
                </span>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-theme-xs font-medium"
                  :class="contractStatusClass(contract.status)"
                >
                  {{ contractStatusLabel(contract.status) }}
                </span>
              </td>
              <td class="px-5 py-4 text-right sm:px-6">
                <div class="relative inline-flex">
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5"
                    aria-label="Действия"
                    @click="actionOpen = actionOpen === contract.id ? null : contract.id"
                  >
                    <MoreHorizontal class="h-5 w-5" aria-hidden="true" />
                  </button>
                  <div
                    v-if="actionOpen === contract.id"
                    class="absolute right-0 top-full z-40 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  >
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
                </div>
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

    <dialog
      ref="createDialog"
      class="contract-dialog m-auto w-[min(72rem,96vw)] max-h-[92vh] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
      @close="onCreateClose"
    >
      <div class="flex max-h-[92vh] flex-col">
        <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Новый контракт</h2>
            <p class="mt-0.5 text-sm text-gray-500">
              {{ createStep === 'details' ? 'Данные договора' : 'Слоты договора' }}
            </p>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Закрыть"
            @click="createOpen = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
          <div class="mb-5 grid grid-cols-2 gap-2 text-sm">
            <div
              class="rounded-lg px-3 py-2 font-medium"
              :class="
                createStep === 'details'
                  ? 'bg-success-50 text-success-700'
                  : 'bg-gray-50 text-gray-500'
              "
            >
              1. Данные
            </div>
            <div
              class="rounded-lg px-3 py-2 font-medium"
              :class="
                createStep === 'slots'
                  ? 'bg-success-50 text-success-700'
                  : 'bg-gray-50 text-gray-500'
              "
            >
              2. Время
            </div>
          </div>

          <div v-if="createStep === 'details'" class="grid gap-4 lg:grid-cols-2">
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Клиент или компания
              <input v-model="form.customer_name" class="contract-input" />
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Телефон
              <input v-model="form.phone" type="tel" class="contract-input" />
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Начало
              <input v-model="form.start_date" type="date" class="contract-input" />
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Окончание
              <input v-model="form.end_date" type="date" class="contract-input" />
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-gray-700">
              Сумма договора
              <input v-model="form.price" type="number" min="0" step="1" class="contract-input" />
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
            <label class="grid gap-1.5 text-sm font-medium text-gray-700 lg:col-span-2">
              Заметка
              <textarea v-model="form.notes" rows="3" class="contract-input resize-none" />
            </label>
          </div>

          <div v-else class="grid min-h-[34rem] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside class="space-y-4">
              <label class="grid gap-1.5 text-sm font-medium text-gray-700">
                Поле
                <select v-model="selectedFieldId" class="contract-input">
                  <option v-for="field in fields" :key="field.id" :value="field.id">
                    {{ field.name }}
                  </option>
                </select>
              </label>

              <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p class="text-xs text-gray-500">Выбрано интервалов</p>
                <p class="mt-1 text-2xl font-bold text-gray-900">
                  {{ bookingStore.intervals.length }}
                </p>
                <p class="mt-1 text-sm text-gray-500">
                  {{ bookingStore.count }} получасовых слотов
                </p>
                <button
                  v-if="bookingStore.count > 0"
                  type="button"
                  class="mt-3 text-sm font-semibold text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
                  @click="bookingStore.clearSlots"
                >
                  Очистить
                </button>
              </div>
            </aside>

            <section class="flex min-w-0 flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  :disabled="pageOffset <= 0"
                  aria-label="Предыдущая неделя"
                  @click="prevWeek"
                >
                  <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>
                <p class="text-sm font-semibold text-gray-700">{{ rangeLabel }}</p>
                <button
                  type="button"
                  class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  :disabled="pageOffset >= maxOffset"
                  aria-label="Следующая неделя"
                  @click="nextWeek"
                >
                  <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <WeekGrid
                :week="week"
                :loading="weekLoading"
                allow-repeat
                hide-booking-details
                hide-slot-prices
                fill
              />
            </section>
          </div>

          <p v-if="formTouched && formError" class="mt-4 text-sm text-error-500">{{ formError }}</p>
        </div>

        <div class="flex items-center justify-between gap-4 border-t border-gray-200 px-5 py-4">
          <div>
            <p class="text-xs text-gray-500">Сумма договора</p>
            <p class="text-xl font-bold text-gray-900">
              {{ formatPrice(Number(form.price) || 0) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="createStep === 'slots'"
              type="button"
              class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="createStep = 'details'"
            >
              Назад
            </button>
            <button
              v-if="createStep === 'details'"
              type="button"
              class="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700"
              @click="nextCreateStep"
            >
              Выбрать время
            </button>
            <button
              v-else
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
              :disabled="saving || bookingStore.batchSlots.length === 0"
              @click="submitCreate"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
              Создать контракт
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <dialog
      ref="editDialog"
      class="contract-dialog m-auto w-[min(38rem,94vw)] max-h-[90vh] rounded-2xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl"
      @close="onEditClose"
    >
      <div class="flex max-h-[90vh] flex-col">
        <div class="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <h2 class="text-lg font-bold text-gray-900">Изменить контракт</h2>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Закрыть"
            @click="editOpen = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div class="flex-1 overflow-auto px-5 py-4">
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
                <input v-model="form.price" type="number" min="0" step="1" class="contract-input" />
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
        </div>
        <div class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="editOpen = false"
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

.contract-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--color-gray-300);
  background: white;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  color: var(--color-gray-800);
  outline: none;
}

.contract-input:focus {
  border-color: var(--color-success-600);
  box-shadow: 0 0 0 1px var(--color-success-600);
}
</style>
