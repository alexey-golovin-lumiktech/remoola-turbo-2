import { Module } from '@nestjs/common'

import { TransactionRepository } from './transaction.repository'
import { TransactionService } from './transaction.service'

@Module({
  providers: [TransactionService, TransactionRepository],
  exports: [TransactionService, TransactionRepository],
})
export class TransactionModule {}
