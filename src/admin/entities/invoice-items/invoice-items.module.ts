import { Module } from '@nestjs/common'

import { InvoiceItemsController } from './invoice-items.controller'
import { InvoiceItemsService } from './invoice-items.service'

@Module({
  controllers: [InvoiceItemsController],
  providers: [InvoiceItemsService],
})
export class InvoiceItemsModule {}
