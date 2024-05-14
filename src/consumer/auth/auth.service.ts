import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import express from 'express'
import { OAuth2Client } from 'google-auth-library'

import { IChangePasswordBody, IChangePasswordParam, IConsumerCreate } from '@wirebill/shared-common/dtos'
import { IConsumerModel } from '@wirebill/shared-common/models'

import { MailingService } from '@-/common-shared-modules/mailing/mailing.service'
import { commonUtils } from '@-/common-utils'
import { CONSUMER } from '@-/dtos'
import { IJwtTokenPayload } from '@-/dtos/consumer'
import { AccessRefreshTokenRepository } from '@-/repositories'

import { ConsumerService } from '../entities/consumer/consumer.service'
import { GoogleProfileDetailsService } from '../entities/google-profile-details/google-profile-details.service'
import { ResetPasswordService } from '../entities/reset-password/reset-password.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly oAuth2Client: OAuth2Client

  constructor(
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
    @Inject(GoogleProfileDetailsService) private readonly googleProfileDetailsService: GoogleProfileDetailsService,
    @Inject(ResetPasswordService) private readonly resetPasswordService: ResetPasswordService,
    @Inject(AccessRefreshTokenRepository) private readonly accessRefreshTokenRepository: AccessRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailingService: MailingService,
  ) {
    const googleClientSecret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    const googleClientId = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    this.oAuth2Client = new OAuth2Client(googleClientId, googleClientSecret)
  }

  async googleOAuth(body: CONSUMER.GoogleSignin): Promise<CONSUMER.LoginResponse> {
    try {
      const { credential, contractorKind = null, accountType = null } = body
      const verified = await this.oAuth2Client.verifyIdToken({ idToken: credential })
      const rawGoogleProfile = new CONSUMER.CreateGoogleProfileDetails(verified.getPayload())

      const consumerData = this.extractConsumerFromGoogleProfile(rawGoogleProfile)
      let consumer = await this.consumerService.repository.findOne({ email: consumerData.email })

      if (!consumer) {
        consumer = await this.consumerService.upsert({ ...consumerData, accountType, contractorKind })
        if (consumer.deletedAt != null) throw new BadRequestException(`Consumer is suspended, please contact the support`)

        const googleProfileDetails = await this.googleProfileDetailsService.upsert(consumer.id, rawGoogleProfile)
        if (googleProfileDetails.deletedAt != null) throw new BadRequestException(`Profile is suspended, please contact the support`)

        await this.mailingService.sendConsumerTemporaryPasswordForGoogleOAuth({ email: consumer.email })
      }

      const access = await this.getAccessAndRefreshToken(consumer.id)

      return commonUtils.convertPlainToClassInstance(CONSUMER.LoginResponse, Object.assign(consumer, access))
    } catch (error) {
      this.logger.error(error)
      throw new InternalServerErrorException()
    }
  }

  async login(identity: IConsumerModel): Promise<CONSUMER.LoginResponse> {
    const access = await this.getAccessAndRefreshToken(identity.id)
    return commonUtils.convertPlainToClassInstance(CONSUMER.LoginResponse, Object.assign(identity, access))
  }

  async refreshAccess(refreshToken: string): Promise<CONSUMER.LoginResponse> {
    const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken)
    const exist = await this.accessRefreshTokenRepository.findOne({ identityId: verified.identityId })
    if (exist == null) throw new BadRequestException(`no identity record`)
    if (exist.refreshToken != refreshToken) throw new BadRequestException(`provided refresh token is not valid`)

    const consumer = await this.consumerService.repository.findById(verified.identityId)
    const access = await this.getAccessAndRefreshToken(consumer.id)
    return commonUtils.convertPlainToClassInstance(CONSUMER.LoginResponse, Object.assign(consumer, access))
  }

  private extractConsumerFromGoogleProfile(dto: CONSUMER.CreateGoogleProfileDetails): Omit<IConsumerCreate, `verified` | `legalVerified`> {
    const { name, email, givenName, familyName } = dto

    const [fullNameFirstName, fullNameLastName] = name.split(` `)
    const firstName = givenName || fullNameFirstName
    const lastName = familyName || fullNameLastName

    return { email, firstName, lastName }
  }

  async signup(body: CONSUMER.SignupRequest): Promise<CONSUMER.ConsumerResponse | never> {
    const exist = await this.consumerService.repository.findOne({ email: body.email })
    if (exist) throw new BadRequestException(`This email is already exist`)

    const salt = commonUtils.getHashingSalt()
    const hash = commonUtils.hashPassword({ password: body.password, salt })
    const consumer = await this.consumerService.upsert({
      accountType: body.accountType,
      contractorKind: body.contractorKind,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      password: hash,
      salt,
    })

    return consumer
  }

  async completeProfileCreation(consumerId: string, referer: string): Promise<void | never> {
    const consumer = await this.consumerService.getById(consumerId)
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`)
    const token = await this.getAccessToken(consumer.id)
    this.mailingService.sendConsumerSignupCompletionEmail({ email: consumer.email, token, referer })
  }

  async signupVerification(token: string, res: express.Response, referer) {
    const decoded: any = this.jwtService.decode(token)
    const redirectUrl = new URL(`signup/verification`, referer)

    if (decoded.email) {
      redirectUrl.searchParams.append(`email`, decoded.email)

      const [updated] = await this.consumerService.repository.update({ email: decoded.email }, { verified: true })
      redirectUrl.searchParams.append(`verified`, !updated || updated.verified == false ? `no` : `yes`)
    }

    res.redirect(redirectUrl.toString())
  }

  async checkEmailAndSendRecoveryLink(body: Pick<IChangePasswordBody, `email`>, referer: string): Promise<void> {
    if (body.email == null) throw new BadRequestException(`Email is required`)

    const consumer = await this.consumerService.repository.findOne({ email: body.email })
    if (!consumer) throw new BadRequestException(`Not found any consumer for email: ${body.email}`)

    const token = await this.getAccessToken(consumer.id)
    const record = await this.resetPasswordService.upsert({ token, consumerId: consumer.id })
    const forgotPasswordLink = new URL(`change-password`, referer)
    forgotPasswordLink.searchParams.append(`token`, record.token)
    this.mailingService.sendForgotPasswordEmail({ forgotPasswordLink: forgotPasswordLink.toString(), email: consumer.email })
  }

  async changePassword(body: Pick<IChangePasswordBody, `password`>, param: IChangePasswordParam): Promise<unknown> {
    if (param.token == null) throw new BadRequestException(`Token is required`)
    if (body.password == null) throw new BadRequestException(`Password is required`)

    const verified = await this.verifyChangePasswordFlowToken(param.token)
    const salt = commonUtils.getHashingSalt()
    const hash = commonUtils.hashPassword({ password: body.password, salt })
    await this.consumerService.repository.updateById(verified.identityId, { salt, password: hash })
    await this.resetPasswordService.removeAllConsumerRecords(verified.identityId)
    return true
  }

  private async getAccessAndRefreshToken(
    identityId: IConsumerModel[`id`],
  ): Promise<Pick<CONSUMER.LoginResponse, `accessToken` | `refreshToken`>> {
    const accessToken = await this.getAccessToken(identityId)
    const refreshToken = await this.getRefreshToken(identityId)
    const saved = await this.accessRefreshTokenRepository.upsert({ accessToken, refreshToken, identityId })
    return { accessToken: saved.accessToken, refreshToken: saved.refreshToken }
  }

  private getAccessToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `access` }, { expiresIn: 86400 }) //86400 ~ 24hrs in milliseconds
  }

  private getRefreshToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `refresh` }, { expiresIn: 604800 }) //604800 ~ 7days in seconds
  }

  private async verifyChangePasswordFlowToken(token): Promise<IJwtTokenPayload> {
    const verified = this.jwtService.verify<IJwtTokenPayload>(token)
    if (!verified) throw new UnauthorizedException(`[verifyChangePasswordFlowToken] Invalid token`)

    const [consumer] = await this.consumerService.repository.find({ filter: { email: verified.email, id: verified.identityId } })
    if (consumer == null) throw new UnauthorizedException(`Consumer not found`)

    const record = await this.resetPasswordService.getRecordIfNotExpired({ token, consumerId: consumer.id })
    if (record == null) throw new NotFoundException(`Change password flow is expired or not initialized`)

    return verified
  }
}
