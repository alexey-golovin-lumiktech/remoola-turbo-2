import { Module } from '@nestjs/common';
import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer';

import { envs } from '../envs';
import { MailTransportHealthService } from './mail-transport-health.service';
import { MailingService } from './mailing.service';
import { OriginResolverService } from './origin-resolver.service';

const BREVO_TRANSPORT = {
  host: envs.SMTP_BREVO_HOST,
  port: Number(envs.SMTP_BREVO_PORT ?? 587),
  secure: Number(envs.SMTP_BREVO_PORT) === 465,
  auth: {
    user: envs.SMTP_BREVO_USER,
    pass: envs.SMTP_BREVO_USER_PASS,
  },
};

const SENDINBLUE_TRANSPORT = {
  host: envs.SMTP_NODEMAILER_HOST,
  port: Number(envs.SMTP_NODEMAILER_PORT ?? 587),
  secure: Number(envs.SMTP_NODEMAILER_PORT) === 465,
  auth: {
    user: envs.SMTP_NODEMAILER_USER,
    pass: envs.SMTP_NODEMAILER_USER_PASS,
  },
};

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        return {
          transport: BREVO_TRANSPORT ?? SENDINBLUE_TRANSPORT,
          defaults: { from: envs.SMTP_DEFAULT_FROM },
        } satisfies MailerOptions;
      },
    }),
  ],
  providers: [MailTransportHealthService, MailingService, OriginResolverService],
  exports: [MailingService, OriginResolverService],
})
export class MailingModule {}
