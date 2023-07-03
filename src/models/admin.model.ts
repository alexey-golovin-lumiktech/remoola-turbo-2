import type { AdminTypeValue } from '@wirebill/shared-common'

import { IBaseModel } from '../common'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
}
