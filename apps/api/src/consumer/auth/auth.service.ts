import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';

import { $Enums, Prisma, type ConsumerModel, type ResetPasswordModel } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

type GoogleSignupPayload = {
  type: `google_signup`;
  email: string;
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  organization: string | null;
  sub: string | null;
};
type OAuthExchangePayload = {
  type: `oauth_exchange`;
  identityId: string;
  createdAt: number;
};

import { ConsumerSignup } from './dto';
import { LoginBody } from '../../auth/dto/login.dto';
import { CONSUMER } from '../../dtos';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { envs, HOURS_24MS, JWT_ACCESS_TTL_SECONDS, JWT_REFRESH_TTL_SECONDS } from '../../envs';
import { AuthAuditService, AUTH_AUDIT_EVENTS, AUTH_IDENTITY_TYPES } from '../../shared/auth-audit.service';
import { MailingService } from '../../shared/mailing.service';
import { PrismaService } from '../../shared/prisma.service';
import { type IChangePasswordBody, type IChangePasswordParam, passwordUtils, secureCompare } from '../../shared-common';

export type LoginContext = { ipAddress?: string | null; userAgent?: string | null };

@Injectable()
export class ConsumerAuthService {
  private readonly logger = new Logger(ConsumerAuthService.name);
  private readonly oAuth2Client: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly authAudit: AuthAuditService,
  ) {
    this.oAuth2Client = new OAuth2Client(envs.GOOGLE_CLIENT_ID!, envs.GOOGLE_CLIENT_SECRET!);
  }

  private static readonly googleSignupTokenType = `google_signup` as const;
  private static readonly oauthExchangeTokenType = `oauth_exchange` as const;

  private toGoogleSignupPayload(payload: {
    email?: string | null;
    emailVerified?: boolean;
    name?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    picture?: string | null;
    organization?: string | null;
    sub?: string | null;
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
    };
  }

  async googleOAuth(body: CONSUMER.GoogleSignin) {
    if (!this.oAuth2Client) throw new InternalServerErrorException(`oAuth2Client is not defined`);

    try {
      const { credential, contractorKind = null, accountType = null } = body;
      const verified = await this.oAuth2Client.verifyIdToken({ idToken: credential });
      const googleProfileDetailsInstance = new CONSUMER.CreateGoogleProfileDetails(verified.getPayload());

      const consumerData = this.extractConsumerFromGoogleProfile(googleProfileDetailsInstance);
      let consumer = await this.prisma.consumerModel.findFirst({ where: { email: consumerData.email } });

      if (!consumer) {
        consumer = await this.prisma.consumerModel.create({ data: { ...consumerData, accountType, contractorKind } });
        if (consumer.deletedAt != null) throw new BadRequestException(errorCodes.ACCOUNT_SUSPENDED);

        const googleProfileDetails = await this.prisma.googleProfileDetailsModel.create({
          data: { consumerId: consumer.id, ...googleProfileDetailsInstance },
        });
        if (googleProfileDetails.deletedAt != null) throw new BadRequestException(errorCodes.PROFILE_SUSPENDED);

        // await this.mailingService.sendConsumerTemporaryPasswordForGoogleOAuth({ email: consumer.email });
      }

      // const access = await this.getAccessAndRefreshToken(consumer.id)

      return consumer;
    } catch (error) {
      this.logger.warn(`ConsumerAuth: Google OAuth failed`, {
        message: error instanceof Error ? error.message : `Unknown`,
      });
      throw new InternalServerErrorException();
    }
  }

  async findConsumerByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async login(body: LoginBody, ctx?: LoginContext) {
    const email = body.email?.trim()?.toLowerCase() ?? ``;
    await this.authAudit.checkLockoutAndRateLimit(AUTH_IDENTITY_TYPES.consumer, email);

    const identity = await this.prisma.consumerModel.findFirst({
      where: { email, deletedAt: null },
    });
    if (!identity) throw new UnauthorizedException(errorCodes.INVALID_CREDENTIALS);

    const valid = await passwordUtils.verifyPassword({
      password: body.password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });

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

    const access = await this.getAccessAndRefreshToken(identity.id);
    return { identity, ...access };
  }

  async refreshAccess(refreshToken: string) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
    } catch {
      this.logger.warn(`ConsumerAuth: refresh token verification failed`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const exist = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId: verified.identityId } });
    if (exist == null) {
      this.logger.warn(`ConsumerAuth: no identity record for refresh`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }
    if (!secureCompare(exist.refreshToken, refreshToken)) {
      this.logger.warn(`ConsumerAuth: refresh token mismatch`);
      throw new UnauthorizedException(errorCodes.INVALID_REFRESH_TOKEN);
    }

    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: verified.identityId } });
    if (!consumer) {
      this.logger.warn(`ConsumerAuth: consumer not found for identity`);
      throw new BadRequestException(errorCodes.NO_IDENTITY_RECORD);
    }
    const access = await this.getAccessAndRefreshToken(consumer.id);
    return Object.assign(consumer, access);
  }

  async revokeSessionByRefreshToken(refreshToken?: string | null) {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
      await this.prisma.accessRefreshTokenModel.deleteMany({
        where: { identityId: verified.identityId, refreshToken },
      });
    } catch {
      // ignore invalid token during logout
    }
  }

  async revokeSessionByRefreshTokenAndAudit(refreshToken?: string | null, ctx?: LoginContext): Promise<void> {
    if (!refreshToken) return;
    try {
      const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
      const consumer = await this.prisma.consumerModel.findFirst({
        where: { id: verified.identityId, deletedAt: null },
      });
      await this.revokeSessionByRefreshToken(refreshToken);
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
      await this.revokeSessionByRefreshToken(refreshToken);
    }
  }

  async issueTokensForConsumer(identityId: ConsumerModel[`id`]) {
    return this.getAccessAndRefreshToken(identityId);
  }

  async createOAuthExchangeToken(identityId: ConsumerModel[`id`]) {
    const payload: OAuthExchangePayload = {
      type: ConsumerAuthService.oauthExchangeTokenType,
      identityId,
      createdAt: Date.now(),
    };
    return this.jwtService.signAsync(payload, { expiresIn: `2m` });
  }

  async verifyOAuthExchangeToken(token: string) {
    let decoded: OAuthExchangePayload;
    try {
      decoded = this.jwtService.verify(token) as OAuthExchangePayload;
    } catch {
      this.logger.warn(`ConsumerAuth: OAuth exchange token verification failed`);
      throw new UnauthorizedException(errorCodes.INVALID_OAUTH_EXCHANGE_TOKEN);
    }
    if (!decoded || decoded.type !== ConsumerAuthService.oauthExchangeTokenType || !decoded.identityId) {
      throw new UnauthorizedException(errorCodes.INVALID_OAUTH_EXCHANGE_TOKEN);
    }
    return decoded;
  }

  async createGoogleSignupToken(payload: {
    email?: string | null;
    emailVerified?: boolean;
    name?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    picture?: string | null;
    organization?: string | null;
    sub?: string | null;
  }) {
    const tokenPayload = this.toGoogleSignupPayload(payload);
    return this.jwtService.signAsync(tokenPayload, { expiresIn: `10m` });
  }

  async verifyGoogleSignupToken(token: string) {
    let decoded: GoogleSignupPayload;
    try {
      decoded = this.jwtService.verify(token) as GoogleSignupPayload;
    } catch {
      this.logger.warn(`ConsumerAuth: Google signup token verification failed`);
      throw new BadRequestException(errorCodes.INVALID_GOOGLE_SIGNUP_TOKEN);
    }
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

  private extractConsumerFromGoogleProfile(dto: CONSUMER.CreateGoogleProfileDetails) {
    const { name, email, givenName, familyName } = dto;

    const [fullNameFirstName, fullNameLastName] = name.split(` `);
    const firstName = givenName || fullNameFirstName;
    const lastName = familyName || fullNameLastName;

    return { email, firstName, lastName };
  }

  async signupVerification(token: string, res: express.Response, referer) {
    const decoded: any = this.jwtService.decode(token);
    const redirectUrl = new URL(`signup/verification`, referer);
    const identity = await this.prisma.consumerModel.findFirst({
      where: { id: decoded.identityId, deletedAt: null },
    });

    if (identity?.email) {
      redirectUrl.searchParams.append(`email`, identity.email);

      const updated = await this.prisma.consumerModel.update({
        where: { id: identity.id },
        data: { verified: true },
      });
      redirectUrl.searchParams.append(`verified`, !updated || updated.verified == false ? `no` : `yes`);
    }

    res.redirect(redirectUrl.toString());
  }

  async checkEmailAndSendRecoveryLink(body: Pick<IChangePasswordBody, `email`>, referer: string) {
    if (body.email == null) throw new BadRequestException(errorCodes.EMAIL_REQUIRED);

    const consumer = await this.prisma.consumerModel.findFirst({ where: { email: body.email } });
    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_FOR_EMAIL);

    const found = await this.prisma.resetPasswordModel.findFirst({ where: { consumerId: consumer.id } });
    const oneTimeAccessToken = await this.getAccessToken(consumer.id);
    const expiredAt = new Date(Date.now() + HOURS_24MS);
    const resetPasswordData = { consumerId: consumer.id, token: oneTimeAccessToken, expiredAt };
    let record: ResetPasswordModel;
    if (!found) record = await this.prisma.resetPasswordModel.create({ data: resetPasswordData });
    else record = await this.prisma.resetPasswordModel.update({ where: { id: found.id }, data: resetPasswordData });

    const forgotPasswordLink = new URL(`change-password`, referer);
    forgotPasswordLink.searchParams.append(`token`, record.token);
    this.mailingService.sendForgotPasswordEmail({
      forgotPasswordLink: forgotPasswordLink.toString(),
      email: consumer.email,
    });
  }

  async changePassword(body: Pick<IChangePasswordBody, `password`>, param: IChangePasswordParam) {
    if (param.token == null) throw new BadRequestException(errorCodes.TOKEN_REQUIRED);
    if (body.password == null) throw new BadRequestException(errorCodes.PASSWORD_REQUIRED);

    const verified = await this.verifyChangePasswordFlowToken(param.token);
    const { salt, hash } = await passwordUtils.hashPassword(body.password);
    await this.prisma.consumerModel.update({
      where: { id: verified.identityId },
      data: { salt, password: hash },
    });
    await this.prisma.resetPasswordModel.deleteMany({ where: { consumerId: verified.identityId } });
    return true;
  }

  private async getAccessAndRefreshToken(identityId: ConsumerModel[`id`]) {
    const accessToken = await this.getAccessToken(identityId);
    const refreshToken = await this.getRefreshToken(identityId);
    const found = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId } });

    const data = { accessToken, refreshToken };
    if (!found) await this.prisma.accessRefreshTokenModel.create({ data: { ...data, identityId } });
    else await this.prisma.accessRefreshTokenModel.update({ where: { id: found.id }, data });

    return data;
  }

  private getAccessToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `access` }, { expiresIn: JWT_ACCESS_TTL_SECONDS });
  }

  private getRefreshToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `refresh` }, { expiresIn: JWT_REFRESH_TTL_SECONDS });
  }

  private async verifyChangePasswordFlowToken(token: string) {
    let verified: IJwtTokenPayload;
    try {
      verified = this.jwtService.verify<IJwtTokenPayload>(token);
    } catch {
      this.logger.warn(`ConsumerAuth: change-password token verification failed`);
      throw new UnauthorizedException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);
    }
    if (!verified?.identityId) throw new UnauthorizedException(errorCodes.INVALID_CHANGE_PASSWORD_TOKEN);

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { email: verified.email, id: verified.identityId },
    });
    if (consumer == null) throw new UnauthorizedException(errorCodes.CONSUMER_NOT_FOUND_CHANGE_PASSWORD);

    const record = this.prisma.resetPasswordModel.findFirst({
      where: { consumerId: consumer.id, token, expiredAt: { gte: new Date() } },
    });
    if (record == null) throw new NotFoundException(errorCodes.CHANGE_PASSWORD_FLOW_EXPIRED);

    return verified;
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, referer: string) {
    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE);
    const token = await this.getAccessToken(consumer.id);
    this.mailingService.sendConsumerSignupVerificationEmail({ email: consumer.email, token, referer });
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

    // Note: With soft-delete uniqueness including deletedAt,
    // soft-deleted consumers can have their email re-used for new registrations

    let hash: string | null = null;
    let salt: string | null = null;
    if (!googleSignupPayload) {
      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException(errorCodes.PASSWORD_REQUIREMENTS);
      }
      const hashed = await passwordUtils.hashPassword(dto.password);
      hash = hashed.hash;
      salt = hashed.salt;
    }

    try {
      let personalDetails;
      if (dto.personalDetails) {
        personalDetails = {
          create: {
            legalStatus: dto.personalDetails.legalStatus ?? null,
            citizenOf: dto.personalDetails.citizenOf,
            dateOfBirth: new Date(dto.personalDetails.dateOfBirth),
            passportOrIdNumber: dto.personalDetails.passportOrIdNumber,
            countryOfTaxResidence: dto.personalDetails.countryOfTaxResidence ?? null,
            taxId: dto.personalDetails.taxId ?? null,
            phoneNumber: dto.personalDetails.phoneNumber ?? null,
            firstName: dto.personalDetails.firstName ?? null,
            lastName: dto.personalDetails.lastName ?? null,
          },
        };
      }

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
        // unique constraint violation (email)
        throw new ConflictException(errorCodes.EMAIL_ALREADY_REGISTERED_PRISMA);
      }
      throw err;
    }
  }

  /**
   * Enforce combinations of accountType / contractorKind
   * and required nested blocks.
   */
  private ensureBusinessRules(dto: ConsumerSignup) {
    if (dto.accountType === $Enums.AccountType.CONTRACTOR && !dto.contractorKind) {
      throw new BadRequestException(errorCodes.CONTRACTOR_KIND_REQUIRED);
    }

    if (dto.accountType === $Enums.AccountType.BUSINESS && dto.contractorKind !== undefined) {
      throw new BadRequestException(errorCodes.CONTRACTOR_KIND_NOT_FOR_BUSINESS);
    }

    // CONTRACTOR + INDIVIDUAL → personal required
    if (
      dto.accountType === $Enums.AccountType.CONTRACTOR &&
      dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL &&
      !dto.personalDetails
    ) {
      throw new BadRequestException(errorCodes.PERSONAL_DETAILS_REQUIRED);
    }

    // BUSINESS or CONTRACTOR + ENTITY → organization required
    if (
      (dto.accountType === $Enums.AccountType.BUSINESS ||
        (dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.ENTITY)) &&
      !dto.organizationDetails
    ) {
      throw new BadRequestException(errorCodes.ORGANIZATION_DETAILS_REQUIRED);
    }
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
