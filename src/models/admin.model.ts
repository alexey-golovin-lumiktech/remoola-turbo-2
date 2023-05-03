import { IBaseModel, BaseModel } from './base'

export const adminType = { super: `super`, admin: `admin` } as const
export const adminTypes = Object.values(adminType)

export interface IAdminModel extends IBaseModel {
  email: string
  type: ValueOf<typeof adminType>
  password: string
  salt: string
}

export class AdminModel extends BaseModel implements IAdminModel {
  email: string
  type: ValueOf<typeof adminType>
  password: string
  salt: string
}
