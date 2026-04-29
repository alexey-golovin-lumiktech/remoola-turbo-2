import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { envs } from '../envs';
import { ConsumerActionLogPartitionMaintenanceScheduler, ConsumerActionLogRetentionScheduler } from './auth';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { ConsumerAuthController } from './auth/auth.controller';
import { ConsumerAuthService } from './auth/auth.service';
import { ConsumerAuthControllerSupportService } from './auth/consumer-auth-controller-support.service';
import { ConsumerAuthRecoveryService } from './auth/consumer-auth-recovery.service';
import { ConsumerAuthSessionService } from './auth/consumer-auth-session.service';
import { ConsumerAuthSignupService } from './auth/consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './auth/consumer-auth-verification.service';
import { GoogleOAuthService } from './auth/google-oauth.service';
import { OauthStateCleanupScheduler } from './auth/oauth-state-cleanup.scheduler';
import { OAuthStateStoreService } from './auth/oauth-state-store.service';
import { ResetPasswordCleanupScheduler } from './auth/reset-password-cleanup.scheduler';
import { MailingModule } from '../shared/mailing.module';
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
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
    InfrastructureModule,
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
    ConsumerAuthControllerSupportService,
    ConsumerAuthSessionService,
    ConsumerAuthRecoveryService,
    ConsumerAuthSignupService,
    ConsumerAuthVerificationService,
    ConsumerAuthService,
    OAuthStateStoreService,
    OauthStateCleanupScheduler,
    ResetPasswordCleanupScheduler,
    ConsumerActionLogPartitionMaintenanceScheduler,
    ConsumerActionLogRetentionScheduler,
  ],
  exports: [ConsumerAuthService],
})
export class ConsumerModule {}
