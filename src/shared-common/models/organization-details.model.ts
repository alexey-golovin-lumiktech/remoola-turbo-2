/* eslint-disable simple-import-sort/imports */
import type { ConsumerRoleValue, OrganizationSizeValue } from '../types'
import type { IBaseModel } from './base.model'

export type IOrganizationDetailsModel = {
  name: string
  size: OrganizationSizeValue
  consumerRole: string | ConsumerRoleValue
} & IBaseModel
