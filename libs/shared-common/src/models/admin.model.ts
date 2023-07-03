import { AdminTypeValue } from '../types'

import { IBaseModel } from './base.model'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
}
