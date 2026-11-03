<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Loader2,
  Users,
  Search,
  MessageCircle,
  CalendarCheck,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserRoundPen,
  Ban,
  UserPlus,
  Trash2,
  X,
} from 'lucide-vue-next'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BotToggle from '@/components/customers/BotToggle.vue'
import Modal from '@/components/ui/Modal.vue'
import ModalBackButton from '@/components/ui/ModalBackButton.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

import type { BotStatus, Contact } from '@/types'
import {
  getBotEnabled,
  listContacts,
  relativeTime,
  setBotEnabled,
  type BotType,
} from '@/services/customer'
import { ApiError } from '@/services/api'
import { canSwitchBot } from '@/services/rbac'
import { useAuthStore } from '@/stores/auth'
import {
  createCustomer,
  deleteCustomer,
  findCustomerByPhone,
  updateCustomer,
} from '@/services/customers'

const props = withDefaults(defineProps<{ botType?: BotType }>(), {
  botType: 'arena',
})
const currentPageTitle = 'Клиентская база'
const auth = useAuthStore()
const canManageGlobalBot = computed(() => canSwitchBot(auth.role, props.botType))
const PAGE_SIZE = 20

// Держим экран свежим: авто-пауза и новые контакты появляются на бэкенде без
// действий фронта. Реального времени пока нет — тихо опрашиваем каждые 5 секунд.
const POLL_MS = 5000

const contacts = ref<Contact[]>([])
const loading = ref(true)
const error = ref('')
const toast = ref('')
const query = ref('')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const actionContact = ref<Contact | null>(null)
const regularSaving = ref<string | null>(null)
const canManageRegular = computed(() => ['admin', 'super_admin'].includes(auth.role))
const canDeleteCustomer = computed(() => auth.role === 'super_admin')
const editingCustomer = ref(false)
const customerEdit = reactive({ name: '', phone: '' })
const customerSaving = ref(false)
const registeringCustomer = ref(false)
const deletingCustomer = ref(false)

function openActions(contact: Contact) {
  actionContact.value = contact
  editingCustomer.value = false
  customerEdit.name = contact.name ?? ''
  customerEdit.phone = contact.phone
}

// ── Телефон: в строке только контакт, остальное и действия — в модалке деталей ──
// «Редактировать» открывается поверх деталей: «Назад» возвращает к ним, X закрывает всё.
const isMobile = useMediaQuery('(max-width: 767px)')
const detailContact = ref<Contact | null>(null)
const mobileEditOpen = ref(false)

function openDetails(contact: Contact) {
  if (isMobile.value) detailContact.value = contact
}
function openMobileEdit() {
  const contact = detailContact.value
  if (!contact) return
  customerEdit.name = contact.name ?? ''
  customerEdit.phone = contact.phone
  mobileEditOpen.value = true
}
function closeAll() {
  mobileEditOpen.value = false
  detailContact.value = null
}
watch(isMobile, (mobile) => {
  if (!mobile) closeAll()
})

// Контакт, над которым сейчас действие: из меню «⋯» (десктоп) или из деталей (телефон).
function managedContact(): Contact | null {
  return actionContact.value ?? detailContact.value
}
// После действия: меню «⋯» закрываем, детали на телефоне оставляем — они уже обновлены.
function finishAction() {
  actionContact.value = null
  mobileEditOpen.value = false
}

async function saveCustomer() {
  const contact = managedContact()
  if (!contact) return
  customerSaving.value = true
  try {
    const customer = await findCustomerByPhone(contact.phone)
    if (!customer) throw new Error('Клиент не найден')
    const updated = await updateCustomer(customer.id, {
      name: customerEdit.name || null,
      phone: customerEdit.phone,
    })
    contact.name = updated.name
    contact.phone = updated.phone
    editingCustomer.value = false
    finishAction()
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Не удалось сохранить клиента')
  } finally {
    customerSaving.value = false
  }
}

async function registerCustomer() {
  const contact = managedContact()
  if (!contact || isRegistered(contact)) return
  registeringCustomer.value = true
  try {
    const created = await createCustomer({
      name: contact.name?.trim() || undefined,
      phone: contact.phone,
      is_regular_customer: false,
    })
    contact.name = created.name
    contact.phone = created.phone
    contact.is_registered = true
    contact.is_regular_customer = created.is_regular_customer
    finishAction()
    onSuccess('Клиент зарегистрирован')
  } catch (e) {
    if (e instanceof ApiError && e.code === 'CONFLICT') {
      const existing = await findCustomerByPhone(contact.phone)
      if (existing) {
        contact.name = existing.name
        contact.phone = existing.phone
        contact.is_registered = true
        contact.is_regular_customer = existing.is_regular_customer
        finishAction()
        onSuccess('Клиент уже был зарегистрирован')
        return
      }
    }
    onError(e instanceof Error ? e.message : 'Не удалось зарегистрировать клиента')
  } finally {
    registeringCustomer.value = false
  }
}

async function removeCustomer() {
  const contact = managedContact()
  if (!contact || !canDeleteCustomer.value || deletingCustomer.value) return
  if (!window.confirm(`Удалить клиента ${displayName(contact)}?`)) return
  deletingCustomer.value = true
  try {
    const customer = await findCustomerByPhone(contact.phone)
    if (!customer) throw new Error('Клиент не найден')
    await deleteCustomer(customer.id)
    contact.is_registered = false
    contact.is_regular_customer = false
    finishAction()
    onSuccess('Клиент удалён')
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Не удалось удалить клиента')
  } finally {
    deletingCustomer.value = false
  }
}

function isRegistered(contact: Contact): boolean {
  return contact.is_registered
}
function isRegular(contact: Contact): boolean {
  return contact.is_registered ? contact.is_regular_customer : false
}
async function toggleRegular(contact: Contact) {
  if (!canManageRegular.value || regularSaving.value) return
  regularSaving.value = contact.phone
  try {
    const customer = await findCustomerByPhone(contact.phone)
    if (!customer) throw new Error('Клиент не найден')
    const updated = await updateCustomer(customer.id, {
      is_regular_customer: !isRegular(contact),
    })
    contact.is_regular_customer = updated.is_regular_customer
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Не удалось изменить статус клиента')
  } finally {
    regularSaving.value = null
  }
}

type FilterKey = 'all' | 'texted' | 'booking' | 'paused'
const filter = ref<FilterKey>('all')
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'texted', label: 'Писали в WhatsApp' },
  { key: 'booking', label: 'С бронью' },
  { key: 'paused', label: 'Бот на паузе' },
]

// Поиск и фильтр применяются на бэкенде ко всей базе (до пагинации).
// Ввод в поиск отправляем с задержкой, чтобы не дёргать API на каждую букву.
const SEARCH_DEBOUNCE_MS = 300
const searchTerm = ref('')
let searchTimer: number | undefined
watch(query, (q) => {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => (searchTerm.value = q.trim()), SEARCH_DEBOUNCE_MS)
})

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

const rangeLabel = computed(() => {
  if (!total.value) return '0'
  const start = (page.value - 1) * PAGE_SIZE + 1
  const end = Math.min(page.value * PAGE_SIZE, total.value)
  return `${start}–${end} из ${total.value}`
})

function displayName(c: Contact): string {
  return c.name?.trim() || c.phone
}

function initials(c: Contact): string {
  const name = c.name?.trim() ?? ''
  if (!name) return c.phone.slice(-2)
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// Согласованный с бэкендом статус — синхронизируем строку контакта.
function onChange(contact: Contact, status: BotStatus) {
  contact.paused = status.paused
  contact.paused_reason = status.paused_reason ?? null
}

function onError(message: string) {
  toast.value = message
  window.setTimeout(() => (toast.value = ''), 4000)
}
function onSuccess(message: string) {
  toast.value = message
  window.setTimeout(() => (toast.value = ''), 4000)
}

let silentInFlight = false
// Номер последнего запроса: ответ на устаревший (поиск уже изменился) отбрасываем.
let requestSeq = 0

// Дешёвое структурное сравнение — список детерминирован (бэкенд отдаёт его
// отсортированным). Присваиваем ref только при реальном изменении.
function changed(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}

async function load(silent = false) {
  if (silent) {
    if (document.hidden || silentInFlight) return
    silentInFlight = true
  } else {
    loading.value = true
  }
  const seq = ++requestSeq
  try {
    const res = await listContacts({
      bot_type: props.botType,
      page: page.value,
      page_size: PAGE_SIZE,
      search: searchTerm.value,
      filter: filter.value,
    })
    if (seq !== requestSeq) return
    const next = res.data
    // Фоновое обновление применяем только при изменении — без мигания списка.
    if (!silent || changed(contacts.value, next)) {
      contacts.value = next
      const open = detailContact.value
      if (open) detailContact.value = next.find((c) => c.phone === open.phone) ?? open
    }
    total.value = res.total
    totalPages.value = res.total_pages || 1
    error.value = ''
  } catch (e) {
    // Фоновое обновление не должно затирать уже показанный список ошибкой.
    if (!silent && seq === requestSeq)
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить контакты'
  } finally {
    if (silent) silentInFlight = false
    else if (seq === requestSeq) loading.value = false
  }
}

watch([searchTerm, filter], () => {
  if (page.value === 1) load()
  else page.value = 1 // смена страницы сама вызовет load()
})

watch(page, () => load())

watch(
  () => props.botType,
  () => {
    contacts.value = []
    if (page.value === 1) load()
    else page.value = 1
    if (canManageGlobalBot.value) loadBotEnabled()
  },
)

function goTo(p: number) {
  const clamped = Math.min(Math.max(1, p), totalPages.value)
  if (clamped !== page.value) page.value = clamped
}
function goToPage(item: number | '…') {
  if (typeof item === 'number') goTo(item)
}

let pollId: number | undefined
function onVisibility() {
  // Вернулись на вкладку — сразу обновляемся, чтобы не показывать устаревшее.
  // Глобальный выключатель мог тронуть другой менеджер, поэтому читаем и его.
  if (!document.hidden) {
    load(true)
    if (canManageGlobalBot.value) loadBotEnabled(true)
  }
}

// ── Глобальный выключатель бота ─────────────────────────────────────
// `on` — зеркало is_enabled с бэкенда. Пока состояние не прочитано, держим
// переключатель выключенным и заблокированным, чтобы не показать ложное «вкл».
const on = ref(false)
const pending = ref(true)
const label = computed(() => (on.value ? 'Вкл' : 'Выкл'))

// silent — фоновое перечитывание (возврат на вкладку): не блокируем переключатель
// и не показываем тост, иначе экран дёргается на каждом фокусе.
async function loadBotEnabled(silent = false) {
  if (!canManageGlobalBot.value) return
  if (silent && pending.value) return
  if (!silent) pending.value = true
  try {
    const { is_enabled } = await getBotEnabled(props.botType)
    on.value = is_enabled
  } catch (e) {
    if (!silent) onError(botErrorMessage(e))
  } finally {
    if (!silent) pending.value = false
  }
}

function botErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 502) {
    return 'Не удалось связаться с сервисом бота, попробуйте ещё раз'
  }
  return e instanceof Error ? e.message : 'Не удалось изменить глобальный статус бота'
}

async function toggle() {
  if (pending.value) return
  const previous = on.value
  const next = !previous
  // Выключение необратимо для входящих: сообщения за время паузы не копятся.
  if (!next && !window.confirm(CONFIRM_OFF)) return
  on.value = next
  pending.value = true
  try {
    // Отправляем целевое состояние, а не «переключи», и верим ответу, а не next.
    const { is_enabled } = await setBotEnabled(next, props.botType)
    on.value = is_enabled
  } catch (e) {
    on.value = previous
    onError(botErrorMessage(e))
    // Запись не прошла — перечитываем, вместо того чтобы доверять локальному откату.
    void loadBotEnabled()
  } finally {
    pending.value = false
  }
}

const CONFIRM_OFF = [
  'Выключить бота для всех клиентов?',
  '',
  '• Входящие сообщения за время паузы будут потеряны — бот не ответит на них и после включения.',
  '• Авто-паузу при ручном ответе менеджера бот тоже перестанет замечать.',
  '• Исходящие авто-сообщения (отмена неоплаченных броней) продолжат отправляться.',
].join('\n')

onMounted(() => {
  load()
  if (canManageGlobalBot.value) loadBotEnabled()
  else pending.value = false
  pollId = window.setInterval(() => load(true), POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  if (pollId !== undefined) window.clearInterval(pollId)
  window.clearTimeout(searchTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <AdminLayout>
    <slot name="header">
      <PageBreadcrumb :pageTitle="currentPageTitle" />
    </slot>

    <div class="space-y-6">
      <!-- Пока бот выключен глобально, пер-контактные переключатели ничего не меняют. -->
      <div
        v-if="canManageGlobalBot && !on && !pending"
        class="flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4 dark:border-warning-500/30 dark:bg-warning-500/10"
      >
        <TriangleAlert class="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" />
        <div class="text-theme-sm text-warning-700 dark:text-warning-400">
          <p class="font-medium">Бот выключен для всех клиентов</p>
          <p class="mt-0.5 text-theme-xs">
            Входящие сообщения не обрабатываются и не сохраняются — после включения бот на них не
            ответит. Исходящие авто-сообщения об отмене неоплаченных броней продолжают отправляться.
            Переключатели по контактам сейчас ни на что не влияют.
          </p>
        </div>
      </div>

      <div
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div
          class="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div>
            <h3 class="font-medium text-gray-800 dark:text-white/90">Клиенты</h3>
            <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Управляйте ботом-ассистентом по каждому контакту
            </p>
          </div>
          <div class="relative w-full sm:w-64">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="query"
              type="search"
              placeholder="Поиск по имени или телефону"
              class="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
        </div>

        <!-- Filters -->
        <div
          class="flex flex-wrap gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800 sm:px-6"
        >
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="rounded-full px-3 py-1.5 text-theme-xs font-medium transition-colors"
            :class="
              filter === f.key
                ? 'bg-success-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
            "
            @click="filter = f.key"
          >
            {{ f.label }}
          </button>
        </div>

        <!-- Телефон: глобальный выключатель бота (на десктопе он в заголовке колонки «Бот») -->
        <div
          v-if="canManageGlobalBot"
          class="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-800 md:hidden"
        >
          <span class="text-theme-sm text-gray-700 dark:text-gray-300">Бот для всех клиентов</span>
          <button
            type="button"
            role="switch"
            :aria-checked="on"
            :aria-label="`Бот для всех клиентов: ${label}`"
            :disabled="pending"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:opacity-60"
            :class="on ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-700'"
            @click="toggle"
          >
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-theme-xs transition-transform"
              :class="on ? 'translate-x-5' : 'translate-x-0.5'"
            >
              <Loader2 v-if="pending" class="h-3 w-3 animate-spin text-gray-500" />
            </span>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
          <Loader2 class="h-7 w-7 animate-spin text-success-600" aria-hidden="true" />
          <span class="sr-only">Загрузка…</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <p class="text-error-600 dark:text-error-500">{{ error }}</p>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            @click="load()"
          >
            Повторить
          </button>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!contacts.length"
          class="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <Users class="h-7 w-7 text-gray-400" aria-hidden="true" />
          <p class="text-gray-600 dark:text-gray-400">
            {{ searchTerm || filter !== 'all' ? 'Контакты не найдены.' : 'Клиентов пока нет.' }}
          </p>
        </div>

        <!-- Rows -->
        <div v-else class="max-w-full overflow-x-auto custom-scrollbar">
          <table class="w-full table-fixed md:min-w-full md:table-auto">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-4 py-3 text-left sm:px-6">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Контакт</p>
                </th>
                <th class="w-32 px-3 py-3 text-left sm:px-6 md:w-auto">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Регистрация
                  </p>
                </th>
                <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Метки</p>
                </th>
                <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Активность
                  </p>
                </th>
                <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                      Бот
                    </span>
                    <button
                      v-if="canManageGlobalBot"
                      type="button"
                      role="switch"
                      :aria-checked="on"
                      :aria-label="`Бот для всех клиентов: ${label}`"
                      title="Глобальный выключатель бота — влияет на всех клиентов"
                      :disabled="pending"
                      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:opacity-60"
                      :class="on ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-700'"
                      @click="toggle"
                    >
                      <span
                        class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-theme-xs transition-transform"
                        :class="on ? 'translate-x-5' : 'translate-x-0.5'"
                      >
                        <Loader2 v-if="pending" class="h-3 w-3 animate-spin text-gray-500" />
                      </span>
                    </button>
                  </div>
                </th>
                <th class="hidden px-5 py-3 text-left sm:px-6 md:table-cell">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    Постоянный клиент
                  </p>
                </th>
                <th class="hidden w-16 px-5 py-3 md:table-cell">
                  <span class="sr-only">Действия</span>
                </th>
                <th class="w-10 md:hidden"><span class="sr-only">Подробнее</span></th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="c in contacts"
                :key="c.phone"
                class="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] max-md:cursor-pointer max-md:active:bg-gray-100 dark:max-md:active:bg-white/5"
                :tabindex="isMobile ? 0 : undefined"
                :aria-label="isMobile ? `${displayName(c)} — подробнее` : undefined"
                @click="openDetails(c)"
                @keydown.enter="openDetails(c)"
              >
                <!-- Contact -->
                <td class="px-4 py-4 sm:px-6">
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 md:h-10 md:w-10 items-center justify-center rounded-full bg-success-50 text-theme-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
                    >
                      {{ initials(c) }}
                    </div>
                    <div class="min-w-0">
                      <span
                        class="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90"
                      >
                        {{ displayName(c) }}
                      </span>
                      <span class="block truncate text-gray-500 text-theme-xs dark:text-gray-400">
                        {{ c.phone }}
                      </span>
                    </div>
                  </div>
                </td>

                <td class="px-3 py-4 sm:px-6">
                  <span
                    class="inline-block rounded-full px-2 py-1 text-center text-xs font-medium leading-tight"
                    :class="
                      isRegistered(c)
                        ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
                        : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                    "
                    >{{ isRegistered(c) ? 'Зарегистрирован' : 'Не зарегистрирован' }}</span
                  >
                </td>

                <!-- Badges -->
                <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      v-if="c.texted"
                      class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                    >
                      <MessageCircle class="h-3 w-3" /> WhatsApp
                    </span>
                    <span
                      v-if="c.has_booking"
                      class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                    >
                      <CalendarCheck class="h-3 w-3" /> Бронь
                    </span>
                    <span v-if="!c.texted && !c.has_booking" class="text-theme-xs text-gray-400">
                      —
                    </span>
                  </div>
                </td>

                <!-- Last activity -->
                <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                  <span class="block text-gray-500 text-theme-xs dark:text-gray-400">
                    {{ relativeTime(c.last_activity) }}
                  </span>
                </td>

                <!-- Bot toggle -->
                <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                  <BotToggle
                    :phone="c.phone"
                    :paused="c.paused"
                    :paused-reason="c.paused_reason"
                    @change="(s) => onChange(c, s)"
                    @error="onError"
                  />
                </td>
                <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                  <button
                    v-if="isRegistered(c)"
                    type="button"
                    role="switch"
                    :aria-checked="isRegular(c)"
                    :disabled="!canManageRegular || regularSaving === c.phone"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    :class="isRegular(c) ? 'bg-success-500' : 'bg-gray-300'"
                    @click="toggleRegular(c)"
                  >
                    <span
                      class="h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="isRegular(c) ? 'translate-x-5' : 'translate-x-0.5'"
                    ></span></button
                  ><span v-else class="text-xs text-gray-400">—</span>
                </td>
                <td class="hidden px-5 py-4 sm:px-6 md:table-cell">
                  <button
                    class="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                    @click="openActions(c)"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>
                </td>
                <td class="py-4 pr-3 text-right md:hidden">
                  <ChevronRight class="ml-auto h-5 w-5 text-gray-400" aria-hidden="true" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && !error && contacts.length"
          class="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">Показано {{ rangeLabel }}</p>
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
                @click.stop="goToPage(item)"
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

    <!-- Toast for toggle errors (optimistic update already reverted) -->
    <div
      v-if="toast"
      class="fixed bottom-6 right-6 z-999999 rounded-xl border border-error-200 bg-white px-4 py-3 text-theme-sm text-error-700 shadow-theme-lg dark:border-error-500/30 dark:bg-gray-900 dark:text-error-400"
      role="alert"
    >
      {{ toast }}
    </div>

    <!-- Телефон: детали клиента (в строке только контакт и регистрация) -->
    <Modal v-if="detailContact" :fullScreenBackdrop="true" @close="closeAll">
      <template #body>
        <div
          class="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-label="displayName(detailContact)"
        >
          <div
            class="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5 dark:border-gray-800 flex items-start justify-between gap-3"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-50 text-theme-sm font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-500"
              >
                {{ initials(detailContact) }}
              </div>
              <div class="min-w-0">
                <h2 class="truncate text-lg font-bold text-gray-900 dark:text-white">
                  {{ displayName(detailContact) }}
                </h2>
                <a
                  :href="`tel:+${detailContact.phone}`"
                  class="text-theme-sm text-success-600 dark:text-success-500"
                >
                  {{ detailContact.phone }}
                </a>
              </div>
            </div>
            <button
              type="button"
              class="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5"
              aria-label="Закрыть"
              @click="closeAll"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <dl class="mt-4 divide-y divide-gray-100 text-theme-sm dark:divide-gray-800">
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Регистрация</dt>
                <dd>
                  <span
                    class="rounded-full px-2 py-1 text-xs font-medium"
                    :class="
                      isRegistered(detailContact)
                        ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
                        : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                    "
                  >
                    {{ isRegistered(detailContact) ? 'Зарегистрирован' : 'Не зарегистрирован' }}
                  </span>
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Метки</dt>
                <dd class="flex flex-wrap justify-end gap-2">
                  <span
                    v-if="detailContact.texted"
                    class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  >
                    <MessageCircle class="h-3 w-3" /> WhatsApp
                  </span>
                  <span
                    v-if="detailContact.has_booking"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                  >
                    <CalendarCheck class="h-3 w-3" /> Бронь
                  </span>
                  <span
                    v-if="!detailContact.texted && !detailContact.has_booking"
                    class="text-gray-400"
                    >—</span
                  >
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Активность</dt>
                <dd class="text-gray-800 dark:text-white/90">
                  {{ relativeTime(detailContact.last_activity) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-4 py-2.5">
                <dt class="text-gray-500 dark:text-gray-400">Бот</dt>
                <dd>
                  <BotToggle
                    :phone="detailContact.phone"
                    :paused="detailContact.paused"
                    :paused-reason="detailContact.paused_reason"
                    @change="(st) => onChange(detailContact!, st)"
                    @error="onError"
                  />
                </dd>
              </div>
              <div
                v-if="isRegistered(detailContact)"
                class="flex items-center justify-between gap-4 py-2.5"
              >
                <dt class="text-gray-500 dark:text-gray-400">Постоянный клиент</dt>
                <dd>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="isRegular(detailContact)"
                    aria-label="Постоянный клиент"
                    :disabled="!canManageRegular || regularSaving === detailContact.phone"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    :class="
                      isRegular(detailContact) ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-700'
                    "
                    @click="toggleRegular(detailContact)"
                  >
                    <span
                      class="h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="isRegular(detailContact) ? 'translate-x-5' : 'translate-x-0.5'"
                    ></span>
                  </button>
                </dd>
              </div>
            </dl>
          </div>
          <div class="shrink-0 border-t border-gray-100 px-5 py-4 dark:border-gray-800 grid gap-2">
            <button
              v-if="!isRegistered(detailContact)"
              type="button"
              :disabled="registeringCustomer"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold border-success-200 bg-success-50 text-success-700 hover:bg-success-100 disabled:opacity-50 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500"
              @click="registerCustomer"
            >
              <Loader2 v-if="registeringCustomer" class="h-4 w-4 animate-spin" />
              <UserPlus v-else class="h-4 w-4" />Зарегистрировать клиента
            </button>
            <button
              v-else
              type="button"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              @click="openMobileEdit"
            >
              <UserRoundPen class="h-4 w-4" />Редактировать данные
            </button>
            <button
              type="button"
              disabled
              class="flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold border-gray-200 text-gray-400 dark:border-gray-700"
            >
              <Ban class="h-4 w-4" />Добавить в чёрный список
            </button>
            <button
              v-if="canDeleteCustomer && isRegistered(detailContact)"
              type="button"
              :disabled="deletingCustomer"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold border-error-200 text-error-700 hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-500 dark:hover:bg-error-500/10"
              @click="removeCustomer"
            >
              <Loader2 v-if="deletingCustomer" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />Удалить клиента
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Телефон: редактирование поверх деталей -->
    <Modal
      v-if="mobileEditOpen && detailContact"
      :fullScreenBackdrop="true"
      @close="mobileEditOpen = false"
    >
      <template #body>
        <form
          class="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
          @submit.prevent="saveCustomer"
        >
          <div
            class="shrink-0 border-b border-gray-100 px-5 pb-3 pt-5 dark:border-gray-800 flex items-center justify-between gap-3"
          >
            <div class="flex min-w-0 items-center gap-1">
              <ModalBackButton :disabled="customerSaving" @back="mobileEditOpen = false" />
              <h2 class="truncate text-lg font-bold text-gray-900 dark:text-white">
                Редактировать данные
              </h2>
            </div>
            <button
              type="button"
              class="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5"
              aria-label="Закрыть"
              :disabled="customerSaving"
              @click="closeAll"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <div class="mt-4 space-y-3">
              <label class="block text-sm text-gray-700 dark:text-gray-300"
                >Имя<input
                  v-model="customerEdit.name"
                  class="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              /></label>
              <label class="block text-sm text-gray-700 dark:text-gray-300"
                >Телефон<input
                  v-model="customerEdit.phone"
                  required
                  type="tel"
                  inputmode="numeric"
                  pattern="7[0-9]+"
                  class="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              /></label>
            </div>
          </div>
          <div
            class="shrink-0 border-t border-gray-100 px-5 py-4 dark:border-gray-800 grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              class="h-11 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              :disabled="customerSaving"
              @click="mobileEditOpen = false"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="customerSaving"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-success-600 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-50"
            >
              <Loader2 v-if="customerSaving" class="h-4 w-4 animate-spin" />
              Сохранить
            </button>
          </div>
        </form>
      </template>
    </Modal>

    <Teleport to="body">
      <div v-if="actionContact" class="fixed inset-0 z-999999 overflow-hidden bg-gray-900/45">
        <div
          class="app-modal flex h-full items-end justify-center p-4 sm:items-center"
          @click.self="actionContact = null"
        >
          <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
            <div class="mb-4">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ displayName(actionContact) }}
              </h3>
              <p class="text-xs text-gray-500">Управление данными клиента</p>
            </div>
            <form v-if="editingCustomer" class="space-y-3" @submit.prevent="saveCustomer">
              <label class="block text-sm"
                >Имя<input
                  v-model="customerEdit.name"
                  class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3"
              /></label>
              <label class="block text-sm"
                >Телефон<input
                  v-model="customerEdit.phone"
                  required
                  pattern="7[0-9]+"
                  class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3"
              /></label>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-lg border py-2 text-sm"
                  @click="editingCustomer = false"
                >
                  Отмена</button
                ><button
                  :disabled="customerSaving"
                  class="flex-1 rounded-lg bg-success-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </form>
            <button
              v-if="!editingCustomer && !isRegistered(actionContact)"
              type="button"
              :disabled="registeringCustomer"
              class="mb-2 flex w-full items-center gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700 hover:bg-success-100 disabled:opacity-50"
              @click="registerCustomer"
            >
              <Loader2 v-if="registeringCustomer" class="h-4 w-4 animate-spin" />
              <UserPlus v-else class="h-4 w-4" />Зарегистрировать клиента
            </button>
            <button
              v-if="!editingCustomer"
              :disabled="!isRegistered(actionContact)"
              class="mb-2 flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              :class="!isRegistered(actionContact) ? 'cursor-not-allowed opacity-50' : ''"
              @click="editingCustomer = true"
            >
              <UserRoundPen class="h-4 w-4" />Редактировать данные
            </button>
            <button
              v-if="!editingCustomer"
              disabled
              class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm text-gray-400"
            >
              <Ban class="h-4 w-4" />Добавить в чёрный список
            </button>
            <button
              v-if="!editingCustomer && canDeleteCustomer && isRegistered(actionContact)"
              type="button"
              :disabled="deletingCustomer"
              class="mt-2 flex w-full items-center gap-3 rounded-lg border border-error-200 px-4 py-3 text-sm text-error-700 hover:bg-error-50 disabled:opacity-50"
              @click="removeCustomer"
            >
              <Loader2 v-if="deletingCustomer" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />Удалить клиента
            </button>
            <button
              v-if="!editingCustomer"
              class="mt-4 w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium"
              @click="actionContact = null"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>
