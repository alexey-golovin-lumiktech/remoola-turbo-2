import { IBaseModel } from './base.model'
import { IBaseRepository } from './base.repository'

export interface IBaseService<TModel extends IBaseModel, TRepository extends IBaseRepository<TModel>> {
  repository: TRepository
}

export abstract class BaseService<TModel extends IBaseModel, TRepository extends IBaseRepository<TModel>>
  implements IBaseService<TModel, TRepository>
{
  repository: TRepository

  constructor(repository: TRepository) {
    this.repository = repository
  }
}
