import { Module } from '@nestjs/common';
import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer';

import { envs } from '../envs';
import { MailTransportHealthService } from './mail-transport-health.service';
import { MailingService } from './mailing.service';
import { OriginResolverService } from './origin-resolver.service';

const BREVO_TRANSPORT = {
  host: envs.BREVO_SMTP_HOST,
  port: Number(envs.BREVO_SMTP_PORT ?? 587),
  secure: Number(envs.BREVO_SMTP_PORT) === 465,
  auth: {
    user: envs.BREVO_SMTP_USER,
    pass: envs.BREVO_SMTP_USER_PASS,
  },
};

const SENDINBLUE_TRANSPORT = {
  host: envs.NODEMAILER_SMTP_HOST,
  port: Number(envs.NODEMAILER_SMTP_PORT ?? 587),
  secure: Number(envs.NODEMAILER_SMTP_PORT) === 465,
  auth: {
    user: envs.NODEMAILER_SMTP_USER,
    pass: envs.NODEMAILER_SMTP_USER_PASS,
  },
};

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        return {
          transport: BREVO_TRANSPORT ?? SENDINBLUE_TRANSPORT,
          defaults: { from: envs.NODEMAILER_SMTP_DEFAULT_FROM },
        } satisfies MailerOptions;
      },
    }),
  ],
  providers: [MailTransportHealthService, MailingService, OriginResolverService],
  exports: [MailingService, OriginResolverService],
})
export class MailingModule {}
