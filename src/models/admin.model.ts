import { ValueOf } from '../shared-types'

import { IBaseModel } from './base'

export const adminType = { super: `super`, admin: `admin` } as const
export const adminTypes = Object.values(adminType)
export type AdminType = ValueOf<typeof adminType>

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminType
  password: string
  salt: string
}
