import { IBaseModel, BaseModel } from './base'

export interface IGoogleProfileModel extends IBaseModel {
  data: string
}

export class GoogleProfileModel extends BaseModel implements IGoogleProfileModel {
  data: string
}
