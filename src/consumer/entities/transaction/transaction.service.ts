import { Inject, Injectable } from '@nestjs/common'

import { ITransactionModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { TransactionRepository } from '../../../repositories'

@Injectable()
export class TransactionService extends BaseService<ITransactionModel, TransactionRepository> {
  constructor(@Inject(TransactionRepository) repository: TransactionRepository) {
    super(repository)
  }
}
