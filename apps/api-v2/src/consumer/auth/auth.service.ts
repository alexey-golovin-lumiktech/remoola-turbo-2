import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import express from 'express';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma, type ConsumerModel } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';
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

import { ConsumerAuthRecoveryService } from './consumer-auth-recovery.service';
import { ConsumerAuthSessionService } from './consumer-auth-session.service';
import { ConsumerAuthSignupService } from './consumer-auth-signup.service';
import { ConsumerAuthVerificationService } from './consumer-auth-verification.service';
import { ConsumerSignup } from './dto';
import { LoginBody } from '../../auth/dto/login.dto';
import { CONSUMER } from '../../dtos';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { envs } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

type LoginContext = { ipAddress?: string | null; userAgent?: string | null };
type ForgotPasswordOutcome =
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
    private readonly sessionService: ConsumerAuthSessionService,
    private readonly recoveryService: ConsumerAuthRecoveryService,
    private readonly signupService: ConsumerAuthSignupService,
    private readonly verificationService: ConsumerAuthVerificationService,
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

    const access = await this.sessionService.issueTokensForConsumer(identity.id, appScope);
    return {
      identity,
      accessToken: access.accessToken,
      refreshToken: access.refreshToken,
      sessionId: access.sessionId,
      sessionFamilyId: access.sessionFamilyId,
    };
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
    return this.recoveryService.resetPasswordWithToken(token, newPassword, {
      revokeAllSessionsByConsumerIdAndAudit: (consumerId) => this.revokeAllSessionsByConsumerIdAndAudit(consumerId),
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
