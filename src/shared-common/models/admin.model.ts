import type { AdminTypeValue } from '../types'

import type { IBaseModel } from './base.model'

export type IAdminModel = {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
} & IBaseModel
