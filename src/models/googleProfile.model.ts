import { IBaseModel } from './base'

export interface IGoogleProfileModel extends IBaseModel {
  data: string
}

export class GoogleProfileModel implements IGoogleProfileModel {
  id: string
  data: string

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
