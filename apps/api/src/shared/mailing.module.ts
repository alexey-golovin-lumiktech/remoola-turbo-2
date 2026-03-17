import { Module } from '@nestjs/common';
import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer';

import { envs } from '../envs';
import { MailTransportHealthService } from './mail-transport-health.service';
import { MailingService } from './mailing.service';
import { OriginResolverService } from './origin-resolver.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        return {
          transport: {
            host: envs.NODEMAILER_SMTP_HOST,
            port: Number(envs.NODEMAILER_SMTP_PORT ?? 587),
            secure: Number(envs.NODEMAILER_SMTP_PORT) === 465,
            auth: {
              user: envs.NODEMAILER_SMTP_USER,
              pass: envs.NODEMAILER_SMTP_USER_PASS,
            },
          },
          defaults: { from: envs.NODEMAILER_SMTP_DEFAULT_FROM },
        } satisfies MailerOptions;
      },
    }),
  ],
  providers: [MailTransportHealthService, MailingService, OriginResolverService],
  exports: [MailingService, OriginResolverService],
})
export class MailingModule {}
