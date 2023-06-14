import { IBaseModel } from '../common'

export interface IOrganizationDetailsModel extends IBaseModel {
  consumerId: string
  name: string
  size: string
  consumerRoleInOrganization: string
}
