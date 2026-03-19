import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { envs } from '../envs';
import { ConsumerActionLogPartitionMaintenanceScheduler, ConsumerActionLogRetentionScheduler } from './auth';
import { ConsumerAuthController } from './auth/auth.controller';
import { ConsumerAuthService } from './auth/auth.service';
import { GoogleAuthService } from './auth/google-auth.service';
import { GoogleOAuthService } from './auth/google-oauth.service';
import { OauthStateCleanupScheduler } from './auth/oauth-state-cleanup.scheduler';
import { OAuthStateStoreService } from './auth/oauth-state-store.service';
import { ResetPasswordCleanupScheduler } from './auth/reset-password-cleanup.scheduler';
import { MailingModule } from '../shared/mailing.module';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { ConsumerDashboardModule } from './modules/consumer-dashboard/consumer-dashboard.module';
import { ConsumerContactsModule } from './modules/contacts/consumer-contacts.module';
import { ConsumerContractsModule } from './modules/contracts/consumer-contracts.module';
import { ConsumerDocumentsModule } from './modules/documents/consumer-documents.module';
import { ConsumerExchangeModule } from './modules/exchange/consumer-exchange.module';
import { ConsumerPaymentMethodsModule } from './modules/payment-methods/consumer-payment-methods.module';
import { ConsumerPaymentsModule } from './modules/payments/consumer-payments.module';
import { ConsumerProfileModule } from './modules/profile/consumer-profile.module';
import { ConsumerSettingsModule } from './modules/settings/consumer-settings.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
    MailingModule,
    ConsumerDashboardModule,
    ConsumerContactsModule,
    ConsumerContractsModule,
    ConsumerDocumentsModule,
    ConsumerExchangeModule,
    ConsumerPaymentMethodsModule,
    ConsumerPaymentsModule,
    ConsumerProfileModule,
    ConsumerSettingsModule,
  ],
  controllers: [ConsumerAuthController],
  providers: [
    GoogleOAuthService,
    ConsumerAuthService,
    GoogleAuthService,
    OAuthStateStoreService,
    OauthStateCleanupScheduler,
    ResetPasswordCleanupScheduler,
    ConsumerActionLogPartitionMaintenanceScheduler,
    ConsumerActionLogRetentionScheduler,
    OriginResolverService,
  ],
})
export class ConsumerModule {}
