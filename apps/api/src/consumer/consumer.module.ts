import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';

import { envs, JWT_ACCESS_SECRET, JWT_ACCESS_TTL } from '../envs';
import { ConsumerAuthController } from './auth/auth.controller';
import { ConsumerAuthService } from './auth/auth.service';
import { GoogleAuthService } from './auth/google-auth.service';
import { GoogleOAuthService } from './auth/google-oauth.service';
import { MailingService } from '../shared/mailing.service';
import { ConsumerDashboardModule } from './modules/consumer-dashboard/consumer-dashboard.module';
import { ConsumerContactsModule } from './modules/contacts/consumer-contacts.module';
import { ConsumerContractsModule } from './modules/contracts/consumer-contracts.module';
import { ConsumerDocumentsModule } from './modules/documents/consumer-documents.module';
import { ConsumerExchangeModule } from './modules/exchange/consumer-exchange.module';
import { ConsumerPaymentMethodsModule } from './modules/payment-methods/consumer-payment-methods.module';
import { ConsumerPaymentsModule } from './modules/payments/consumer-payments.module';
import { ConsumerProfileModule } from './modules/profile/consumer-profile.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: JWT_ACCESS_TTL },
    }),
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
    ConsumerDashboardModule,
    ConsumerContactsModule,
    ConsumerContractsModule,
    ConsumerDocumentsModule,
    ConsumerExchangeModule,
    ConsumerPaymentMethodsModule,
    ConsumerPaymentsModule,
    ConsumerProfileModule,
  ],
  controllers: [ConsumerAuthController],
  providers: [MailingService, GoogleOAuthService, ConsumerAuthService, GoogleAuthService],
})
export class ConsumerModule {}
