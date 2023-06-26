import { IBaseModel } from '../common'
import { AdminTypeValue } from '../shared-types'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
}
