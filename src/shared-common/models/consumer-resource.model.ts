import type { IBaseModel } from './base.model'

export type IConsumerResourceModel = {
  consumerId: string
  resourceId: string
} & IBaseModel
