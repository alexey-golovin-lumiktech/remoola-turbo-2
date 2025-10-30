/* eslint-disable simple-import-sort/imports */
import type { ResourceAccessValue } from '../types'
import type { IBaseModel } from './base.model'

export type IResourceModel = {
  access?: ResourceAccessValue
  originalname: string
  mimetype: string
  size: number
  bucket: string
  key: string
  downloadUrl: string
} & IBaseModel
