/* eslint-disable simple-import-sort/imports */
import type { WithoutDeletedAt, OnlyUpsertFields } from '../types'
import type { IAdminModel } from '../models/admin.model'

export type IAdminResponse = WithoutDeletedAt<IAdminModel>
export type IAdminCreate = OnlyUpsertFields<WithoutDeletedAt<IAdminModel>>
export type IAdminUpdate = Partial<OnlyUpsertFields<WithoutDeletedAt<IAdminModel>>>
