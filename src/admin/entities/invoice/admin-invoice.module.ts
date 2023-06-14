import { Module } from '@nestjs/common'

import { AdminInvoiceController } from './admin-invoice.controller'
import { AdminInvoiceRepository } from './admin-invoice.repository'
import { AdminInvoiceService } from './admin-invoice.service'

@Module({
  controllers: [AdminInvoiceController],
  providers: [AdminInvoiceRepository, AdminInvoiceService],
  exports: [AdminInvoiceRepository, AdminInvoiceService],
})
export class AdminInvoiceModule {}
