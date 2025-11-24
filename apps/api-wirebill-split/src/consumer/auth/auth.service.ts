import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';

import { type ConsumerModel, type ResetPasswordModel } from '@remoola/database';

import { CONSUMER } from '../../dtos';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { MailingService } from '../../shared/mailing.service';
import { PrismaService } from '../../shared/prisma.service';
import { IChangePasswordBody, IChangePasswordParam, passwordUtils } from '../../shared-common';

@Injectable()
export class ConsumerAuthService {
  private readonly logger = new Logger(ConsumerAuthService.name);
  private readonly oAuth2Client: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
  ) {
    this.oAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!);
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

  async login(identity: ConsumerModel) {
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

  private extractConsumerFromGoogleProfile(dto: CONSUMER.CreateGoogleProfileDetails) {
    const { name, email, givenName, familyName } = dto;

    const [fullNameFirstName, fullNameLastName] = name.split(` `);
    const firstName = givenName || fullNameFirstName;
    const lastName = familyName || fullNameLastName;

    return { email, firstName, lastName };
  }

  async signup(body: CONSUMER.SignupRequest) {
    const exist = await this.prisma.consumerModel.findFirst({ where: { email: body.email } });
    if (exist) throw new BadRequestException(`This email is already exist`);

    const { salt, hash } = await passwordUtils.hashPassword(body.password);

    return await this.prisma.consumerModel.create({
      data: { ...body, password: hash, salt },
    });
  }

  async completeProfileCreationAndSendVerificationEmail(consumerId: string, referer: string) {
    const consumer = await this.prisma.consumerModel.findFirst({ where: { id: consumerId } });
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`);
    const token = await this.getAccessToken(consumer.id);
    this.mailingService.sendConsumerSignupVerificationEmail({ email: consumer.email, token, referer });
  }

  async signupVerification(token: string, res: express.Response, referer) {
    const decoded: any = this.jwtService.decode(token);
    const redirectUrl = new URL(`signup/verification`, referer);
    const identity = await this.prisma.consumerModel.findFirst({ where: { id: decoded.identityId } });

    if (identity?.email) {
      redirectUrl.searchParams.append(`email`, identity.email);

      const updated = await this.prisma.consumerModel.update({
        where: { email: identity.email },
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
    const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
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
}
