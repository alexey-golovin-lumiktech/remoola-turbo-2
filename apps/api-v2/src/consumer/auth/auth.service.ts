import { BadRequestException, Injectable } from '@nestjs/common';
import express from 'express';

import { type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerAuthLoginService } from './consumer-auth-login.service';
import { ConsumerAuthRecoveryService } from './consumer-auth-recovery.service';
import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerAuthSignupService } from './consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './consumer-auth-verification.service';
import { type ForgotPasswordOutcome, type GoogleSignupPayload, type LoginContext } from './consumer-auth.types';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { ConsumerSignup } from './dto';
import { LoginBody } from '../../auth/dto/login.dto';
import { CONSUMER } from '../../dtos';

export type { GoogleSignupPayload };

@Injectable()
export class ConsumerAuthService {
  constructor(
    private readonly loginService: ConsumerAuthLoginService,
    private readonly sessionService: ConsumerAuthSessionService,
    private readonly recoveryService: ConsumerAuthRecoveryService,
    private readonly signupService: ConsumerAuthSignupService,
    private readonly verificationService: ConsumerAuthVerificationService,
    private readonly consumerIdentityRepository: ConsumerIdentityRepository,
  ) {}

  private static readonly googleSignupTokenType = `google_signup` as const;

  private toGoogleSignupPayload(payload: {
    email?: string | null;
    emailVerified?: boolean;
    name?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    picture?: string | null;
    organization?: string | null;
    sub?: string | null;
    signupEntryPath?: string | null;
    nextPath?: string | null;
    accountType?: string | null;
    contractorKind?: string | null;
    appScope: ConsumerAppScope;
  }): GoogleSignupPayload {
    return {
      type: ConsumerAuthService.googleSignupTokenType,
      email: payload.email ?? ``,
      emailVerified: !!payload.emailVerified,
      name: payload.name ?? null,
      givenName: payload.givenName ?? null,
      familyName: payload.familyName ?? null,
      picture: payload.picture ?? null,
      organization: payload.organization ?? null,
      sub: payload.sub ?? null,
      signupEntryPath: payload.signupEntryPath ?? null,
      nextPath: payload.nextPath ?? null,
      accountType: payload.accountType ?? null,
      contractorKind: payload.contractorKind ?? null,
      appScope: payload.appScope,
    };
  }

  createGoogleSignupPayload(payload: {
    email?: string | null;
    emailVerified?: boolean;
    name?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    picture?: string | null;
    organization?: string | null;
    sub?: string | null;
    signupEntryPath?: string | null;
    nextPath?: string | null;
    accountType?: string | null;
    contractorKind?: string | null;
    appScope: ConsumerAppScope;
  }): GoogleSignupPayload {
    return this.toGoogleSignupPayload(payload);
  }

  async findConsumerByEmail(email: string) {
    return this.consumerIdentityRepository.findActiveByEmail(email);
  }

  async login(body: LoginBody, appScope: ConsumerAppScope, ctx?: LoginContext) {
    return this.loginService.login(body, appScope, ctx);
  }

  async refreshAccess(refreshToken: string, appScope: ConsumerAppScope, ctx?: LoginContext) {
    return this.sessionService.refreshAccess(refreshToken, appScope, ctx);
  }

  async revokeSessionByRefreshToken(refreshToken?: string | null, appScope?: ConsumerAppScope) {
    return this.sessionService.revokeSessionByRefreshToken(refreshToken, appScope);
  }

  async revokeSessionByRefreshTokenAndAudit(
    refreshToken?: string | null,
    appScope?: ConsumerAppScope,
    ctx?: LoginContext,
  ): Promise<void> {
    return this.sessionService.revokeSessionByRefreshTokenAndAudit(refreshToken, appScope, ctx);
  }

  async issueTokensForConsumer(identityId: ConsumerModel[`id`], appScope: ConsumerAppScope) {
    return this.sessionService.issueTokensForConsumer(identityId, appScope);
  }

  async createSessionAndIssueTokens(
    identityId: ConsumerModel[`id`],
    appScope: ConsumerAppScope,
    sessionFamilyId?: string,
  ) {
    return this.sessionService.createSessionAndIssueTokens(identityId, appScope, sessionFamilyId);
  }

  async revokeAllSessionsByConsumerIdAndAudit(identityId: ConsumerModel[`id`], ctx?: LoginContext): Promise<void> {
    return this.sessionService.revokeAllSessionsByConsumerIdAndAudit(identityId, ctx);
  }

  validateGoogleSignupPayload(decoded: GoogleSignupPayload) {
    if (decoded?.type !== ConsumerAuthService.googleSignupTokenType) {
      throw new BadRequestException(errorCodes.INVALID_GOOGLE_SIGNUP_TOKEN);
    }
    if (!decoded.email) {
      throw new BadRequestException(errorCodes.GOOGLE_SIGNUP_MISSING_EMAIL);
    }
    if (!decoded.emailVerified) {
      throw new BadRequestException(errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_SIGNUP);
    }
    return decoded;
  }

  async signupVerification(token: string, res: express.Response) {
    return this.verificationService.signupVerification(token, res);
  }

  async resendSignupVerificationEmail(consumerId: string, appScope: ConsumerAppScope): Promise<boolean> {
    return this.verificationService.resendSignupVerificationEmail(consumerId, appScope);
  }

  async resendPasswordRecoveryEmail(
    consumerId: string,
    appScope: ConsumerAppScope,
  ): Promise<{ requestedKind: `password_recovery`; dispatchedKind: `password_reset` | `google_signin_recovery` }> {
    return this.recoveryService.resendPasswordRecoveryEmail(consumerId, appScope);
  }

  async sendConsumerSuspensionEmail(consumerId: string, reason: string): Promise<boolean> {
    return this.recoveryService.sendConsumerSuspensionEmail(consumerId, reason);
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, appScope: ConsumerAppScope) {
    return this.verificationService.completeProfileCreationAndSendVerificationEmail(consumerId, appScope);
  }

  async signup(dto: ConsumerSignup, googleSignupPayload?: GoogleSignupPayload) {
    return this.signupService.signup(dto, googleSignupPayload);
  }
  async requestPasswordReset(
    email: CONSUMER.ForgotPasswordBody[`email`],
    appScope: ConsumerAppScope,
  ): Promise<ForgotPasswordOutcome> {
    return this.recoveryService.requestPasswordReset(email, appScope);
  }

  async validateForgotPasswordTokenAndRedirect(token: string, res: express.Response): Promise<void> {
    return this.recoveryService.validateForgotPasswordTokenAndRedirect(token, res);
  }

  /** Consume a single-use reset token, rotate credentials, and revoke all active sessions. */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    return this.recoveryService.resetPasswordWithToken(token, newPassword);
  }
}
