import { Module } from '@nestjs/common';

import { AdminNotificationMailingService } from './admin-notification-mailing.service';
import { BrevoMailService } from './brevo-mail.service';
import { InvoiceMailingService } from './invoice-mailing.service';
import { MailTransportHealthService } from './mail-transport-health.service';
import { MailTransportSenderService } from './mail-transport-sender.service';
import { MAIL_TRANSPORT } from './mail-transport.port';
import { MailingService } from './mailing.service';
import { OriginResolverService } from './origin-resolver.service';
import { PaymentMailingService } from './payment-mailing.service';
import { RecoveryMailingService } from './recovery-mailing.service';
import { SignupMailingService } from './signup-mailing.service';

@Module({
  providers: [
    BrevoMailService,
    {
      provide: MAIL_TRANSPORT,
      useExisting: BrevoMailService,
    },
    AdminNotificationMailingService,
    MailTransportHealthService,
    InvoiceMailingService,
    MailTransportSenderService,
    MailingService,
    OriginResolverService,
    PaymentMailingService,
    RecoveryMailingService,
    SignupMailingService,
  ],
  exports: [
    MAIL_TRANSPORT,
    AdminNotificationMailingService,
    BrevoMailService,
    InvoiceMailingService,
    MailingService,
    OriginResolverService,
    PaymentMailingService,
    RecoveryMailingService,
    SignupMailingService,
  ],
})
export class MailingModule {}
