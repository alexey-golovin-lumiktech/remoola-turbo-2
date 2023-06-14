import { Module } from '@nestjs/common'

import { InvoiceModule } from '../entities/invoice/invoice.module'
import { InvoiceItemModule } from '../entities/invoice-item/invoice-item.module'

import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports: [InvoiceModule, InvoiceItemModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
