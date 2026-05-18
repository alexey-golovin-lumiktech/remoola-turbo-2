import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConsumerAuthController } from './auth.controller';
import { ConsumerAuthService } from './auth.service';
import { CONSUMER_ADMIN_AUTH_ACTIONS } from './consumer-admin-auth-actions.port';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { ConsumerAuthLoginService } from './consumer-auth-login.service';
import { ConsumerAuthRecoveryService } from './consumer-auth-recovery.service';
import { ConsumerAuthSessionRepository } from './consumer-auth-session.repository';
import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerAuthSignupService } from './consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './consumer-auth-verification.service';
import { ConsumerGoogleOAuthController } from './consumer-google-oauth.controller';
import { ConsumerGoogleProfileQuery } from './consumer-google-profile.query';
import { ConsumerGoogleProfileRepository } from './consumer-google-profile.repository';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { ConsumerPasswordController } from './consumer-password.controller';
import { CONSUMER_SESSION_REVOCATION_PORT } from './consumer-session-revocation.port';
import { ConsumerSignupController } from './consumer-signup.controller';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreQuery } from './oauth-state-store.query';
import { OAuthStateStoreRepository } from './oauth-state-store.repository';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { PasswordResetRepository } from './password-reset.repository';
import { envs } from '../../envs';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { MailingModule } from '../../shared/mailing.module';

@Module({
  imports: [
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
    InfrastructureModule,
    MailingModule,
  ],
  controllers: [
    ConsumerAuthController,
    ConsumerGoogleOAuthController,
    ConsumerPasswordController,
    ConsumerSignupController,
  ],
  providers: [
    GoogleOAuthService,
    ConsumerAuthControllerSupportService,
    ConsumerIdentityRepository,
    ConsumerGoogleProfileQuery,
    ConsumerGoogleProfileRepository,
    PasswordResetRepository,
    ConsumerAuthSessionRepository,
    ConsumerAuthSessionService,
    ConsumerAuthLoginService,
    ConsumerAuthRecoveryService,
    ConsumerAuthSignupService,
    ConsumerAuthVerificationService,
    ConsumerAuthService,
    OAuthStateStoreQuery,
    OAuthStateStoreRepository,
    OAuthStateStoreService,
    { provide: CONSUMER_ADMIN_AUTH_ACTIONS, useExisting: ConsumerAuthService },
    { provide: CONSUMER_SESSION_REVOCATION_PORT, useExisting: ConsumerAuthSessionService },
  ],
  exports: [ConsumerAuthService, CONSUMER_ADMIN_AUTH_ACTIONS],
})
export class ConsumerAuthModule {}
