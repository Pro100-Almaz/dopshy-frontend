import { apiFetch } from './api'

export interface Customer {
  id: number
  name: string | null
  phone: string
  is_registered: boolean
  is_regular_customer: boolean
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

export async function listCustomers(search?: string): Promise<Customer[]> {
  const qs = new URLSearchParams()
  if (search?.trim()) qs.set('search', search.trim())
  return unwrap(
    await apiFetch<Envelope<Customer[]> | Customer[]>(
      `/manager/customers${qs.size ? `?${qs}` : ''}`,
    ),
  )
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const qs = new URLSearchParams({ phone })
  return unwrap(
    await apiFetch<Envelope<Customer | null> | Customer | null>(`/manager/customers?${qs}`),
  )
}

export async function createCustomer(payload: {
  name?: string
  phone: string
  is_regular_customer?: boolean
}): Promise<Customer> {
  return unwrap(
    await apiFetch<Envelope<Customer> | Customer>('/manager/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}

export async function updateCustomer(
  id: number,
  payload: { name?: string | null; phone?: string; is_regular_customer?: boolean },
): Promise<Customer> {
  return unwrap(
    await apiFetch<Envelope<Customer> | Customer>(`/manager/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  )
}

export function deleteCustomer(id: number): Promise<unknown> {
  return apiFetch(`/manager/customers/${id}`, { method: 'DELETE' })
}
