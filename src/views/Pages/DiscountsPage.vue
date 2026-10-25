<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { BadgePercent, Check, Pencil, Plus, Power, Trash2, X } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import Modal from '@/components/ui/Modal.vue'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@/services/booking'
import {
  createDiscount as createDiscountRequest,
  deleteDiscount,
  discountUsageLeft,
  listDiscounts,
  updateDiscount,
  type Discount,
  type DiscountStatus,
} from '@/services/discounts'
import { listCustomers, type Customer } from '@/services/customers'

const auth = useAuthStore()
const isSuperAdmin = computed(() => auth.role === 'super_admin')
const canCreate = computed(() => ['admin', 'super_admin'].includes(auth.role))
const discounts = ref<Awaited<ReturnType<typeof listDiscounts>>>([])
const customers = ref<Customer[]>([])
const loading = ref(true)
const error = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const editing = ref<Discount | null>(null)
const saving = ref(false)
const form = reactive({
  customerId: 0,
  amount: 10000,
  usageLimit: 5,
  condition: '',
  status: 'pending' as DiscountStatus,
})
const editForm = reactive({
  amount: 0,
  usageLimit: 1,
  condition: '',
  status: 'pending' as DiscountStatus,
  isActive: false,
})

type ActivityFilter = 'active' | 'inactive' | 'all'
const activityFilter = ref<ActivityFilter>('active')
const activeCount = computed(() => discounts.value.filter((item) => item.is_active).length)
const FILTERS = computed(() => [
  { value: 'active' as const, label: 'Активные', count: activeCount.value },
  {
    value: 'inactive' as const,
    label: 'Неактивные',
    count: discounts.value.length - activeCount.value,
  },
  { value: 'all' as const, label: 'Все', count: discounts.value.length },
])
const filteredDiscounts = computed(() =>
  activityFilter.value === 'all'
    ? discounts.value
    : discounts.value.filter((item) => item.is_active === (activityFilter.value === 'active')),
)
const filterClass = (active: boolean) =>
  [
    'focus-ring rounded-lg px-3 py-1.5 text-theme-xs font-semibold transition-colors duration-150',
    active
      ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  ].join(' ')

const statusMeta = {
  pending: { label: 'Заявлена', class: 'bg-warning-50 text-warning-700' },
  approved: { label: 'Подтверждена', class: 'bg-success-50 text-success-700' },
  rejected: { label: 'Отклонена', class: 'bg-error-50 text-error-700' },
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[discounts.value, customers.value] = await Promise.all([listDiscounts(), listCustomers()])
    if (!form.customerId) form.customerId = customers.value[0]?.id ?? 0
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить скидки'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createError.value = ''
  showCreate.value = true
}

async function createDiscount() {
  const customer = customers.value.find((item) => item.id === form.customerId)
  if (!customer || form.amount <= 0 || form.usageLimit <= 0) return
  creating.value = true
  createError.value = ''
  try {
    await createDiscountRequest({
      customer_id: customer.id,
      discount_amount: Number(form.amount),
      usage_limit: Number(form.usageLimit),
      condition: form.condition.trim() || null,
      status: isSuperAdmin.value ? form.status : 'pending',
    })
    showCreate.value = false
    form.amount = 10000
    form.usageLimit = 5
    form.condition = ''
    form.status = 'pending'
    await load()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Не удалось создать скидку'
  } finally {
    creating.value = false
  }
}

async function setStatus(id: number, status: DiscountStatus) {
  if (!isSuperAdmin.value) return
  await updateDiscount(id, { status })
  await load()
}
function openEdit(discount: Discount) {
  editing.value = discount
  editForm.amount = discount.discount_amount
  editForm.usageLimit = discount.usage_limit
  editForm.condition = discount.condition ?? ''
  editForm.status = discount.status
  editForm.isActive = discount.is_active
}
async function saveDiscount() {
  if (!editing.value || !isSuperAdmin.value) return
  if (editForm.amount <= 0 || editForm.usageLimit < editing.value.usages_count) return
  saving.value = true
  error.value = ''
  try {
    await updateDiscount(editing.value.id, {
      discount_amount: Number(editForm.amount),
      usage_limit: Number(editForm.usageLimit),
      condition: editForm.condition.trim() || null,
      status: editForm.status,
      is_active: editForm.isActive,
    })
    editing.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось сохранить скидку'
  } finally {
    saving.value = false
  }
}
async function toggleActive(discount: Discount) {
  if (!isSuperAdmin.value) return
  try {
    await updateDiscount(discount.id, { is_active: !discount.is_active })
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось изменить активность'
  }
}
async function removeDiscount(discount: Discount) {
  if (!isSuperAdmin.value || !window.confirm('Удалить эту скидку?')) return
  try {
    await deleteDiscount(discount.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось удалить скидку'
  }
}
onMounted(load)
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Скидки" />
    <div
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800"
      >
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Скидки постоянных клиентов
            </h2>
          </div>
          <p class="mt-1 text-sm text-gray-500">Заявки, подтверждение и счётчик использований.</p>
        </div>
        <button
          v-if="canCreate"
          class="inline-flex items-center gap-2 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-success-700"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />Создать заявку
        </button>
      </div>
      <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div
          role="tablist"
          aria-label="Активность скидок"
          class="inline-flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.04]"
        >
          <button
            v-for="item in FILTERS"
            :key="item.value"
            type="button"
            role="tab"
            :aria-selected="activityFilter === item.value"
            :class="filterClass(activityFilter === item.value)"
            @click="activityFilter = item.value"
          >
            {{ item.label }}
            <span class="ml-1 tabular-nums">{{ item.count }}</span>
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <p v-if="loading" class="p-8 text-center text-sm text-gray-500">Загрузка…</p>
        <p v-else-if="error" class="p-8 text-center text-sm text-error-600">{{ error }}</p>
        <p v-else-if="!filteredDiscounts.length" class="p-8 text-center text-sm text-gray-500">
          {{
            activityFilter === 'inactive'
              ? 'Неактивных скидок нет'
              : activityFilter === 'active'
                ? 'Активных скидок нет'
                : 'Скидок пока нет'
          }}
        </p>
        <table class="min-w-[900px] w-full">
          <thead
            class="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02]"
          >
            <tr>
              <th class="px-6 py-3">Клиент</th>
              <th class="px-6 py-3">Скидка</th>
              <th class="px-6 py-3">Использования</th>
              <th class="px-6 py-3">Статус</th>
              <th class="px-6 py-3">Назначил</th>
              <th class="px-6 py-3">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
            <tr v-for="discount in filteredDiscounts" :key="discount.id">
              <td class="px-6 py-4">
                <p class="font-medium text-gray-800 dark:text-white">
                  {{ discount.customer_name || 'Без имени' }}
                </p>
                <p class="text-xs text-gray-500">+{{ discount.customer_phone }}</p>
              </td>
              <td class="px-6 py-4 font-semibold text-gray-800 dark:text-white">
                {{ formatPrice(discount.discount_amount) }}
              </td>
              <td class="px-6 py-4 text-sm">
                <p class="font-medium text-gray-700 dark:text-gray-300">
                  {{ discount.usages_count }} из {{ discount.usage_limit }}
                </p>
                <p class="text-xs text-gray-500">Осталось: {{ discountUsageLeft(discount) }}</p>
              </td>
              <td class="px-6 py-4">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="statusMeta[discount.status].class"
                  >{{ statusMeta[discount.status].label }}</span
                >
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {{ discount.approved_by || discount.created_by || '—' }}
              </td>
              <td class="px-6 py-4">
                <div v-if="isSuperAdmin" class="flex gap-2">
                  <button
                    v-if="discount.status === 'pending'"
                    class="grid h-9 w-9 place-items-center rounded-lg bg-success-50 text-success-700"
                    title="Подтвердить"
                    @click="setStatus(discount.id, 'approved')"
                  >
                    <Check class="h-4 w-4" /></button
                  ><button
                    v-if="discount.status === 'pending'"
                    class="grid h-9 w-9 place-items-center rounded-lg bg-error-50 text-error-700"
                    title="Отклонить"
                    @click="setStatus(discount.id, 'rejected')"
                  >
                    <X class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-700"
                    title="Редактировать"
                    @click="openEdit(discount)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"
                    :title="discount.is_active ? 'Деактивировать' : 'Активировать'"
                    @click="toggleActive(discount)"
                  >
                    <Power class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-9 w-9 place-items-center rounded-lg bg-error-50 text-error-700"
                    title="Удалить"
                    @click="removeDiscount(discount)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <Modal v-if="showCreate" :fullScreenBackdrop="true" @close="showCreate = false"
      ><template #body
        ><form
          class="relative z-10 mx-4 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
          @submit.prevent="createDiscount"
        >
          <div class="mb-5 flex items-center gap-3">
            <div class="grid h-10 w-10 place-items-center rounded-full bg-success-50">
              <BadgePercent class="h-5 w-5 text-success-700" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Новая скидка</h3>
            </div>
          </div>
          <div class="space-y-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Клиент<select
                v-model="form.customerId"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3"
              >
                <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                  {{ customer.name }} · +{{ customer.phone }}
                </option>
              </select></label
            ><label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Сумма скидки<input
                v-model.number="form.amount"
                type="number"
                min="1"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3" /></label
            ><label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Условие<textarea
                v-model="form.condition"
                rows="2"
                class="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2"
              ></textarea></label
            ><label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Количество использований<input
                v-model.number="form.usageLimit"
                type="number"
                min="1"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3" /></label
            ><label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Статус<select
                v-model="form.status"
                :disabled="!isSuperAdmin"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 disabled:bg-gray-50"
              >
                <option value="pending">Заявлена</option>
                <option value="approved">Подтверждена</option>
                <option value="rejected">Отклонена</option>
              </select></label
            >
            <p v-if="!isSuperAdmin" class="text-xs font-medium text-error-600">
              Только главный админ может менять статус
            </p>
            <p v-if="createError" class="text-xs font-medium text-error-600">
              {{ createError }}
            </p>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
              @click="showCreate = false"
            >
              Отмена</button
            ><button
              :disabled="creating"
              class="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {{ creating ? 'Создание…' : 'Создать' }}
            </button>
          </div>
        </form></template
      ></Modal
    >
    <Modal v-if="editing" :fullScreenBackdrop="true" @close="editing = null"
      ><template #body
        ><form
          class="relative z-10 mx-4 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
          @submit.prevent="saveDiscount"
        >
          <h3 class="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Редактировать скидку
          </h3>
          <div class="space-y-4">
            <label class="block text-sm font-medium"
              >Сумма<input
                v-model.number="editForm.amount"
                type="number"
                min="1"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3" /></label
            ><label class="block text-sm font-medium"
              >Условие<textarea
                v-model="editForm.condition"
                rows="2"
                class="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
              ></textarea></label
            ><label class="block text-sm font-medium"
              >Лимит использований<input
                v-model.number="editForm.usageLimit"
                type="number"
                :min="editing.usages_count || 1"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3"
              /><span class="mt-1 block text-xs text-gray-500"
                >Уже использовано: {{ editing.usages_count }}</span
              ></label
            ><label class="block text-sm font-medium"
              >Статус<select
                v-model="editForm.status"
                class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3"
              >
                <option value="pending">Заявлена</option>
                <option value="approved">Подтверждена</option>
                <option value="rejected">Отклонена</option>
              </select></label
            ><label class="flex items-center gap-3 text-sm font-medium"
              ><input
                v-model="editForm.isActive"
                type="checkbox"
                class="rounded border-gray-300"
              />Активна</label
            >
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border px-4 py-2.5 text-sm"
              @click="editing = null"
            >
              Отмена</button
            ><button
              :disabled="saving"
              class="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Сохранить
            </button>
          </div>
        </form></template
      ></Modal
    >
  </AdminLayout>
</template>
