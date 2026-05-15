import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';

import { AUTH_NOTICE_QUERY, type ConsumerAppScope } from '@remoola/api-types';
import { oauthCrypto, hashTokenToHex } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthSessionRepository } from './consumer-auth-session.repository';
import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { PasswordResetRepository } from './password-reset.repository';
import { type CONSUMER } from '../../dtos';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { resolveEmailApiBaseUrl } from '../../shared/resolve-email-api-base-url';
import { passwordUtils, secureCompare } from '../../shared-common';

import type express from 'express';

type ForgotPasswordOutcome =
  | `unknown_or_unsupported`
  | `password_reset_email_sent`
  | `provider_guidance_email_sent`
  | `cooldown_noop`;

@Injectable()
export class ConsumerAuthRecoveryService {
  private readonly logger = new Logger(ConsumerAuthRecoveryService.name);
  private static readonly forgotPasswordCooldownMs = 60_000;

  constructor(
    private readonly mailingService: MailingService,
    private readonly originResolver: OriginResolverService,
    private readonly authAudit: AuthAuditService,
    private readonly sessionService: ConsumerAuthSessionService,
    private readonly consumerIdentityRepository: ConsumerIdentityRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly sessionRepository: ConsumerAuthSessionRepository,
  ) {}

  async resendPasswordRecoveryEmail(
    consumerId: string,
    appScope: ConsumerAppScope,
  ): Promise<{ requestedKind: `password_recovery`; dispatchedKind: `password_reset` | `google_signin_recovery` }> {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }

    const consumer = await this.consumerIdentityRepository.findActiveRecoveryCandidateById(consumerId);
    if (!consumer) {
      throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    }

    const origin = this.resolveForgotPasswordAppScopeOrigin(validatedAppScope);
    if (consumer.password == null || consumer.salt == null) {
      const loginUrl = new URL(`/login`, origin);
      loginUrl.searchParams.set(AUTH_NOTICE_QUERY, `google_signin_required`);
      const sent = await this.mailingService.sendConsumerPasswordlessRecoveryEmailSafe({
        email: consumer.email,
        loginUrl: loginUrl.toString(),
      });
      if (!sent) {
        throw new ConflictException(`Failed to dispatch recovery email`);
      }
      return {
        requestedKind: `password_recovery`,
        dispatchedKind: `google_signin_recovery`,
      };
    }

    const token = oauthCrypto.generateOAuthState();
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetRepository.invalidateActiveTokensByConsumerId(consumer.id);
    await this.passwordResetRepository.createToken({
      consumerId: consumer.id,
      tokenHash: hashTokenToHex(token),
      expiredAt,
      appScope: validatedAppScope,
    });

    const backendBaseURL = resolveEmailApiBaseUrl();
    const verifyUrl = new URL(`${backendBaseURL}/consumer/auth/forgot-password/verify`);
    verifyUrl.searchParams.set(`token`, token);
    const sent = await this.mailingService.sendConsumerForgotPasswordEmailSafe({
      email: consumer.email,
      forgotPasswordLink: verifyUrl.toString(),
    });
    if (!sent) {
      throw new ConflictException(`Failed to dispatch recovery email`);
    }
    return {
      requestedKind: `password_recovery`,
      dispatchedKind: `password_reset`,
    };
  }

  async sendConsumerSuspensionEmail(consumerId: string, reason: string): Promise<boolean> {
    const consumer = await this.consumerIdentityRepository.findActiveIdentitySummaryById(consumerId);
    if (!consumer) {
      throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    }

    return this.mailingService.sendAdminV2ConsumerSuspensionEmail({
      email: consumer.email,
      reason,
    });
  }

  async requestPasswordReset(
    email: CONSUMER.ForgotPasswordBody[`email`],
    appScope: ConsumerAppScope,
  ): Promise<ForgotPasswordOutcome> {
    const origin = this.resolveForgotPasswordAppScopeOrigin(appScope);

    const normalizedEmail = email?.trim()?.toLowerCase() ?? ``;
    const consumer = await this.consumerIdentityRepository.findActiveRecoveryCandidateByEmail(normalizedEmail);
    if (!consumer) return `unknown_or_unsupported`;
    if (consumer.password == null || consumer.salt == null) {
      const loginUrl = new URL(`/login`, origin);
      loginUrl.searchParams.set(AUTH_NOTICE_QUERY, `google_signin_required`);
      await this.mailingService.sendConsumerPasswordlessRecoveryEmail({
        email: consumer.email,
        loginUrl: loginUrl.toString(),
      });
      this.logger.log({
        event: `consumer_auth_forgot_password_provider_guidance_sent`,
        consumerId: consumer.id,
      });
      return `provider_guidance_email_sent`;
    }
    const cooldownWindowStart = new Date(Date.now() - ConsumerAuthRecoveryService.forgotPasswordCooldownMs);
    const cooldownHit = await this.passwordResetRepository.findRecentTokenByConsumerId(
      consumer.id,
      cooldownWindowStart,
    );
    if (cooldownHit) {
      this.logger.warn({
        event: `consumer_auth_forgot_password_cooldown_hit`,
        consumerId: consumer.id,
        cooldownSeconds: Math.round(ConsumerAuthRecoveryService.forgotPasswordCooldownMs / 1000),
      });
      return `cooldown_noop`;
    }

    const token = oauthCrypto.generateOAuthState();
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetRepository.invalidateActiveTokensByConsumerId(consumer.id);
    await this.passwordResetRepository.createToken({
      consumerId: consumer.id,
      tokenHash: hashTokenToHex(token),
      expiredAt,
      appScope,
    });

    const backendBaseURL = resolveEmailApiBaseUrl();
    const verifyUrl = new URL(`${backendBaseURL}/consumer/auth/forgot-password/verify`);
    verifyUrl.searchParams.set(`token`, token);
    await this.mailingService.sendConsumerForgotPasswordEmail({
      email: consumer.email,
      forgotPasswordLink: verifyUrl.toString(),
    });
    this.logger.log({
      event: `consumer_auth_forgot_password_token_issued`,
      consumerId: consumer.id,
      tokenTtlSeconds: 3600,
    });
    return `password_reset_email_sent`;
  }

  async validateForgotPasswordTokenAndRedirect(token: string, res: express.Response): Promise<void> {
    const tokenHash = hashTokenToHex(token);
    const row = await this.passwordResetRepository.findLatestTokenByHash(tokenHash);
    const activeToken = !!row && row.deletedAt == null && row.expiredAt > new Date();
    const confirmUrl = this.buildForgotPasswordConfirmUrl(row?.appScope, activeToken ? token : undefined);
    res.redirect(confirmUrl.toString());
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    handlers?: {
      revokeAllSessionsByConsumerIdAndAudit?: (consumerId: string) => Promise<unknown> | unknown;
    },
  ): Promise<void> {
    const tokenHash = hashTokenToHex(token);
    const row = await this.passwordResetRepository.findActiveTokenByHash(tokenHash);
    if (!row) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `token_not_found_or_expired` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }
    if (!secureCompare(row.tokenHash, tokenHash)) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `token_hash_mismatch` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }

    const consumer = await this.consumerIdentityRepository.findActiveIdentitySummaryById(row.consumerId);
    if (!consumer) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `consumer_not_found` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }
    const activeSessionsBeforeReset = await this.sessionRepository.countActiveByConsumerId(consumer.id);

    const { hash, salt } = await passwordUtils.hashPassword(newPassword);
    const consumed = await this.passwordResetRepository.consumeTokenAndUpdatePassword({
      resetTokenId: row.id,
      consumerId: consumer.id,
      password: hash,
      salt,
    });

    if (!consumed) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `token_already_consumed` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }

    const revokeAllSessionsByConsumerIdAndAudit =
      handlers?.revokeAllSessionsByConsumerIdAndAudit ??
      ((consumerId: string) => this.sessionService.revokeAllSessionsByConsumerIdAndAudit(consumerId));
    await revokeAllSessionsByConsumerIdAndAudit(consumer.id);
    this.logger.log({
      event: `consumer_auth_password_reset_succeeded`,
      consumerId: consumer.id,
      revokedSessionCountBucket: this.bucketSessionCount(activeSessionsBeforeReset),
    });
    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.password_change,
    });
  }

  private resolveForgotPasswordAppScopeOrigin(appScope?: string | null): string {
    const resolvedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    const origin = resolvedAppScope ? this.originResolver.resolveConsumerOriginByScope(resolvedAppScope) : null;
    if (!origin) {
      throw new BadRequestException(errorCodes.ORIGIN_REQUIRED);
    }
    return origin;
  }

  private buildForgotPasswordConfirmUrl(appScope?: string | null, token?: string): URL {
    const confirmUrl = new URL(`/forgot-password/confirm`, this.resolveForgotPasswordAppScopeOrigin(appScope));
    if (token) {
      confirmUrl.searchParams.set(`token`, token);
    }
    return confirmUrl;
  }

  private bucketSessionCount(count: number): string {
    if (count <= 0) return `0`;
    if (count === 1) return `1`;
    if (count <= 5) return `2-5`;
    return `6+`;
  }
}
