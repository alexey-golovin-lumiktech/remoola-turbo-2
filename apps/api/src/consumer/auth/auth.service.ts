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
import { envs, HOURS_24MS } from '../../envs';
import { MailingService } from '../../shared/mailing.service';
import { PrismaService } from '../../shared/prisma.service';
import { type IChangePasswordBody, type IChangePasswordParam, passwordUtils } from '../../shared-common';

@Injectable()
export class ConsumerAuthService {
  private readonly logger = new Logger(ConsumerAuthService.name);
  private readonly oAuth2Client: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
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
        if (consumer.deletedAt != null)
          throw new BadRequestException(`ConsumerModel is suspended, please contact the support`);

        const googleProfileDetails = await this.prisma.googleProfileDetailsModel.create({
          data: { consumerId: consumer.id, ...googleProfileDetailsInstance },
        });
        if (googleProfileDetails.deletedAt != null)
          throw new BadRequestException(`Profile is suspended, please contact the support`);

        // await this.mailingService.sendConsumerTemporaryPasswordForGoogleOAuth({ email: consumer.email });
      }

      // const access = await this.getAccessAndRefreshToken(consumer.id)

      return consumer;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async findConsumerByEmail(email: string) {
    return this.prisma.consumerModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async login(body: LoginBody) {
    const identity = await this.prisma.consumerModel.findFirst({
      where: { email: body.email, deletedAt: null },
    });
    if (!identity) throw new UnauthorizedException(`Invalid credentials`);

    const valid = await passwordUtils.verifyPassword({
      password: body.password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });
    if (!valid) throw new UnauthorizedException(`Invalid credentials`);

    const access = await this.getAccessAndRefreshToken(identity.id);
    return { identity, ...access };
  }

  async refreshAccess(refreshToken: string) {
    const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
    const exist = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId: verified.identityId } });
    if (exist == null) throw new BadRequestException(`no identity record`);

    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: verified.identityId } });
    const access = await this.getAccessAndRefreshToken(consumer.id);
    return Object.assign(consumer, access);
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
    const decoded = this.jwtService.verify(token) as OAuthExchangePayload;
    if (!decoded || decoded.type !== ConsumerAuthService.oauthExchangeTokenType || !decoded.identityId) {
      throw new UnauthorizedException(`Invalid OAuth exchange token`);
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
    const decoded = this.jwtService.verify(token) as GoogleSignupPayload;
    if (decoded?.type !== ConsumerAuthService.googleSignupTokenType) {
      throw new BadRequestException(`Invalid Google signup token`);
    }
    if (!decoded.email) {
      throw new BadRequestException(`Google signup token missing email`);
    }
    if (!decoded.emailVerified) {
      throw new BadRequestException(`Google email is not verified`);
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
    if (body.email == null) throw new BadRequestException(`Email is required`);

    const consumer = await this.prisma.consumerModel.findFirst({ where: { email: body.email } });
    if (!consumer) throw new BadRequestException(`Not found any consumer for email: ${body.email}`);

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
    if (param.token == null) throw new BadRequestException(`Token is required`);
    if (body.password == null) throw new BadRequestException(`Password is required`);

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
    return this.jwtService //
      .signAsync({ identityId, type: `access` }, { expiresIn: 86400 }); //86400 ~ 24hrs in milliseconds
  }

  private getRefreshToken(identityId: string) {
    return this.jwtService //
      .signAsync({ identityId, type: `refresh` }, { expiresIn: 604800 }); //604800 ~ 7days in seconds
  }

  private async verifyChangePasswordFlowToken(token) {
    const verified = this.jwtService.verify<IJwtTokenPayload>(token);
    if (!verified) throw new UnauthorizedException(`[verifyChangePasswordFlowToken] Invalid token`);

    const consumer = await this.prisma.consumerModel.findFirst({
      where: { email: verified.email, id: verified.identityId },
    });
    if (consumer == null) throw new UnauthorizedException(`ConsumerModel not found`);

    const record = this.prisma.resetPasswordModel.findFirst({
      where: { consumerId: consumer.id, token, expiredAt: { gte: new Date() } },
    });
    if (record == null) throw new NotFoundException(`Change password flow is expired or not initialized`);

    return verified;
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, referer: string) {
    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`);
    const token = await this.getAccessToken(consumer.id);
    this.mailingService.sendConsumerSignupVerificationEmail({ email: consumer.email, token, referer });
  }

  async signup(dto: ConsumerSignup, googleSignupPayload?: GoogleSignupPayload) {
    this.ensureBusinessRules(dto);

    const email = (googleSignupPayload?.email ?? dto.email).toLowerCase();
    if (googleSignupPayload && dto.email && dto.email.toLowerCase() !== email) {
      throw new BadRequestException(`Email does not match Google account`);
    }

    const existing = await this.prisma.consumerModel.findFirst({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(`Email is already registered`);
    }

    // Note: With soft-delete uniqueness including deletedAt,
    // soft-deleted consumers can have their email re-used for new registrations

    let hash: string | null = null;
    let salt: string | null = null;
    if (!googleSignupPayload) {
      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException(`Password is required and must be at least 8 characters`);
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
        throw new ConflictException(`Email is already registered`);
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
      throw new BadRequestException(`contractorKind is required for CONTRACTOR accountType`);
    }

    if (dto.accountType === $Enums.AccountType.BUSINESS && dto.contractorKind !== undefined) {
      throw new BadRequestException(`contractorKind must not be provided for BUSINESS accountType`);
    }

    // CONTRACTOR + INDIVIDUAL → personal required
    if (
      dto.accountType === $Enums.AccountType.CONTRACTOR &&
      dto.contractorKind === $Enums.ContractorKind.INDIVIDUAL &&
      !dto.personalDetails
    ) {
      throw new BadRequestException(`personal details are required for INDIVIDUAL contractor`);
    }

    // BUSINESS or CONTRACTOR + ENTITY → organization required
    if (
      (dto.accountType === $Enums.AccountType.BUSINESS ||
        (dto.accountType === $Enums.AccountType.CONTRACTOR && dto.contractorKind === $Enums.ContractorKind.ENTITY)) &&
      !dto.organizationDetails
    ) {
      throw new BadRequestException(`organization details are required for BUSINESS and ENTITY contractor`);
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
