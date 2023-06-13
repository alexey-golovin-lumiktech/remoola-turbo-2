import { IBaseModel } from '../common'
import { AdminType } from '../shared-types'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminType
  password: string
  salt: string
}
