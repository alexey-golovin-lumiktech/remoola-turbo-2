import { Module } from '@nestjs/common'

import { TransactionRepository } from '@-/repositories'

import { TransactionController } from './transaction.controller'
import { TransactionService } from './transaction.service'

@Module({
  controllers: [TransactionController],
  providers: [TransactionRepository, TransactionService],
  exports: [TransactionRepository, TransactionService],
})
export class TransactionModule {}
