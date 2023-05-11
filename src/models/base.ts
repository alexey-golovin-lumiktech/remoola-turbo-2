export interface IBaseModel {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class BaseModel implements IBaseModel {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
