import { apiFetch } from './api'

const MANAGER_API_KEY = import.meta.env.VITE_MANAGER_API_KEY || ''

const boxingHeaders: Record<string, string> = MANAGER_API_KEY
  ? { 'X-API-Key': MANAGER_API_KEY }
  : {}

const boxingApiOptions = {
  skipSessionExpiredRedirect: true,
}

export interface BoxingGroup {
  id: string
  group_id: number
  group_type: string
  group_name: string
  max_cap: number | null
  curr_cap: number | null
  training_day: string
  training_day_value: number | null
  training_day_label: string
  start_time: string
  end_time: string
}

export interface BoxingStudent {
  id: string
  name: string
  age: number | null
  birthdate: string
  parent_phone: string
  total_trials: number
  assigned_group: string
  assigned_group_id: string | number | null
  assigned_group_name: string | null
  subscribed: boolean
}

export interface BoxingTrial {
  id: string
  trial_id: number
  group_id: string
  assigned_group_id: string | number | null
  assigned_group_name: string | null
  child_name: string
  child_age: number | null
  birthdate: string
  language: string
  phone: string
  trial_day: string
  start_time: string
  end_time: string
  state: string
  state_label: string
  notes: string
  attended: boolean
  subscribed: boolean
  user: BoxingStudent | null
}

export interface UpdateBoxingGroupPayload {
  group_name?: string
  max_cap?: number
}

interface UpdateBoxingGroupResponse {
  ok: boolean
  data: {
    group_id: number
  }
}

function subscribedQuery(subscribed?: boolean): string {
  return subscribed === undefined ? '' : `?subscribed=${subscribed ? 'true' : 'false'}`
}

export function formatBirthdate(value: string): string {
  if (!value) return '—'

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed)
  }

  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (isoDate) return isoDate

  return value
}

function unwrapData(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: unknown }).data
  }
  return data
}

function listFromResponse<T>(data: unknown, keys: string[]): T[] {
  const payload = unwrapData(data)
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[]
    }
  }
  return []
}

function entityFromResponse<T>(data: unknown, keys: string[]): T {
  const payload = unwrapData(data)
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of keys) {
      if (record[key] && typeof record[key] === 'object') return record[key] as T
    }
  }
  return payload as T
}

export async function listBoxingGroups(): Promise<BoxingGroup[]> {
  const data = await apiFetch<unknown>('/boxing/groups', {
    ...boxingApiOptions,
    headers: boxingHeaders,
  })
  return listFromResponse<BoxingGroup>(data, ['groups', 'results', 'items'])
}

export function updateBoxingGroup(
  groupId: string,
  payload: UpdateBoxingGroupPayload,
): Promise<UpdateBoxingGroupResponse> {
  return apiFetch<UpdateBoxingGroupResponse>(
    `/manager/academy_groups/${encodeURIComponent(groupId)}`,
    {
      ...boxingApiOptions,
      method: 'PATCH',
      headers: boxingHeaders,
      body: JSON.stringify(payload),
    },
  )
}

export async function listBoxingTrials(subscribed?: boolean): Promise<BoxingTrial[]> {
  const data = await apiFetch<unknown>(`/boxing/trials${subscribedQuery(subscribed)}`, {
    ...boxingApiOptions,
    headers: boxingHeaders,
  })
  return listFromResponse<BoxingTrial>(data, ['trials', 'results', 'items'])
}

export async function listBoxingStudents(subscribed?: boolean): Promise<BoxingStudent[]> {
  const data = await apiFetch<unknown>(`/boxing/students${subscribedQuery(subscribed)}`, {
    ...boxingApiOptions,
    headers: boxingHeaders,
  })
  return listFromResponse<BoxingStudent>(data, ['students', 'results', 'items'])
}

export async function setBoxingTrialAttended(
  trialId: number,
  attended: boolean,
): Promise<BoxingTrial> {
  const data = await apiFetch<unknown>(`/boxing/trials/${trialId}/attended`, {
    ...boxingApiOptions,
    method: 'PATCH',
    headers: boxingHeaders,
    body: JSON.stringify({ attended }),
  })
  return entityFromResponse<BoxingTrial>(data, ['trial'])
}

export async function setBoxingTrialSubscribed(
  trialId: number,
  subscribed: boolean,
): Promise<BoxingTrial> {
  const data = await apiFetch<unknown>(`/boxing/trials/${trialId}/subscribed`, {
    ...boxingApiOptions,
    method: 'PATCH',
    headers: boxingHeaders,
    body: JSON.stringify({ subscribed }),
  })
  return entityFromResponse<BoxingTrial>(data, ['trial'])
}

export async function setBoxingStudentSubscribed(
  studentId: string,
  subscribed: boolean,
): Promise<BoxingStudent> {
  const data = await apiFetch<unknown>(`/boxing/students/${encodeURIComponent(studentId)}/subscribed`, {
    ...boxingApiOptions,
    method: 'PATCH',
    headers: boxingHeaders,
    body: JSON.stringify({ subscribed }),
  })
  return entityFromResponse<BoxingStudent>(data, ['student'])
}
