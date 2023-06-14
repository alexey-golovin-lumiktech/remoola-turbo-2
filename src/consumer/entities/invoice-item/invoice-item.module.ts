import { Module } from '@nestjs/common'

import { InvoiceItemRepository } from './invoice-item.repository'
import { InvoiceItemService } from './invoice-item.service'

@Module({
  providers: [InvoiceItemRepository, InvoiceItemService],
  exports: [InvoiceItemRepository, InvoiceItemService],
})
export class InvoiceItemModule {}
