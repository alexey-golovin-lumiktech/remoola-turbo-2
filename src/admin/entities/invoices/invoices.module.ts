import { Module } from '@nestjs/common'

import { InvoicesController } from './invoices.controller'
import { InvoicesRepository } from './invoices.repository'
import { InvoicesService } from './invoices.service'

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesRepository, InvoicesService],
  exports: [InvoicesRepository, InvoicesService],
})
export class InvoicesModule {}
