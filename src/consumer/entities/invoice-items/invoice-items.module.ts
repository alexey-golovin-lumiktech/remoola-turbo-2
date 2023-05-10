import { Module } from '@nestjs/common'

import { InvoiceItemsController } from './invoice-items.controller'
import { InvoiceItemsRepository } from './invoice-items.repository'
import { InvoiceItemsService } from './invoice-items.service'

@Module({
  controllers: [InvoiceItemsController],
  providers: [InvoiceItemsService, InvoiceItemsRepository],
  exports: [InvoiceItemsService, InvoiceItemsRepository]
})
export class InvoiceItemsModule {}
