import { AdminType } from '../shared-types'

import { IBaseModel } from './base'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminType
  password: string
  salt: string
}
