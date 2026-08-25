import type { UserRole } from '@/types'
import type { SportKey } from './academy'

export type AppPermission =
  | 'arena'
  | 'academy'
  | 'academyPayments'
  | 'botContent'
  | 'history'
  | 'workers'
  | 'reports'
  | 'settings'
  | 'sportSwitcher'
  | 'globalBotSetting'

const ADMIN_ROLES = new Set<UserRole>(['super_admin', 'admin', 'manager'])
const ARENA_ROLES = new Set<UserRole>(['super_admin', 'admin', 'manager', 'arena_manager'])
const ACADEMY_ROLES = new Set<UserRole>([
  'super_admin',
  'admin',
  'manager',
  'boxing_manager',
  'football_manager',
])

export function roleOf(value?: string | null): UserRole {
  return (value || 'client') as UserRole
}

export function fixedSportForRole(role: UserRole | string | null | undefined): SportKey | null {
  if (role === 'boxing_manager') return 'boxing'
  if (role === 'football_manager') return 'football'
  return null
}

export function hasPermission(
  roleValue: UserRole | string | null | undefined,
  permission: AppPermission,
): boolean {
  const role = roleOf(roleValue)

  if (role === 'super_admin') return true

  switch (permission) {
    case 'arena':
      return ARENA_ROLES.has(role)
    case 'academy':
      return ACADEMY_ROLES.has(role)
    case 'academyPayments':
      return role === 'admin' || role === 'manager'
    case 'botContent':
      return false
    case 'history':
    case 'workers':
    case 'reports':
    case 'settings':
      return false
    case 'sportSwitcher':
      return role === 'admin' || role === 'manager'
    case 'globalBotSetting':
      return false
  }
}

export function canAccessSport(
  roleValue: UserRole | string | null | undefined,
  sport: SportKey,
): boolean {
  const role = roleOf(roleValue)
  const fixedSport = fixedSportForRole(role)
  if (fixedSport) return fixedSport === sport
  return hasPermission(role, 'academy')
}

export function defaultPathForRole(roleValue: UserRole | string | null | undefined): string {
  const role = roleOf(roleValue)
  if (role === 'boxing_manager') return '/boxing'
  if (role === 'football_manager') return '/football'
  if (role === 'client') return '/'
  return '/dashboard'
}

export function permittedAcademySports(
  roleValue: UserRole | string | null | undefined,
): SportKey[] {
  const fixedSport = fixedSportForRole(roleValue)
  if (fixedSport) return [fixedSport]
  return hasPermission(roleValue, 'academy') ? ['football', 'boxing'] : []
}
