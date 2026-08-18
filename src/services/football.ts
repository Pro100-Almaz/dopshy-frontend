import { apiFetch } from './api'

const MANAGER_API_KEY = import.meta.env.VITE_MANAGER_API_KEY || ''

const footballHeaders: Record<string, string> = MANAGER_API_KEY
  ? { 'X-API-Key': MANAGER_API_KEY }
  : {}

const footballApiOptions = {
  skipSessionExpiredRedirect: true,
}

export interface FootballGroup {
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

export interface FootballStudent {
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

export interface FootballTrial {
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
  user: FootballStudent | null
}

export interface UpdateFootballGroupPayload {
  group_name?: string
  max_cap?: number
  start_time?: string
  end_time?: string
}

interface UpdateFootballGroupResponse {
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
  if (data && typeof data === 'object' && 'ok' in data) {
    const envelope = data as { ok?: unknown; data?: unknown; detail?: unknown; message?: unknown }
    if (envelope.ok === false) {
      const detail = typeof envelope.detail === 'string' ? envelope.detail : undefined
      const message = typeof envelope.message === 'string' ? envelope.message : undefined
      throw new Error(detail || message || 'Academy API request failed')
    }
  }

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

export async function listFootballGroups(): Promise<FootballGroup[]> {
  const data = await apiFetch<unknown>('/football/groups', {
    ...footballApiOptions,
    headers: footballHeaders,
  })
  return listFromResponse<FootballGroup>(data, ['groups', 'results', 'items'])
}

export function updateFootballGroup(
  groupId: string,
  payload: UpdateFootballGroupPayload,
): Promise<UpdateFootballGroupResponse> {
  return apiFetch<UpdateFootballGroupResponse>(
    `/manager/academy_groups/${encodeURIComponent(groupId)}`,
    {
      ...footballApiOptions,
      method: 'PATCH',
      headers: footballHeaders,
      body: JSON.stringify(payload),
    },
  )
}

export async function listFootballTrials(subscribed?: boolean): Promise<FootballTrial[]> {
  const data = await apiFetch<unknown>(`/football/trials${subscribedQuery(subscribed)}`, {
    ...footballApiOptions,
    headers: footballHeaders,
  })
  return listFromResponse<FootballTrial>(data, ['trials', 'results', 'items'])
}

export async function listFootballStudents(subscribed?: boolean): Promise<FootballStudent[]> {
  const data = await apiFetch<unknown>(`/football/students${subscribedQuery(subscribed)}`, {
    ...footballApiOptions,
    headers: footballHeaders,
  })
  return listFromResponse<FootballStudent>(data, ['students', 'results', 'items'])
}

export async function setFootballTrialAttended(
  trialId: number,
  attended: boolean,
): Promise<FootballTrial> {
  const data = await apiFetch<unknown>(`/football/trials/${trialId}/attended`, {
    ...footballApiOptions,
    method: 'PATCH',
    headers: footballHeaders,
    body: JSON.stringify({ attended }),
  })
  return entityFromResponse<FootballTrial>(data, ['trial'])
}

export async function setFootballTrialSubscribed(
  trialId: number,
  subscribed: boolean,
): Promise<FootballTrial> {
  const data = await apiFetch<unknown>(`/football/trials/${trialId}/subscribed`, {
    ...footballApiOptions,
    method: 'PATCH',
    headers: footballHeaders,
    body: JSON.stringify({ subscribed }),
  })
  return entityFromResponse<FootballTrial>(data, ['trial'])
}

export async function setFootballStudentSubscribed(
  studentId: string,
  subscribed: boolean,
): Promise<FootballStudent> {
  const data = await apiFetch<unknown>(`/football/students/${encodeURIComponent(studentId)}/subscribed`, {
    ...footballApiOptions,
    method: 'PATCH',
    headers: footballHeaders,
    body: JSON.stringify({ subscribed }),
  })
  return entityFromResponse<FootballStudent>(data, ['student'])
}
