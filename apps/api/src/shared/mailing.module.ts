import { Module } from '@nestjs/common';
import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer';

import { envs } from '../envs';
import { MailingService } from './mailing.service';
import { OriginResolverService } from './origin-resolver.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        return {
          transport: {
            host: envs.NODEMAILER_SMTP_HOST,
            port: envs.NODEMAILER_SMTP_PORT,
            auth: {
              user: envs.NODEMAILER_SMTP_USER,
              pass: envs.NODEMAILER_SMTP_USER_PASS,
            },
            pool: true,
          },
          defaults: { from: envs.NODEMAILER_SMTP_DEFAULT_FROM },
        } satisfies MailerOptions;
      },
    }),
  ],
  providers: [MailingService, OriginResolverService],
  exports: [MailingService],
})
export class MailingModule {}
