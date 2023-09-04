import { Module } from '@nestjs/common'

import { TransactionRepository } from '../../../repositories'

import { TransactionService } from './transaction.service'

@Module({
  providers: [TransactionRepository, TransactionService],
  exports: [TransactionRepository, TransactionService],
})
export class TransactionModule {}
