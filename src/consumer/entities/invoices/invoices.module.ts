import { forwardRef, Module } from '@nestjs/common'

import { InvoicesController } from './invoices.controller'
import { InvoicesRepository } from './invoices.repository'
import { InvoicesService } from './invoices.service'

import { ConsumersModule } from 'src/consumer/entities/consumer/consumer.module'

@Module({
  imports: [forwardRef(() => ConsumersModule)],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository],
  exports: [InvoicesService, InvoicesRepository],
})
export class InvoicesModule {}
