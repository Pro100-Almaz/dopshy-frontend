import { apiFetch } from './api'

export type DiscountStatus = 'pending' | 'approved' | 'rejected'

export interface Discount {
  id: number
  customer_id: number
  customer_name: string | null
  customer_phone: string
  discount_amount: number
  condition: string | null
  status: DiscountStatus
  usage_limit: number
  usages_left: number
  usages_count: number
  is_active: boolean
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

interface Envelope<T> {
  ok: boolean
  data: T
}
const unwrap = <T>(response: Envelope<T> | T): T =>
  typeof response === 'object' && response !== null && 'data' in response
    ? (response as Envelope<T>).data
    : (response as T)

export interface DiscountQuery {
  customer_id?: number
  phone?: string
  status?: DiscountStatus
  available_only?: boolean
}

export async function listDiscounts(query: DiscountQuery = {}): Promise<Discount[]> {
  const qs = new URLSearchParams()
  if (query.customer_id != null) qs.set('customer_id', String(query.customer_id))
  if (query.phone) qs.set('phone', query.phone)
  if (query.status) qs.set('status', query.status)
  if (query.available_only != null) qs.set('available_only', String(query.available_only))
  const suffix = qs.size ? `?${qs}` : ''
  return unwrap(await apiFetch<Envelope<Discount[]> | Discount[]>(`/manager/discounts${suffix}`))
}

export async function createDiscount(payload: {
  customer_id: number
  discount_amount: number
  condition?: string | null
  status?: DiscountStatus
  usage_limit?: number
}): Promise<Discount> {
  return unwrap(
    await apiFetch<Envelope<Discount> | Discount>('/manager/discounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}

export async function getDiscount(id: number): Promise<Discount> {
  return unwrap(await apiFetch<Envelope<Discount> | Discount>(`/manager/discounts/${id}`))
}

export async function updateDiscount(
  id: number,
  payload: {
    discount_amount?: number
    condition?: string | null
    status?: DiscountStatus
    is_active?: boolean
    usage_limit?: number
  },
): Promise<Discount> {
  return unwrap(
    await apiFetch<Envelope<Discount> | Discount>(`/manager/discounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  )
}

export function deleteDiscount(id: number): Promise<unknown> {
  return apiFetch(`/manager/discounts/${id}`, { method: 'DELETE' })
}

export const discountUsageLeft = (discount: Discount): number => discount.usages_left
