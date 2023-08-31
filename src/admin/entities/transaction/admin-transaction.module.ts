import { Module } from '@nestjs/common'

import { AdminTransactionController } from './admin-transaction.controller'
import { AdminTransactionRepository } from './admin-transaction.repository'
import { AdminTransactionService } from './admin-transaction.service'

@Module({
  controllers: [AdminTransactionController],
  providers: [AdminTransactionService, AdminTransactionRepository],
  exports: [AdminTransactionService, AdminTransactionRepository],
})
export class AdminTransactionModule {}
