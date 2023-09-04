import { Module } from '@nestjs/common'

import { TransactionRepository } from '../../../repositories'

import { AdminTransactionController } from './admin-transaction.controller'
import { AdminTransactionService } from './admin-transaction.service'

@Module({
  controllers: [AdminTransactionController],
  providers: [TransactionRepository, AdminTransactionService],
  exports: [TransactionRepository, AdminTransactionService],
})
export class AdminTransactionModule {}
