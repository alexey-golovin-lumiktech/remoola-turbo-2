/* eslint-disable simple-import-sort/imports */
import type { IConsumerResourceModel } from '../models/consumer-resource.model'
import type { WithoutDeletedAt, OnlyUpsertFields } from '../types'

export type IConsumerResourceResponse = WithoutDeletedAt<IConsumerResourceModel>
export type IConsumerResourceCreate = OnlyUpsertFields<WithoutDeletedAt<IConsumerResourceModel>>
export type IConsumerResourceUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IConsumerResourceModel>>>
