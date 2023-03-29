import { IBaseRepository } from './base.repository'

export interface IBaseService<TModel, TRepository extends IBaseRepository<TModel>> {
  repository: TRepository
}

export abstract class BaseService<TModel, TRepository extends IBaseRepository<TModel>> implements IBaseService<TModel, TRepository> {
  repository: TRepository

  constructor(repository: TRepository) {
    this.repository = repository
  }
}
