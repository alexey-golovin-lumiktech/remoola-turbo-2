import { Module } from '@nestjs/common'

import { InvoiceItemsModule } from '../invoice-items/invoice-items.module'

import { InvoicesController } from './invoices.controller'
import { InvoicesRepository } from './invoices.repository'
import { InvoicesService } from './invoices.service'

@Module({
  imports: [InvoiceItemsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository],
  exports: [InvoicesService, InvoicesRepository]
})
export class InvoicesModule {}
