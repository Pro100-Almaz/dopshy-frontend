import { createAcademyUser, type AcademyUser, type AcademyUserFormValues } from './academy'
import { createStaffUser, type StaffUser, type StaffUserCreate } from './staff'

export type CreateUserRequest =
  | {
      user_kind: 'academy_user'
      academy_user: AcademyUserFormValues
    }
  | {
      user_kind: 'staff_user'
      staff_user: StaffUserCreate
    }

export function createUser(request: CreateUserRequest): Promise<AcademyUser | StaffUser> {
  if (request.user_kind === 'academy_user') {
    return createAcademyUser(request.academy_user)
  }

  return createStaffUser(request.staff_user)
}
