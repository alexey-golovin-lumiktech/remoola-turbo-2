import { Global, Module } from '@nestjs/common'
import { MailingService } from './mailing.service'
import { MailerModule } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>(`NODEMAILER_SMTP_HOST`)
        const port = configService.get<number>(`NODEMAILER_SMTP_PORT`)
        const user = configService.get<string>(`NODEMAILER_SMTP_USER`)
        const pass = configService.get<string>(`NODEMAILER_SMTP_USER_PASS`)
        const from = configService.get<string>(`NODEMAILER_SMTP_DEFAULT_FROM`)

        const settings = {
          transport: { host, port, auth: { user, pass } },
          defaults: { from }
        }

        return settings
      },
      inject: [ConfigService]
    })
  ],
  providers: [MailingService],
  exports: [MailingService]
})
export class MailingModule {}
