import { apiFetch } from './api'
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
}

export type ContractUpdatePayload = Partial<
  Pick<
    ContractCreatePayload,
    'customer_name' | 'phone' | 'start_date' | 'end_date' | 'price' | 'status' | 'notes' | 'source'
  >
>

interface ApiEnvelope<T> {
  ok: boolean
  data: T
  message?: string
}

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

export function createContract(payload: ContractCreatePayload): Promise<unknown> {
  return apiFetch('/manager/contracts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
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
