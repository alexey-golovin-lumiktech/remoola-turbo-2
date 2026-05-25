import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConsumerAuthService } from './auth.service';
import { CONSUMER_ADMIN_AUTH_ACTIONS } from './consumer-admin-auth-actions.port';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { CONSUMER_SESSION_REVOCATION_PORT } from './consumer-session-revocation.port';
import { envs } from '../../envs';
import { ConsumerIdentityRepository } from './identity/consumer-identity.repository';
import { ConsumerGoogleOAuthFlowService } from './oauth/consumer-google-oauth-flow.service';
import { ConsumerGoogleOAuthController } from './oauth/consumer-google-oauth.controller';
import { ConsumerGoogleProfileQuery } from './oauth/consumer-google-profile.query';
import { ConsumerGoogleProfileRepository } from './oauth/consumer-google-profile.repository';
import { GoogleOAuthService } from './oauth/google-oauth.service';
import { OAuthStateStoreQuery } from './oauth/oauth-state-store.query';
import { OAuthStateStoreRepository } from './oauth/oauth-state-store.repository';
import { OAuthStateStoreService } from './oauth/oauth-state-store.service';
import { ConsumerAuthRecoveryService } from './recovery/consumer-auth-recovery.service';
import { ConsumerPasswordController } from './recovery/consumer-password.controller';
import { PasswordResetRepository } from './recovery/password-reset.repository';
import { ConsumerAuthLoginService } from './session/consumer-auth-login.service';
import { ConsumerAuthSessionRepository } from './session/consumer-auth-session.repository';
import { ConsumerAuthSessionService } from './session/consumer-auth-session.service';
import { ConsumerSessionController } from './session/consumer-session.controller';
import { ConsumerAuthSignupService } from './signup/consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './signup/consumer-auth-verification.service';
import { ConsumerSignupController } from './signup/consumer-signup.controller';
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
    ConsumerSessionController,
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
    ConsumerGoogleOAuthFlowService,
    OAuthStateStoreQuery,
    OAuthStateStoreRepository,
    OAuthStateStoreService,
    { provide: CONSUMER_ADMIN_AUTH_ACTIONS, useExisting: ConsumerAuthService },
    { provide: CONSUMER_SESSION_REVOCATION_PORT, useExisting: ConsumerAuthSessionService },
  ],
  exports: [ConsumerAuthService, CONSUMER_ADMIN_AUTH_ACTIONS],
})
export class ConsumerAuthModule {}
