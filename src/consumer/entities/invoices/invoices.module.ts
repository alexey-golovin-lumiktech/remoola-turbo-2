import { forwardRef, Module } from '@nestjs/common'

import { ConsumersModule } from '../consumers/consumer.module'

import { InvoicesRepository } from './invoices.repository'
import { InvoicesService } from './invoices.service'

@Module({
  imports: [forwardRef(() => ConsumersModule)],
  providers: [InvoicesService, InvoicesRepository],
  exports: [InvoicesService, InvoicesRepository],
})
export class InvoicesModule {}
