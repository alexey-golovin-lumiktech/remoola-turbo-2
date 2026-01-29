import { Module } from '@nestjs/common';

import { ConsumerInvoiceService } from './consumer-invoice.service';
import { ConsumerPaymentRequestsController } from './consumer-payment-requests.controller';
import { ConsumerPaymentsController } from './consumer-payments.controller';
import { ConsumerPaymentsService } from './consumer-payments.service';
import { FileStorageService } from '../files/file-storage.service';

@Module({
  imports: [],
  controllers: [ConsumerPaymentsController, ConsumerPaymentRequestsController],
  providers: [FileStorageService, ConsumerPaymentsService, ConsumerInvoiceService],
  exports: [FileStorageService, ConsumerPaymentsService, ConsumerInvoiceService],
})
export class ConsumerPaymentsModule {}
