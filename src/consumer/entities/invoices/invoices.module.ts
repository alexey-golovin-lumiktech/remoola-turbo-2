import { forwardRef, Module } from '@nestjs/common'

import { ConsumersModule } from '../consumers/consumer.module'
import { InvoiceItemsModule } from '../invoice-items/invoice-items.module'

import { InvoicesRepository } from './invoices.repository'
import { InvoicesService } from './invoices.service'

@Module({
  imports: [InvoiceItemsModule, forwardRef(() => ConsumersModule)],
  providers: [InvoicesRepository, InvoicesService],
  exports: [InvoicesRepository, InvoicesService],
})
export class InvoicesModule {}
