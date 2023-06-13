import { IBaseModel } from '../common'

export interface IOrganizationDetailsModel extends IBaseModel {
  name: string
  size: string
  consumerRoleInOrganization: string
}
