export interface IBaseModel {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export class BaseModel implements IBaseModel {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
