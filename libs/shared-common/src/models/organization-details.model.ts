import { IBaseModel } from './base.model'

export interface IOrganizationDetailsModel extends IBaseModel {
  consumerId: string
  name: string
  size: string
  consumerRole: string
}
