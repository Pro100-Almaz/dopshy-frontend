import type { UserRole } from '@/types'
import { apiFetch } from './api'

export type StaffRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'arena_manager'
  | 'boxing_manager'
  | 'football_manager'
  | 'client'

/**
 * То, что реально приходит с бэкенда, отличается от контракта: аккаунт лежит
 * в `authorizedAccount` (camelCase), а не `authorized_account`, и поля внутри
 * него тоже camelCase (`isVerified`, `createdAt`, ...). Нормализация ниже
 * принимает оба варианта, чтобы страница не падала на несовпадении регистра.
 */
interface StaffAuthorizedAccountRaw {
  token: string
  username: string
  email: string
  role: StaffRole
  is_verified?: boolean
  isVerified?: boolean
  is_active?: boolean
  isActive?: boolean
  is_logged_in?: boolean
  isLoggedIn?: boolean
  created_at?: string
  createdAt?: string
  updated_at?: string | null
  updatedAt?: string | null
}

interface StaffUserResponseRaw {
  id: number
  authorized_account?: StaffAuthorizedAccountRaw
  authorizedAccount?: StaffAuthorizedAccountRaw
}

export interface StaffUser {
  id: number
  token: string
  username: string
  email: string
  role: StaffRole
  isVerified: boolean
  isActive: boolean
  isLoggedIn: boolean
  createdAt: string
  updatedAt: string | null
}

export interface StaffUserCreate {
  username: string
  email: string
  password: string
  role?: StaffRole
  is_active?: boolean
  is_verified?: boolean
}

export interface StaffUserUpdate {
  username?: string
  email?: string
  password?: string
  role?: StaffRole
  is_active?: boolean
  is_verified?: boolean
}

export const STAFF_ROLES: StaffRole[] = [
  'super_admin',
  'admin',
  'manager',
  'arena_manager',
  'boxing_manager',
  'football_manager',
  'client',
]

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  manager: 'Manager',
  arena_manager: 'Arena manager',
  boxing_manager: 'Boxing manager',
  football_manager: 'Football manager',
  client: 'Client',
}

function normalizeStaffUser(row: StaffUserResponseRaw): StaffUser {
  const account = row.authorized_account ?? row.authorizedAccount
  if (!account) {
    throw new Error(`Аккаунт сотрудника id=${row.id} пришёл без authorized_account`)
  }

  return {
    id: row.id,
    token: account.token,
    username: account.username,
    email: account.email,
    role: account.role || 'manager',
    isVerified: account.is_verified ?? account.isVerified ?? false,
    isActive: account.is_active ?? account.isActive ?? false,
    isLoggedIn: account.is_logged_in ?? account.isLoggedIn ?? false,
    createdAt: account.created_at ?? account.createdAt ?? '',
    updatedAt: account.updated_at ?? account.updatedAt ?? null,
  }
}

function cleanCreatePayload(values: StaffUserCreate): StaffUserCreate {
  return {
    username: values.username.trim(),
    email: values.email.trim(),
    password: values.password,
    role: values.role || 'manager',
    is_active: values.is_active ?? true,
    is_verified: values.is_verified ?? true,
  }
}

function cleanUpdatePayload(values: StaffUserUpdate): StaffUserUpdate {
  return {
    ...(values.username !== undefined ? { username: values.username.trim() } : {}),
    ...(values.email !== undefined ? { email: values.email.trim() } : {}),
    ...(values.password ? { password: values.password } : {}),
    ...(values.role !== undefined ? { role: values.role } : {}),
    ...(values.is_active !== undefined ? { is_active: values.is_active } : {}),
    ...(values.is_verified !== undefined ? { is_verified: values.is_verified } : {}),
  }
}

export function listStaffUsers(): Promise<StaffUser[]> {
  return apiFetch<StaffUserResponseRaw[]>('/accounts').then((rows) => rows.map(normalizeStaffUser))
}

export function createStaffUser(values: StaffUserCreate): Promise<StaffUser> {
  return apiFetch<StaffUserResponseRaw>('/accounts', {
    method: 'POST',
    body: JSON.stringify(cleanCreatePayload(values)),
  }).then(normalizeStaffUser)
}

export function updateStaffUser(userId: number, values: StaffUserUpdate): Promise<StaffUser> {
  return apiFetch<StaffUserResponseRaw>(`/accounts/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(cleanUpdatePayload(values)),
  }).then(normalizeStaffUser)
}

export function deleteStaffUser(userId: number): Promise<{ notification: string }> {
  return apiFetch<{ notification: string }>(`/accounts/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export function deleteStaffUserByQuery(userId: number): Promise<{ notification: string }> {
  return apiFetch<{ notification: string }>(`/accounts?id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}

export function userRoleToStaffRole(role: UserRole): StaffRole {
  return STAFF_ROLES.includes(role as StaffRole) ? (role as StaffRole) : 'manager'
}
