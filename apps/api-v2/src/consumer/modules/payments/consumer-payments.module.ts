import { Module } from '@nestjs/common';

import { ConsumerInvoiceRepository } from './consumer-invoice.repository';
import { ConsumerInvoiceService } from './consumer-invoice.service';
import { ConsumerPaymentRequestNotificationService } from './consumer-payment-request-notification.service';
import { ConsumerPaymentRequestRepository } from './consumer-payment-request.repository';
import { ConsumerPaymentRequestsController } from './consumer-payment-requests.controller';
import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { ConsumerPaymentsIdentityRepository } from './consumer-payments-identity.repository';
import { ConsumerPaymentsLedgerRepository } from './consumer-payments-ledger.repository';
import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsPolicyRepository } from './consumer-payments-policy.repository';
import { ConsumerPaymentsReadService } from './consumer-payments-read.service';
import { ConsumerPaymentsWriteService } from './consumer-payments-write.service';
import { ConsumerPaymentsController } from './consumer-payments.controller';
import { ConsumerPaymentsService } from './consumer-payments.service';
import { ConsumerEmailResolver } from './queries/consumer-email.resolver';
import { ConsumerPaymentViewRepository } from './queries/consumer-payment-view.repository';
import { ConsumerPaymentsHistoryRepository } from './queries/consumer-payments-history.repository';
import { ConsumerPaymentsListRepository } from './queries/consumer-payments-list.repository';
import { InfrastructureStorageModule } from '../../../infrastructure/storage/infrastructure-storage.module';
import { MailingModule } from '../../../shared/mailing.module';

@Module({
  imports: [MailingModule, InfrastructureStorageModule],
  controllers: [ConsumerPaymentsController, ConsumerPaymentRequestsController],
  providers: [
    ConsumerPaymentsIdentityRepository,
    ConsumerPaymentsLedgerRepository,
    ConsumerPaymentsPolicyRepository,
    ConsumerPaymentRequestRepository,
    ConsumerInvoiceRepository,
    ConsumerPaymentsPoliciesService,
    ConsumerEmailResolver,
    ConsumerPaymentsListRepository,
    ConsumerPaymentViewRepository,
    ConsumerPaymentsHistoryRepository,
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
