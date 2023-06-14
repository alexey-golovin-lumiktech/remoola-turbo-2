import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'
import { InvoiceItemModule } from '../invoice-item/invoice-item.module'

import { InvoiceRepository } from './invoice.repository'
import { InvoiceService } from './invoice.service'

@Module({
  imports: [InvoiceItemModule, forwardRef(() => ConsumerModule)],
  providers: [InvoiceRepository, InvoiceService],
  exports: [InvoiceRepository, InvoiceService],
})
export class InvoiceModule {}
