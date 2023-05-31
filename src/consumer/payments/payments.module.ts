import { Module } from '@nestjs/common'

import { InvoiceItemsModule } from '../entities/invoice-items/invoice-items.module'
import { InvoicesModule } from '../entities/invoices/invoices.module'

import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports: [InvoicesModule, InvoiceItemsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
