import { Module } from '@nestjs/common';

import { BrevoMailService } from './brevo-mail.service';
import { MailTransportHealthService } from './mail-transport-health.service';
import { MailingService } from './mailing.service';
import { OriginResolverService } from './origin-resolver.service';

@Module({
  providers: [BrevoMailService, MailTransportHealthService, MailingService, OriginResolverService],
  exports: [BrevoMailService, MailingService, OriginResolverService],
})
export class MailingModule {}
