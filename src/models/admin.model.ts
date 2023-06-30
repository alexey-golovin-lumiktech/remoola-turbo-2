import type { AdminTypeValue } from '@wirebill/shared-common/common.types'

import { IBaseModel } from '../common'

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminTypeValue
  password: string
  salt: string
}
