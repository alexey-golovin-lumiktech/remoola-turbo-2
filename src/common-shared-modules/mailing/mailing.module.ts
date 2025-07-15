import { Global, Module } from '@nestjs/common'
import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer'

import { check, envs } from '../../envs'

import { MailingService } from './mailing.service'

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        check(
          `NODEMAILER_SMTP_HOST`,
          `NODEMAILER_SMTP_PORT`,
          `NODEMAILER_SMTP_USER`,
          `NODEMAILER_SMTP_USER_PASS`,
          `NODEMAILER_SMTP_DEFAULT_FROM`,
        )

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
        } satisfies MailerOptions
      },
    }),
  ],
  providers: [MailingService],
  exports: [MailingService],
})
export class MailingModule {}
