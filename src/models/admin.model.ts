import { IBaseModel, BaseModel } from './base'

export enum AdminType {
  Super = `super`,
  Admin = `admin`
}

export interface IAdminModel extends IBaseModel {
  email: string
  type: AdminType
  password: string
  salt: string
}

export class AdminModel extends BaseModel implements IAdminModel {
  email: string
  type: AdminType
  password: string
  salt: string
}
