import { Module } from '@nestjs/common'

import { InvoiceItemsRepository } from './invoice-items.repository'
import { InvoiceItemsService } from './invoice-items.service'

@Module({
  providers: [InvoiceItemsRepository, InvoiceItemsService],
  exports: [InvoiceItemsRepository, InvoiceItemsService],
})
export class InvoiceItemsModule {}
