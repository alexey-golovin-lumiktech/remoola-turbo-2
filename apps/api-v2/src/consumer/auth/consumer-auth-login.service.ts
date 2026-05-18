import { Injectable, UnauthorizedException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { LoginBody } from '../../auth/dto/login.dto';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { passwordUtils } from '../../shared-common';

type LoginContext = { ipAddress?: string | null; userAgent?: string | null };

@Injectable()
export class ConsumerAuthLoginService {
  constructor(
    private readonly authAudit: AuthAuditService,
    private readonly sessionService: ConsumerAuthSessionService,
    private readonly consumerIdentityRepository: ConsumerIdentityRepository,
  ) {}

  private hasStoredPasswordCredentials(identity: Pick<ConsumerModel, `password` | `salt`>): boolean {
    return (
      typeof identity.password === `string` &&
      identity.password.trim().length > 0 &&
      typeof identity.salt === `string` &&
      identity.salt.trim().length > 0
    );
  }

  async login(body: LoginBody, appScope: ConsumerAppScope, ctx?: LoginContext) {
    const email = body.email?.trim()?.toLowerCase() ?? ``;
    await this.authAudit.checkLockoutAndRateLimit(AUTH_IDENTITY_TYPES.consumer, email);

    const identity = await this.consumerIdentityRepository.findActiveByEmail(email);
    if (!identity) throw new UnauthorizedException(errorCodes.INVALID_CREDENTIALS);
    this.ensureConsumerNotSuspended(identity);

    const valid = this.hasStoredPasswordCredentials(identity)
      ? await passwordUtils.verifyPassword({
          password: body.password,
          storedHash: identity.password,
          storedSalt: identity.salt,
        })
      : false;

    if (!valid) {
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.consumer,
        identityId: identity.id,
        email: identity.email,
        event: AUTH_AUDIT_EVENTS.login_failure,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
      await this.authAudit.recordFailedAttempt(AUTH_IDENTITY_TYPES.consumer, identity.email);
      throw new UnauthorizedException(errorCodes.INVALID_CREDENTIALS);
    }

    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: identity.id,
      email: identity.email,
      event: AUTH_AUDIT_EVENTS.login_success,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
    await this.authAudit.clearLockout(AUTH_IDENTITY_TYPES.consumer, identity.email);

    const access = await this.sessionService.issueTokensForConsumer(identity.id, appScope);
    return {
      identity,
      accessToken: access.accessToken,
      refreshToken: access.refreshToken,
      sessionId: access.sessionId,
      sessionFamilyId: access.sessionFamilyId,
    };
  }

  private ensureConsumerNotSuspended(consumer: Pick<ConsumerModel, `suspendedAt`>) {
    if (consumer.suspendedAt != null) {
      throw new UnauthorizedException(errorCodes.ACCOUNT_SUSPENDED);
    }
  }
}
