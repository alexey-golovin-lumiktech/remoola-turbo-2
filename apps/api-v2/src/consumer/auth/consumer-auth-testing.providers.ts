import { type Provider } from '@nestjs/common';

import { ConsumerAuthService } from './auth.service';
import { ConsumerAuthLoginService } from './consumer-auth-login.service';
import { ConsumerAuthRecoveryService } from './consumer-auth-recovery.service';
import { ConsumerAuthSessionRepository } from './consumer-auth-session.repository';
import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerAuthSignupService } from './consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './consumer-auth-verification.service';
import { ConsumerGoogleProfileRepository } from './consumer-google-profile.repository';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { CONSUMER_SESSION_REVOCATION_PORT } from './consumer-session-revocation.port';
import { PasswordResetRepository } from './password-reset.repository';
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
