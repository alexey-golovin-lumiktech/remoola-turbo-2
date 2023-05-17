import { IBaseModel } from './base'

import { AdminType } from 'src/shared-types'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminType
  password: string
  salt: string
}
