import { ApiError, apiFetch } from './api'
import type { BatchSlotIn } from './booking'

export type ContractStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'confirmed'
  | 'cancelled'
  | 'unpaid'
  | 'failed'

export interface Contract {
  id: number
  customer_name: string
  phone: string
  start_date: string
  end_date: string
  price: number
  status: ContractStatus
  notes: string
  source: string
  created_at: string
  updated_at: string
  payment_status?: ContractPaymentStatus
}

export interface ContractListRow extends Contract {
  bookings_count: number
}

export interface ContractDetail extends Contract {
  booking_ids: number[]
}

export interface ContractSlotInput {
  field: number
  date: string
  time_start: string
  time_end: string
  repeat_mode?: 'none' | 'daily' | 'weekly' | 'monthly'
  repeat_until?: string
}

export interface ContractCreatePayload {
  customer_name: string
  phone?: string | null
  start_date: string
  end_date: string
  price: number | string
  status?: ContractStatus
  notes?: string
  source?: string
  updated_by?: string
  slots?: ContractSlotInput[]
  payment_plan?: PaymentPlanInput
}

export type ContractUpdatePayload = Partial<
  Pick<
    ContractCreatePayload,
    'customer_name' | 'phone' | 'start_date' | 'end_date' | 'price' | 'status' | 'notes' | 'source'
  >
>

interface ApiEnvelope<T> {
  ok: boolean
  code?: string
  data: T
  message?: string
}

// ── Платёжный план договора ─────────────────────────
export type PaymentMode = 'static' | 'dynamic'
export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly'
export type PaymentChannel = 'kaspi_invoice' | 'whatsapp_link'

export type ContractPaymentStatus =
  | 'none'
  | 'scheduled'
  | 'awaiting'
  | 'overdue'
  | 'paid'
  | 'stopped'
  | 'cancelled'

export type InstallmentStatus = 'scheduled' | 'issued' | 'overdue' | 'paid' | 'cancelled'

/** Тело `payment_plan` в запросах. Суммы — целые тенге. */
export interface PaymentPlanInput {
  mode: PaymentMode
  billing_phone?: string
  channel?: PaymentChannel
  frequency?: PaymentFrequency
  installments?: number
  first_due_date?: string
  due_dates?: string[]
  amounts?: number[]
}

export interface Installment {
  id: number
  seq: number
  booking_id: number | null
  due_at: string
  amount: number | null
  amount_locked: boolean
  status: InstallmentStatus
  attempts: number
  channel: PaymentChannel | null
  invoice_id: number | null
  invoice_status: string | null
  issued_at: string | null
  paid_at: string | null
  paid_amount: number | null
  paid_via: 'apipay' | 'manual' | null
  last_error: string | null
}

export interface PaymentSummary {
  price: number
  paid: number
  invoiced_unpaid: number
  left_to_pay: number
  next_due_at: string | null
  per_booking_estimate: number | null
}

export interface ContractPaymentPlan {
  contract_id: number
  payment_mode: PaymentMode | null
  payment_frequency: PaymentFrequency | null
  billing_phone: string | null
  payment_channel: PaymentChannel | null
  payment_status: ContractPaymentStatus
  summary: PaymentSummary
  installments: Installment[]
}

export interface SlotConflict {
  field: number
  date: string
  time_start: string
  time_end: string
}

export interface CheckSlotsResult {
  free: boolean
  occurrences: number
  conflicts: SlotConflict[]
}

export interface PlanPreview {
  mode: PaymentMode
  billing_phone: string | null
  frequency: PaymentFrequency | null
  installments_count: number
  installments: { seq: number; amount: number | null; due_at?: string }[]
}

export interface CreateContractResult {
  contract_id: number
  booking_ids: number[]
  created_count: number
  payment_plan?: ContractPaymentPlan
}

export type SendInstallmentResult =
  | {
      installment_id: number
      contract_id: number
      amount: number
      channel: 'kaspi_invoice'
      description: string
      invoice_id: number | null
      send_pending?: boolean
    }
  | { installment_id: number; channel: 'whatsapp_link'; notified: boolean }

function query(params: { page?: number; search?: string }): string {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  const search = params.search?.trim()
  if (search) qs.set('search', search)
  const str = qs.toString()
  return str ? `?${str}` : ''
}

function unwrap<T>(res: ApiEnvelope<T>): T {
  return res.data
}

export function listContracts(page?: number, search?: string): Promise<ContractListRow[]> {
  return apiFetch<ApiEnvelope<ContractListRow[]>>(
    `/manager/contracts${query({ page, search })}`,
  ).then(unwrap)
}

export function getContract(id: number | string): Promise<ContractDetail> {
  return apiFetch<ApiEnvelope<ContractDetail>>(`/manager/contracts/${id}`).then(unwrap)
}

export function createContract(payload: ContractCreatePayload): Promise<CreateContractResult> {
  return apiFetch<ApiEnvelope<CreateContractResult>>('/manager/contracts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(unwrap)
}

export function updateContract(
  id: number | string,
  payload: ContractUpdatePayload,
): Promise<unknown> {
  return apiFetch(`/manager/contracts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteContract(id: number | string): Promise<unknown> {
  return apiFetch(`/manager/contracts/${id}`, { method: 'DELETE' })
}

// ── Помощники модалки создания (ничего не записывают) ──
export function checkContractSlots(payload: {
  slots: ContractSlotInput[]
  start_date?: string
  end_date?: string
}): Promise<CheckSlotsResult> {
  return apiFetch<ApiEnvelope<Partial<CheckSlotsResult> | null>>('/manager/contracts/check-slots', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then(unwrap)
    .then((data) => {
      // Неполный ответ не должен ронять модалку: недостающее — пустые значения.
      const conflicts = Array.isArray(data?.conflicts) ? data.conflicts : []
      return {
        free: data?.free ?? conflicts.length === 0,
        occurrences: Number(data?.occurrences) || 0,
        conflicts,
      }
    })
}

export function previewPaymentPlan(payload: {
  price: number
  start_date: string
  end_date: string
  phone?: string
  payment_plan: PaymentPlanInput
  slots?: ContractSlotInput[]
}): Promise<PlanPreview> {
  return apiFetch<ApiEnvelope<PlanPreview>>('/manager/contracts/payment-plan/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then(unwrap)
    .then((data) => {
      const installments = Array.isArray(data?.installments) ? data.installments : []
      return {
        ...data,
        installments,
        installments_count: data?.installments_count ?? installments.length,
      }
    })
}

// ── Управление планом существующего договора ─────────
function normalizePlan(data: ContractPaymentPlan | null | undefined): ContractPaymentPlan {
  const summary = data?.summary
  return {
    contract_id: data?.contract_id ?? 0,
    payment_mode: data?.payment_mode ?? null,
    payment_frequency: data?.payment_frequency ?? null,
    billing_phone: data?.billing_phone ?? null,
    payment_channel: data?.payment_channel ?? null,
    payment_status: data?.payment_status ?? 'none',
    summary: {
      price: Number(summary?.price) || 0,
      paid: Number(summary?.paid) || 0,
      invoiced_unpaid: Number(summary?.invoiced_unpaid) || 0,
      left_to_pay: Number(summary?.left_to_pay) || 0,
      next_due_at: summary?.next_due_at ?? null,
      per_booking_estimate: summary?.per_booking_estimate ?? null,
    },
    installments: Array.isArray(data?.installments) ? data.installments : [],
  }
}

export function getContractPayments(id: number | string): Promise<ContractPaymentPlan> {
  return apiFetch<ApiEnvelope<ContractPaymentPlan>>(`/manager/contracts/${id}/payments`)
    .then(unwrap)
    .then(normalizePlan)
}

export function setPaymentPlan(
  id: number | string,
  plan: PaymentPlanInput,
): Promise<ContractPaymentPlan> {
  return apiFetch<ApiEnvelope<ContractPaymentPlan>>(`/manager/contracts/${id}/payment-plan`, {
    method: 'PUT',
    body: JSON.stringify({ payment_plan: plan }),
  })
    .then(unwrap)
    .then(normalizePlan)
}

export function deletePaymentPlan(id: number | string): Promise<ContractPaymentPlan> {
  return apiFetch<ApiEnvelope<ContractPaymentPlan>>(`/manager/contracts/${id}/payment-plan`, {
    method: 'DELETE',
  })
    .then(unwrap)
    .then(normalizePlan)
}

/** `amount: null` возвращает платёж в автоматический расчёт. */
export function updateInstallment(
  id: number | string,
  installmentId: number,
  payload: { amount?: number | null; due_date?: string },
): Promise<ContractPaymentPlan> {
  return apiFetch<ApiEnvelope<ContractPaymentPlan>>(
    `/manager/contracts/${id}/installments/${installmentId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
    .then(unwrap)
    .then(normalizePlan)
}

export function markInstallmentPaid(
  id: number | string,
  installmentId: number,
  payload: { amount?: number; note?: string } = {},
): Promise<ContractPaymentPlan> {
  return apiFetch<ApiEnvelope<ContractPaymentPlan>>(
    `/manager/contracts/${id}/installments/${installmentId}/mark-paid`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
    .then(unwrap)
    .then(normalizePlan)
}

export function sendInstallment(
  id: number | string,
  installmentId: number,
): Promise<SendInstallmentResult> {
  return apiFetch<ApiEnvelope<SendInstallmentResult>>(
    `/manager/contracts/${id}/installments/${installmentId}/send`,
    { method: 'POST' },
  ).then(unwrap)
}

export function addContractBookings(
  id: number | string,
  payload: { slots: ContractSlotInput[]; source?: string },
): Promise<unknown> {
  return apiFetch(`/manager/contracts/${id}/bookings/batch`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function cancelContractBookings(
  id: number | string,
  bookingIds?: number[],
): Promise<unknown> {
  return apiFetch(`/manager/contracts/${id}/bookings/batch`, {
    method: 'DELETE',
    body: JSON.stringify(bookingIds ? { booking_ids: bookingIds } : {}),
  })
}

/** Код ошибки бота (`INVALID_PLAN`, `SLOT_TAKEN`, …) или undefined. */
export function contractErrorCode(e: unknown): string | undefined {
  return e instanceof ApiError ? e.code : undefined
}

/** Пересечения из ответа 409 SLOT_TAKEN. */
export function contractErrorConflicts(e: unknown): SlotConflict[] {
  if (!(e instanceof ApiError)) return []
  const list = e.details?.conflicts
  return Array.isArray(list) ? (list as SlotConflict[]) : []
}

/**
 * Текст ошибки для менеджера. `message` бота уже написан для него; ошибки самого
 * dopshy-бэкенда (`{detail}` без кода) — на английском, их заменяем.
 */
export function contractErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError && !e.code) {
    if (e.status === 502) return 'Сервис договоров недоступен. Повторите попытку позже.'
    if (e.status === 403) return 'Недостаточно прав для этого действия.'
  }
  return e instanceof Error && e.message ? e.message : fallback
}

export function toContractSlots(slots: BatchSlotIn[]): ContractSlotInput[] {
  return slots.map((slot) => ({
    field: slot.field,
    date: slot.date,
    time_start: slot.time_start,
    time_end: slot.time_end,
    repeat_mode: slot.repeat_mode ?? 'none',
    ...(slot.repeat_until ? { repeat_until: slot.repeat_until } : {}),
  }))
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: 'Черновик',
  awaiting_payment: 'Ожидает оплаты',
  confirmed: 'Подтверждён',
  cancelled: 'Отменён',
  unpaid: 'Не оплачен',
  failed: 'Ошибка',
}

export function contractStatusLabel(status: string): string {
  return CONTRACT_STATUS_LABEL[status as ContractStatus] ?? status
}

export function contractStatusClass(status: string): string {
  if (status === 'confirmed')
    return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
  if (status === 'cancelled' || status === 'failed')
    return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400'
  if (status === 'awaiting_payment' || status === 'draft')
    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
  return 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300'
}

export const PAYMENT_STATUS_LABEL: Record<ContractPaymentStatus, string> = {
  none: 'Без онлайн-оплаты',
  scheduled: 'По графику',
  awaiting: 'Ожидает оплаты',
  overdue: 'Просрочен',
  paid: 'Оплачен',
  stopped: 'Остановлен',
  cancelled: 'Отменён',
}

export function paymentStatusLabel(status: string | null | undefined): string {
  return PAYMENT_STATUS_LABEL[(status || 'none') as ContractPaymentStatus] ?? String(status)
}

export function paymentStatusClass(status: string | null | undefined): string {
  if (status === 'paid')
    return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
  if (status === 'overdue' || status === 'cancelled')
    return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400'
  if (status === 'awaiting')
    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
  if (status === 'scheduled')
    return 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400'
  return 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300'
}

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  scheduled: 'Запланирован',
  issued: 'Выставлен',
  overdue: 'Просрочен',
  paid: 'Оплачен',
  cancelled: 'Отменён',
}

export function installmentStatusClass(status: InstallmentStatus): string {
  return paymentStatusClass(
    status === 'issued' ? 'awaiting' : status === 'cancelled' ? 'none' : status,
  )
}

export const PAYMENT_FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  weekly: 'Раз в неделю',
  biweekly: 'Раз в две недели',
  monthly: 'Раз в месяц',
}

export const PAYMENT_CHANNEL_LABEL: Record<PaymentChannel, string> = {
  kaspi_invoice: 'Счёт в Kaspi',
  whatsapp_link: 'Ссылка в WhatsApp',
}

// ── Черновик плана в формах ──────────────────────────
export interface PlanDraft {
  mode: 'none' | PaymentMode
  schedule: 'frequency' | 'dates'
  frequency: PaymentFrequency
  installments: string // '' — по одному платежу за период до end_date
  first_due_date: string // '' — с даты начала договора
  due_dates: string[]
  billing_phone: string // '' — телефон договора
  channel: '' | PaymentChannel // '' — решает бэкенд
}

export function emptyPlanDraft(): PlanDraft {
  return {
    mode: 'none',
    schedule: 'frequency',
    frequency: 'monthly',
    installments: '',
    first_due_date: '',
    due_dates: [],
    billing_phone: '',
    channel: '',
  }
}

/** Ошибка заполнения расписания (шаг 3) или '' если всё в порядке. */
export function planScheduleError(draft: PlanDraft): string {
  if (draft.mode !== 'static') return ''
  if (draft.schedule === 'dates') {
    const dates = draft.due_dates.filter(Boolean)
    if (!dates.length) return 'Добавьте хотя бы одну дату платежа'
    if (new Set(dates).size > 120) return 'Не больше 120 платежей'
    return ''
  }
  if (draft.installments.trim()) {
    const n = Number(draft.installments)
    if (!Number.isInteger(n) || n < 1) return 'Количество платежей — целое число от 1'
    if (n > 120) return 'Не больше 120 платежей'
  }
  return ''
}

/** Собирает `payment_plan` из черновика; undefined — без онлайн-оплаты. */
export function buildPaymentPlan(
  draft: PlanDraft,
  amounts?: number[],
): PaymentPlanInput | undefined {
  if (draft.mode === 'none') return undefined
  const plan: PaymentPlanInput = { mode: draft.mode }
  const phone = draft.billing_phone.trim()
  if (phone) plan.billing_phone = phone
  if (draft.channel) plan.channel = draft.channel
  if (draft.mode === 'static') {
    if (draft.schedule === 'dates') {
      plan.due_dates = [...new Set(draft.due_dates.filter(Boolean))].sort()
    } else {
      plan.frequency = draft.frequency
      if (draft.installments.trim()) plan.installments = Number(draft.installments)
      if (draft.first_due_date) plan.first_due_date = draft.first_due_date
    }
    if (amounts?.length) plan.amounts = amounts
  }
  return plan
}

/** Черновик из существующего плана — для формы замены. */
export function planDraftFrom(plan: ContractPaymentPlan): PlanDraft {
  return {
    ...emptyPlanDraft(),
    mode: plan.payment_mode ?? 'static',
    frequency: plan.payment_frequency ?? 'monthly',
    billing_phone: plan.billing_phone ?? '',
  }
}
