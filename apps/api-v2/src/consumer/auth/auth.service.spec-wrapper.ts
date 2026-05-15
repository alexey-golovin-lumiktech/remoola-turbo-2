import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ConsumerAuthService as ConsumerAuthServiceClass } from './auth.service';
import { ConsumerAuthRecoveryService } from './consumer-auth-recovery.service';
import { ConsumerAuthSessionRepository } from './consumer-auth-session.repository';
import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerAuthSignupService } from './consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './consumer-auth-verification.service';
import { ConsumerGoogleProfileRepository } from './consumer-google-profile.repository';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { PasswordResetRepository } from './password-reset.repository';
import { AuthAuditService } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ConsumerAuthService extends ConsumerAuthServiceClass {
  constructor(
    jwtService: JwtService,
    prisma: PrismaService,
    mailingService: MailingService,
    authAudit: AuthAuditService,
    originResolver: OriginResolverService,
  ) {
    const consumerIdentityRepository = new ConsumerIdentityRepository(prisma);
    const consumerGoogleProfileRepository = new ConsumerGoogleProfileRepository(prisma);
    const passwordResetRepository = new PasswordResetRepository(prisma, consumerIdentityRepository);
    const sessionRepository = new ConsumerAuthSessionRepository(prisma);
    const transactions = new PrismaTransactionRunner(prisma);
    const sessionService = new ConsumerAuthSessionService(
      jwtService,
      authAudit,
      originResolver,
      consumerIdentityRepository,
      sessionRepository,
      transactions,
    );

    super(
      jwtService,
      mailingService,
      authAudit,
      originResolver,
      sessionService,
      new ConsumerAuthRecoveryService(
        mailingService,
        originResolver,
        authAudit,
        sessionService,
        consumerIdentityRepository,
        passwordResetRepository,
        sessionRepository,
      ),
      new ConsumerAuthSignupService(consumerIdentityRepository, consumerGoogleProfileRepository),
      new ConsumerAuthVerificationService(jwtService, consumerIdentityRepository, mailingService, originResolver),
      consumerIdentityRepository,
    );
  }
}
