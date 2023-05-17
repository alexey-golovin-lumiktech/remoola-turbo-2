import { forwardRef, Module } from '@nestjs/common'

import { InvoicesRepository } from './invoices.repository'
import { InvoicesService } from './invoices.service'

import { ConsumersModule } from 'src/consumer/entities/consumer/consumer.module'

@Module({
  imports: [forwardRef(() => ConsumersModule)],
  providers: [InvoicesService, InvoicesRepository],
  exports: [InvoicesService, InvoicesRepository],
})
export class InvoicesModule {}
