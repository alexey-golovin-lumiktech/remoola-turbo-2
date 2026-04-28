import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import express from 'express';

import { AUTH_NOTICE_QUERY, type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma, type ConsumerModel } from '@remoola/database-2';
import { oauthCrypto, hashTokenToHex } from '@remoola/security-utils';
import { errorCodes } from '@remoola/shared-constants';

export type GoogleSignupPayload = {
  type: `google_signup`;
  email: string;
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  organization: string | null;
  sub: string | null;
  signupEntryPath: string | null;
  nextPath: string | null;
  accountType: string | null;
  contractorKind: string | null;
  appScope: ConsumerAppScope;
};

import { ConsumerSignup } from './dto';
import { LoginBody } from '../../auth/dto/login.dto';
import { CONSUMER } from '../../dtos';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { resolveEmailApiBaseUrl } from '../../shared/resolve-email-api-base-url';
import { passwordUtils, secureCompare } from '../../shared-common';

export type LoginContext = { ipAddress?: string | null; userAgent?: string | null };
export type ForgotPasswordOutcome =
  | `unknown_or_unsupported`
  | `password_reset_email_sent`
  | `provider_guidance_email_sent`
  | `cooldown_noop`;

@Injectable()
export class ConsumerAuthService {
  private readonly logger = new Logger(ConsumerAuthService.name);
  private static readonly accessRole = `USER` as const;
  private static readonly accessPermissions = [`contacts.read`] as const;
  private static readonly forgotPasswordCooldownMs = 60_000;
  private static readonly entitySignupDateOfBirthPlaceholder = new Date(0);
  private static readonly entitySignupPassportPlaceholder = `ENTITY_SIGNUP_NOT_APPLICABLE`;
  private static readonly entitySignupCitizenshipPlaceholder = `ENTITY_SIGNUP_NOT_APPLICABLE`;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly authAudit: AuthAuditService,
    private readonly originResolver: OriginResolverService,
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
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

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

    const identity = await this.prisma.consumerModel.findFirst({
      where: { email, deletedAt: null },
    });
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

    const access = await this.createSessionAndIssueTokens(identity.id, appScope);
    return {
      identity,
      accessToken: access.accessToken,
      refreshToken: access.refreshToken,
      sessionId: access.sessionId,
      sessionFamilyId: access.sessionFamilyId,
    };
  }

  async refreshAccess(refreshToken: string, appScope: ConsumerAppScope, ctx?: LoginContext) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
    } catch {
      this.logger.warn(`ConsumerAuth: refresh token verification failed`);
      await this.authAudit.recordAudit({
        identityType: AUTH_IDENTITY_TYPES.consumer,
        email: `unknown`,
        event: AUTH_AUDIT_EVENTS.refresh_failure,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
      });
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const identityId = this.resolveIdentityId(verified);
    const sessionId = verified.sid;
    const tokenAppScope = this.originResolver.validateConsumerAppScope(verified.appScope);
    if (!identityId || !sessionId || !this.isRefreshPayload(verified) || !tokenAppScope || tokenAppScope !== appScope) {
      this.logger.warn(`ConsumerAuth: invalid refresh payload`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const session = await this.prisma.authSessionModel.findFirst({
      where: { id: sessionId, consumerId: identityId, appScope },
    });
    if (session == null) {
      this.logger.warn(`ConsumerAuth: no auth session for refresh`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }

    const refreshTokenHash = this.hashToken(refreshToken);
    const matchesStoredHash = secureCompare(session.refreshTokenHash, refreshTokenHash);
    if (!matchesStoredHash) {
      if (session.replacedById || session.revokedAt) {
        await this.revokeSessionFamily(session.sessionFamilyId, `refresh_reuse_detected`);
        const reusedConsumer = await this.prisma.consumerModel.findFirst({ where: { id: identityId } });
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId,
          email: reusedConsumer?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_reuse,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      } else {
        const maybeConsumer = await this.prisma.consumerModel.findFirst({ where: { id: identityId } });
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId,
          email: maybeConsumer?.email ?? `unknown`,
          event: AUTH_AUDIT_EVENTS.refresh_failure,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      }
      this.logger.warn(`ConsumerAuth: refresh token mismatch`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      this.logger.warn(`ConsumerAuth: refresh token is revoked or expired`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: identityId, deletedAt: null } });
    if (!consumer) {
      this.logger.warn(`ConsumerAuth: consumer not found for identity`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }
    this.ensureConsumerNotSuspended(consumer);

    const access = await this.prisma.$transaction(async (tx) => {
      const next = await this.createSessionAndIssueTokens(consumer.id, appScope, session.sessionFamilyId, tx);
      await tx.authSessionModel.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedById: next.sessionId,
          invalidatedReason: `rotated`,
          lastUsedAt: new Date(),
        },
      });
      return next;
    });

    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.refresh_success,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
    return Object.assign(consumer, access);
  }

  async revokeSessionByRefreshToken(refreshToken?: string | null, appScope?: ConsumerAppScope) {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const identityId = this.resolveIdentityId(verified);
      const tokenAppScope = this.originResolver.validateConsumerAppScope(verified.appScope);
      if (!identityId || !verified.sid || !tokenAppScope || (appScope && tokenAppScope !== appScope)) return;
      await this.prisma.authSessionModel.updateMany({
        where: {
          id: verified.sid,
          consumerId: identityId,
          appScope: tokenAppScope,
          refreshTokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date(), invalidatedReason: `logout`, lastUsedAt: new Date() },
      });
    } catch {
      // Ignore invalid or already-unusable refresh tokens during logout cleanup.
    }
  }

  async revokeSessionByRefreshTokenAndAudit(
    refreshToken?: string | null,
    appScope?: ConsumerAppScope,
    ctx?: LoginContext,
  ): Promise<void> {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken, { secret: envs.JWT_REFRESH_SECRET });
      const consumer = await this.prisma.consumerModel.findFirst({
        where: { id: verified.identityId, deletedAt: null },
      });
      await this.revokeSessionByRefreshToken(refreshToken, appScope);
      if (consumer) {
        await this.authAudit.recordAudit({
          identityType: AUTH_IDENTITY_TYPES.consumer,
          identityId: consumer.id,
          email: consumer.email,
          event: AUTH_AUDIT_EVENTS.logout,
          ipAddress: ctx?.ipAddress,
          userAgent: ctx?.userAgent,
        });
      }
    } catch {
      await this.revokeSessionByRefreshToken(refreshToken, appScope);
    }
  }

  async issueTokensForConsumer(identityId: ConsumerModel[`id`], appScope: ConsumerAppScope) {
    return this.createSessionAndIssueTokens(identityId, appScope);
  }

  async revokeAllSessionsByConsumerIdAndAudit(identityId: ConsumerModel[`id`], ctx?: LoginContext): Promise<void> {
    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: identityId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!consumer) return;
    await this.prisma.authSessionModel.updateMany({
      where: { consumerId: consumer.id, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: `logout_all`, lastUsedAt: new Date() },
    });
    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumer.id,
      email: consumer.email,
      event: AUTH_AUDIT_EVENTS.logout_all,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });
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
    const redirectWith = (verifiedFlag: `yes` | `no`, appScope?: string | null, emailForQuery?: string) => {
      const redirectUrl = new URL(`signup/verification`, this.resolveSignupVerificationOrigin(appScope));
      redirectUrl.searchParams.set(`verified`, verifiedFlag);
      if (emailForQuery) redirectUrl.searchParams.set(`email`, emailForQuery);
      res.redirect(redirectUrl.toString());
    };

    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(token);
    } catch {
      const decoded = this.decodeJwtPayload(token);
      redirectWith(`no`, decoded?.appScope);
      return;
    }

    const appScope = this.originResolver.validateConsumerAppScope(verified.appScope);

    if (!appScope || verified.typ !== `access` || verified.scope !== `consumer` || verified.sid) {
      redirectWith(`no`, verified.appScope);
      return;
    }

    const identityId = this.resolveIdentityId(verified);
    if (!identityId) {
      redirectWith(`no`, appScope);
      return;
    }

    const identity = await this.prisma.consumerModel.findFirst({
      where: { id: identityId, deletedAt: null },
    });

    if (!identity?.email) {
      redirectWith(`no`, appScope);
      return;
    }

    const updated = await this.prisma.consumerModel.update({
      where: { id: identity.id },
      data: { verified: true },
    });
    const verifiedFlag: `yes` | `no` = !updated || updated.verified === false ? `no` : `yes`;
    redirectWith(verifiedFlag, appScope, identity.email);
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

  private resolveSignupVerificationOrigin(appScope?: string | null): string {
    const resolvedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    const origin = resolvedAppScope ? this.originResolver.resolveConsumerOriginByScope(resolvedAppScope) : null;
    if (!origin) {
      throw new BadRequestException(errorCodes.ORIGIN_REQUIRED);
    }
    return origin;
  }

  private decodeJwtPayload(token: string): IJwtTokenPayload | null {
    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded !== `object`) {
      return null;
    }
    return decoded as IJwtTokenPayload;
  }

  private getSignupVerificationToken(identityId: string, appScope: ConsumerAppScope) {
    return this.jwtService.signAsync(
      { sub: identityId, identityId, typ: `access` as const, scope: `consumer` as const, appScope },
      { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
  }

  private async createSessionAndIssueTokens(
    identityId: ConsumerModel[`id`],
    appScope: ConsumerAppScope,
    sessionFamilyId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const temporaryHash = `pending:${oauthCrypto.generateOAuthState()}`;
    const expiresAt = new Date(Date.now() + envs.JWT_REFRESH_TTL_SECONDS * 1000);

    const created = await db.authSessionModel.create({
      data: {
        consumerId: identityId,
        appScope,
        sessionFamilyId: sessionFamilyId ?? identityId,
        refreshTokenHash: temporaryHash,
        expiresAt,
      },
    });

    const effectiveSessionFamilyId = sessionFamilyId ?? created.id;
    const accessToken = await this.getAccessToken(identityId, appScope, created.id);
    const refreshToken = await this.getRefreshToken(identityId, appScope, created.id, effectiveSessionFamilyId);
    const accessTokenHash = this.hashToken(accessToken);
    const refreshTokenHash = this.hashToken(refreshToken);

    await db.authSessionModel.update({
      where: { id: created.id },
      data: {
        accessTokenHash,
        sessionFamilyId: effectiveSessionFamilyId,
        refreshTokenHash,
        lastUsedAt: new Date(),
      },
    });

    return { accessToken, refreshToken, sessionId: created.id, sessionFamilyId: effectiveSessionFamilyId };
  }

  private getAccessToken(identityId: string, appScope: ConsumerAppScope, sessionId: string) {
    return this.jwtService.signAsync(
      {
        sub: identityId,
        identityId,
        sid: sessionId,
        typ: `access` as const,
        scope: `consumer` as const,
        appScope,
        role: ConsumerAuthService.accessRole,
        permissions: ConsumerAuthService.accessPermissions,
      },
      { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    );
  }

  private getRefreshToken(identityId: string, appScope: ConsumerAppScope, sessionId: string, sessionFamilyId: string) {
    return this.jwtService.signAsync(
      {
        sub: identityId,
        identityId,
        sid: sessionId,
        fid: sessionFamilyId,
        typ: `refresh`,
        scope: `consumer`,
        appScope,
      },
      { expiresIn: envs.JWT_REFRESH_TTL_SECONDS, secret: envs.JWT_REFRESH_SECRET },
    );
  }

  private resolveIdentityId(payload: IJwtTokenPayload): string | null {
    return payload.identityId ?? payload.sub ?? null;
  }

  private isRefreshPayload(payload: IJwtTokenPayload): boolean {
    return payload.typ === `refresh` || (payload as { type?: string }).type === `refresh`;
  }

  private hashToken(token: string): string {
    return oauthCrypto.hashOAuthState(token);
  }

  private bucketSessionCount(count: number): string {
    if (count <= 0) return `0`;
    if (count === 1) return `1`;
    if (count <= 5) return `2-5`;
    return `6+`;
  }

  private async revokeSessionFamily(sessionFamilyId: string, reason: string): Promise<void> {
    await this.prisma.authSessionModel.updateMany({
      where: { sessionFamilyId, revokedAt: null },
      data: { revokedAt: new Date(), invalidatedReason: reason, lastUsedAt: new Date() },
    });
  }

  private ensureConsumerNotSuspended(consumer: Pick<ConsumerModel, `suspendedAt`>) {
    if (consumer.suspendedAt != null) {
      throw new UnauthorizedException(errorCodes.ACCOUNT_SUSPENDED);
    }
  }

  async resendSignupVerificationEmail(consumerId: string, appScope: ConsumerAppScope): Promise<boolean> {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: consumerId, deletedAt: null },
      select: {
        id: true,
        email: true,
        verified: true,
      },
    });
    if (!consumer) {
      throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    }
    if (consumer.verified) {
      throw new ConflictException(`Signup verification email is not applicable for an already verified consumer`);
    }

    const token = await this.getSignupVerificationToken(consumer.id, validatedAppScope);
    return this.mailingService.sendConsumerSignupVerificationEmailSafe({
      email: consumer.email,
      token,
    });
  }

  async resendPasswordRecoveryEmail(
    consumerId: string,
    appScope: ConsumerAppScope,
  ): Promise<{ requestedKind: `password_recovery`; dispatchedKind: `password_reset` | `google_signin_recovery` }> {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: consumerId, deletedAt: null },
      select: {
        id: true,
        email: true,
        password: true,
        salt: true,
      },
    });
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

    await this.prisma.resetPasswordModel.updateMany({
      where: { consumerId: consumer.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.prisma.resetPasswordModel.create({
      data: { consumerId: consumer.id, tokenHash: hashTokenToHex(token), expiredAt, appScope: validatedAppScope },
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
    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: consumerId, deletedAt: null },
      select: {
        email: true,
      },
    });
    if (!consumer) {
      throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    }

    return this.mailingService.sendAdminV2ConsumerSuspensionEmail({
      email: consumer.email,
      reason,
    });
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, appScope: ConsumerAppScope) {
    const validatedAppScope = this.originResolver.validateConsumerAppScope(appScope);
    if (!validatedAppScope) {
      throw new BadRequestException(`Invalid app scope`);
    }

    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    if (consumer.verified) {
      this.logger.log({
        event: `consumer_complete_profile_creation_skipped_already_verified`,
        consumerId,
      });
      return;
    }
    const token = await this.getSignupVerificationToken(consumer.id, validatedAppScope);
    await this.mailingService.sendConsumerSignupVerificationEmail({
      email: consumer.email,
      token,
    });
  }

  async signup(dto: ConsumerSignup, googleSignupPayload?: GoogleSignupPayload) {
    this.ensureBusinessRules(dto);

    const email = (googleSignupPayload?.email ?? dto.email).toLowerCase();
    if (googleSignupPayload && dto.email && dto.email.toLowerCase() !== email) {
      throw new BadRequestException(errorCodes.EMAIL_MISMATCH_GOOGLE);
    }

    const existing = await this.prisma.consumerModel.findFirst({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(errorCodes.EMAIL_ALREADY_REGISTERED_SIGNUP);
    }

    let hash: string | null = null;
    let salt: string | null = null;
    if (!googleSignupPayload) {
      const trimmedPasswordLength = dto.password?.trim().length ?? 0;
      if (trimmedPasswordLength < 8) {
        throw new BadRequestException(errorCodes.PASSWORD_REQUIREMENTS);
      }
      const hashed = await passwordUtils.hashPassword(dto.password);
      hash = hashed.hash;
      salt = hashed.salt;
    }

    try {
      const personalDetailsCreate = this.buildSignupPersonalDetailsCreate(dto);
      const personalDetails = personalDetailsCreate ? { create: personalDetailsCreate } : undefined;

      let organizationDetails;
      if (dto.organizationDetails) {
        organizationDetails = {
          create: {
            name: dto.organizationDetails.name,
            consumerRole: dto.organizationDetails.consumerRole,
            size: dto.organizationDetails.size,
          },
        };
      }

      let addressDetails;
      if (dto.addressDetails) {
        addressDetails = {
          create: {
            postalCode: dto.addressDetails.postalCode,
            country: dto.addressDetails.country,
            city: dto.addressDetails.city ?? null,
            state: dto.addressDetails.state ?? null,
            street: dto.addressDetails.street ?? null,
          },
        };
      }

      const consumer = await this.prisma.consumerModel.create({
        data: {
          email,
          accountType: dto.accountType,
          contractorKind: dto.accountType === $Enums.AccountType.CONTRACTOR ? (dto.contractorKind ?? null) : null,
          ...(hash != null && salt != null ? { password: hash, salt } : {}),
          verified: googleSignupPayload ? true : false,
          legalVerified: false,
          howDidHearAboutUs: dto.howDidHearAboutUs ?? null,
          howDidHearAboutUsOther: dto.howDidHearAboutUsOther ?? null,
          ...(addressDetails && { addressDetails }),
          ...(personalDetails && { personalDetails }),
          ...(organizationDetails && { organizationDetails }),
        },
        include: { addressDetails: true, personalDetails: true, organizationDetails: true },
      });

      if (googleSignupPayload) {
        await this.upsertGoogleProfileDetailsFromSignup(consumer.id, googleSignupPayload);
      }

      return consumer;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        throw new ConflictException(errorCodes.EMAIL_ALREADY_REGISTERED_PRISMA);
      }
      throw err;
    }
  }
  async requestPasswordReset(
    email: CONSUMER.ForgotPasswordBody[`email`],
    appScope: ConsumerAppScope,
  ): Promise<ForgotPasswordOutcome> {
    const origin = this.resolveForgotPasswordAppScopeOrigin(appScope);

    const normalizedEmail = email?.trim()?.toLowerCase() ?? ``;
    const consumer = await this.prisma.consumerModel.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });
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
    const cooldownWindowStart = new Date(Date.now() - ConsumerAuthService.forgotPasswordCooldownMs);
    const cooldownHit = await this.prisma.resetPasswordModel.findFirst({
      where: {
        consumerId: consumer.id,
        createdAt: { gte: cooldownWindowStart },
      },
      select: { id: true },
    });
    if (cooldownHit) {
      this.logger.warn({
        event: `consumer_auth_forgot_password_cooldown_hit`,
        consumerId: consumer.id,
        cooldownSeconds: Math.round(ConsumerAuthService.forgotPasswordCooldownMs / 1000),
      });
      return `cooldown_noop`;
    }

    const token = oauthCrypto.generateOAuthState();
    const expiredAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.resetPasswordModel.updateMany({
      where: { consumerId: consumer.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.prisma.resetPasswordModel.create({
      data: { consumerId: consumer.id, tokenHash: hashTokenToHex(token), expiredAt, appScope },
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
    const row = await this.prisma.resetPasswordModel.findFirst({
      where: { tokenHash },
      orderBy: { createdAt: `desc` },
      select: {
        appScope: true,
        deletedAt: true,
        expiredAt: true,
      },
    });
    const activeToken = !!row && row.deletedAt == null && row.expiredAt > new Date();
    const confirmUrl = this.buildForgotPasswordConfirmUrl(row?.appScope, activeToken ? token : undefined);
    res.redirect(confirmUrl.toString());
  }

  /** Consume a single-use reset token, rotate credentials, and revoke all active sessions. */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashTokenToHex(token);
    const row = await this.prisma.resetPasswordModel.findFirst({
      where: { tokenHash, deletedAt: null, expiredAt: { gt: new Date() } },
    });
    if (!row) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `token_not_found_or_expired` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }
    if (!secureCompare(row.tokenHash, tokenHash)) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `token_hash_mismatch` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { id: row.consumerId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!consumer) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `consumer_not_found` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }
    const activeSessionsBeforeReset = await this.prisma.authSessionModel.count({
      where: { consumerId: consumer.id, revokedAt: null },
    });

    const { hash, salt } = await passwordUtils.hashPassword(newPassword);
    const consumed = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.resetPasswordModel.updateMany({
        where: { id: row.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (updateResult.count !== 1) {
        return null;
      }
      await tx.consumerModel.update({
        where: { id: consumer.id },
        data: { password: hash, salt },
      });
      return consumer;
    });

    if (!consumed) {
      this.logger.warn({ event: `consumer_auth_password_reset_failed`, reason: `token_already_consumed` });
      throw new BadRequestException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }

    await this.revokeAllSessionsByConsumerIdAndAudit(consumed.id);
    this.logger.log({
      event: `consumer_auth_password_reset_succeeded`,
      consumerId: consumed.id,
      revokedSessionCountBucket: this.bucketSessionCount(activeSessionsBeforeReset),
    });
    await this.authAudit.recordAudit({
      identityType: AUTH_IDENTITY_TYPES.consumer,
      identityId: consumed.id,
      email: consumed.email,
      event: AUTH_AUDIT_EVENTS.password_change,
    });
  }

  private ensureBusinessRules(dto: ConsumerSignup) {
    const isIndividualContractor =
      dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL;

    if (dto.accountType === $Enums.AccountType.CONTRACTOR && !dto.contractorKind) {
      throw new BadRequestException(errorCodes.CONTRACTOR_KIND_REQUIRED);
    }

    if (dto.accountType === $Enums.AccountType.BUSINESS && dto.contractorKind !== undefined) {
      throw new BadRequestException(errorCodes.CONTRACTOR_KIND_NOT_FOR_BUSINESS);
    }

    if (isIndividualContractor && !dto.personalDetails) {
      throw new BadRequestException(errorCodes.PERSONAL_DETAILS_REQUIRED);
    }

    if (
      isIndividualContractor &&
      (!dto.personalDetails?.citizenOf?.trim() ||
        !dto.personalDetails?.dateOfBirth?.trim() ||
        !dto.personalDetails?.passportOrIdNumber?.trim())
    ) {
      throw new BadRequestException(errorCodes.PERSONAL_DETAILS_REQUIRED);
    }

    if (
      (dto.accountType === $Enums.AccountType.BUSINESS ||
        (dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.ENTITY)) &&
      !dto.organizationDetails
    ) {
      throw new BadRequestException(errorCodes.ORGANIZATION_DETAILS_REQUIRED);
    }
  }

  private buildSignupPersonalDetailsCreate(dto: ConsumerSignup) {
    if (!dto.personalDetails) return null;

    const isIndividualContractor =
      dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL;

    if (isIndividualContractor) {
      return {
        legalStatus: dto.personalDetails.legalStatus ?? null,
        citizenOf: dto.personalDetails.citizenOf ?? null,
        dateOfBirth: dto.personalDetails.dateOfBirth ? new Date(dto.personalDetails.dateOfBirth) : null,
        passportOrIdNumber: dto.personalDetails.passportOrIdNumber ?? null,
        countryOfTaxResidence: dto.personalDetails.countryOfTaxResidence ?? null,
        taxId: dto.personalDetails.taxId ?? null,
        phoneNumber: dto.personalDetails.phoneNumber ?? null,
        firstName: dto.personalDetails.firstName ?? null,
        lastName: dto.personalDetails.lastName ?? null,
      };
    }

    return {
      legalStatus: dto.personalDetails.legalStatus ?? null,
      citizenOf:
        dto.personalDetails.citizenOf?.trim() ||
        dto.personalDetails.countryOfTaxResidence?.trim() ||
        dto.addressDetails.country?.trim() ||
        ConsumerAuthService.entitySignupCitizenshipPlaceholder,
      dateOfBirth: dto.personalDetails.dateOfBirth
        ? new Date(dto.personalDetails.dateOfBirth)
        : new Date(ConsumerAuthService.entitySignupDateOfBirthPlaceholder.getTime()),
      passportOrIdNumber:
        dto.personalDetails.passportOrIdNumber?.trim() || ConsumerAuthService.entitySignupPassportPlaceholder,
      countryOfTaxResidence: dto.personalDetails.countryOfTaxResidence ?? null,
      taxId: dto.personalDetails.taxId ?? null,
      phoneNumber: dto.personalDetails.phoneNumber ?? null,
      firstName: dto.personalDetails.firstName ?? null,
      lastName: dto.personalDetails.lastName ?? null,
    };
  }

  private async upsertGoogleProfileDetailsFromSignup(consumerId: string, payload: GoogleSignupPayload) {
    const metadata = JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;

    await this.prisma.googleProfileDetailsModel.upsert({
      where: { consumerId },
      update: {
        email: payload.email,
        emailVerified: payload.emailVerified,
        name: payload.name,
        givenName: payload.givenName,
        familyName: payload.familyName,
        picture: payload.picture,
        organization: payload.organization,
        metadata,
      },
      create: {
        email: payload.email,
        emailVerified: payload.emailVerified,
        name: payload.name,
        givenName: payload.givenName,
        familyName: payload.familyName,
        picture: payload.picture,
        organization: payload.organization,
        metadata,
        consumer: {
          connect: { id: consumerId },
        },
      },
    });
  }
}
