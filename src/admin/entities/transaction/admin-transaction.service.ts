import { Inject, Injectable } from '@nestjs/common'

import { ITransactionModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { AdminTransactionRepository } from './admin-transaction.repository'

@Injectable()
export class AdminTransactionService extends BaseService<ITransactionModel, AdminTransactionRepository> {
  constructor(@Inject(AdminTransactionRepository) repository: AdminTransactionRepository) {
    super(repository)
  }
}
