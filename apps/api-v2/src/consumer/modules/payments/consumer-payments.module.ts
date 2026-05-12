import { Module } from '@nestjs/common';

import { ConsumerInvoiceService } from './consumer-invoice.service';
import { ConsumerPaymentRequestNotificationService } from './consumer-payment-request-notification.service';
import { ConsumerPaymentRequestsController } from './consumer-payment-requests.controller';
import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsQueriesService } from './consumer-payments-queries.service';
import { ConsumerPaymentsReadService } from './consumer-payments-read.service';
import { ConsumerPaymentsWriteService } from './consumer-payments-write.service';
import { ConsumerPaymentsController } from './consumer-payments.controller';
import { ConsumerPaymentsService } from './consumer-payments.service';
import { MailingModule } from '../../../shared/mailing.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [MailingModule, FilesModule],
  controllers: [ConsumerPaymentsController, ConsumerPaymentRequestsController],
  providers: [
    ConsumerPaymentsPoliciesService,
    ConsumerPaymentsQueriesService,
    ConsumerPaymentsCommandsService,
    ConsumerPaymentsReadService,
    ConsumerPaymentsWriteService,
    ConsumerPaymentRequestNotificationService,
    ConsumerPaymentsService,
    ConsumerInvoiceService,
  ],
  exports: [ConsumerPaymentsPoliciesService],
})
export class ConsumerPaymentsModule {}
