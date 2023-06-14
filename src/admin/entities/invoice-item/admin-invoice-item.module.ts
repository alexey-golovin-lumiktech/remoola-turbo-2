import { Module } from '@nestjs/common'

import { AdminInvoiceItemController } from './admin-invoice-item.controller'
import { AdminInvoiceItemService } from './admin-invoice-item.service'

@Module({
  controllers: [AdminInvoiceItemController],
  providers: [AdminInvoiceItemService],
})
export class AdminInvoiceItemModule {}
