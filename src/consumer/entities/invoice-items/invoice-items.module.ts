import { Module } from '@nestjs/common'

import { InvoiceItemsRepository } from './invoice-items.repository'
import { InvoiceItemsService } from './invoice-items.service'

@Module({
  providers: [InvoiceItemsService, InvoiceItemsRepository],
  exports: [InvoiceItemsService, InvoiceItemsRepository],
})
export class InvoiceItemsModule {}
