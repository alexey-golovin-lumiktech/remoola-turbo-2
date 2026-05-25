import { type Provider } from '@nestjs/common';

import { ConsumerAuthService } from './auth.service';
import { CONSUMER_SESSION_REVOCATION_PORT } from './consumer-session-revocation.port';
import { ConsumerIdentityRepository } from './identity/consumer-identity.repository';
import { ConsumerGoogleProfileRepository } from './oauth/consumer-google-profile.repository';
import { ConsumerAuthRecoveryService } from './recovery/consumer-auth-recovery.service';
import { PasswordResetRepository } from './recovery/password-reset.repository';
import { ConsumerAuthLoginService } from './session/consumer-auth-login.service';
import { ConsumerAuthSessionRepository } from './session/consumer-auth-session.repository';
import { ConsumerAuthSessionService } from './session/consumer-auth-session.service';
import { ConsumerAuthSignupService } from './signup/consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './signup/consumer-auth-verification.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';

export function consumerAuthServiceTestProviders(overrides: Provider[]): Provider[] {
  return [
    ConsumerIdentityRepository,
    ConsumerGoogleProfileRepository,
    PasswordResetRepository,
    ConsumerAuthSessionRepository,
    PrismaTransactionRunner,
    ConsumerAuthSessionService,
    ConsumerAuthLoginService,
    ConsumerAuthRecoveryService,
    ConsumerAuthSignupService,
    ConsumerAuthVerificationService,
    ConsumerAuthService,
    { provide: CONSUMER_SESSION_REVOCATION_PORT, useExisting: ConsumerAuthSessionService },
    ...overrides,
  ];
}
