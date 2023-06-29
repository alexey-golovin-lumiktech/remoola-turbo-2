import { IBaseModel } from '../common'
import type { AdminTypeValue } from '../shared-types/common.types'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
}
