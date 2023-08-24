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
import { IJwtTokenPayload } from 'src/dtos/consumer/jwt-payload.dto'
import * as uuid from 'uuid'

import { IChangePasswordBody, IChangePasswordParam } from '@wirebill/shared-common/dtos'
import { HowDidHearAboutUs } from '@wirebill/shared-common/enums'
import { IBaseModel, IConsumerModel } from '@wirebill/shared-common/models'

import { MailingService } from '../../common-shared-modules/mailing/mailing.service'
import { CONSUMER } from '../../dtos'
import * as utils from '../../utils'
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

      const consumerData = this.extractConsumerData(rawGoogleProfile)
      let consumer = await this.consumerService.repository.findOne({ email: consumerData.email })

      if (!consumer) {
        const temporaryGeneratedStrongPassword = utils.generateStrongPassword()
        const salt = utils.generatePasswordHashSalt()
        const hash = utils.generatePasswordHash({ password: temporaryGeneratedStrongPassword, salt })
        consumer = await this.consumerService.upsert({ ...consumerData, password: hash, salt, accountType, contractorKind })
        if (consumer.deletedAt != null) throw new BadRequestException(`Consumer is suspended, please contact the support`)

        const googleProfileDetails = await this.googleProfileDetailsService.upsert(consumer.id, rawGoogleProfile)
        if (googleProfileDetails.deletedAt != null) throw new BadRequestException(`Profile is suspended, please contact the support`)

        await this.mailingService.sendConsumerTemporaryPasswordForGoogleOAuth({ email: consumer.email, temporaryGeneratedStrongPassword })
        consumer.googleProfileDetailsId = googleProfileDetails.id
      }

      const accessToken = this.generateToken(consumer)
      const refreshToken = this.generateRefreshToken() //@IMPORTANT_NOTE: need to store refresh token
      return { ...consumer, accessToken, refreshToken: refreshToken.token }
    } catch (error) {
      this.logger.error(error)
      throw new InternalServerErrorException()
    }
  }

  async login(identity: IConsumerModel): Promise<CONSUMER.LoginResponse> {
    const accessToken = this.generateToken(identity)
    const refreshToken = this.generateRefreshToken() //@IMPORTANT_NOTE: need to store refresh token
    return utils.toResponse(CONSUMER.LoginResponse, Object.assign(identity, { accessToken, refreshToken: refreshToken.token }))
  }

  private extractConsumerData(
    dto: CONSUMER.CreateGoogleProfileDetails,
  ): Omit<IConsumerModel, keyof IBaseModel | `accountType` | `contractorKind` | `password` | `salt`> {
    const fullName = dto.name.split(` `)

    return {
      email: dto.email,
      verified: dto.emailVerified,
      legalVerified: false, //@IMPORTANT_NOTE: should be "true" only when users who have provided documents for bank transfer
      howDidHearAboutUs: HowDidHearAboutUs.Google, //@IMPORTANT_NOTE: random
      firstName: dto.givenName || fullName[0],
      lastName: dto.familyName || fullName[1],
    }
  }

  async signup(body: CONSUMER.SignupRequest): Promise<CONSUMER.ConsumerResponse | never> {
    const exist = await this.consumerService.repository.findOne({ email: body.email })
    if (exist) throw new BadRequestException(`This email is already exist`)

    const salt = utils.generatePasswordHashSalt()
    const hash = utils.generatePasswordHash({ password: body.password, salt })
    const consumer = await this.consumerService.upsert({
      accountType: body.accountType,
      contractorKind: body.contractorKind,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      verified: false,
      password: hash,
      salt,
    })

    return consumer
  }

  async completeProfileCreation(consumerId: string, referer: string): Promise<void | never> {
    const consumer = await this.consumerService.getById(consumerId)
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`)
    const token = this.generateToken(consumer)
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

    const record = await this.resetPasswordService.upsert({ token: this.generateToken(consumer), consumerId: consumer.id })
    const forgotPasswordLink = new URL(`change-password`, referer)
    forgotPasswordLink.searchParams.append(`token`, record.token)
    this.mailingService.sendForgotPasswordEmail({ forgotPasswordLink: forgotPasswordLink.toString(), email: consumer.email })
  }

  async changePassword(body: Pick<IChangePasswordBody, `password`>, param: IChangePasswordParam): Promise<unknown> {
    if (param.token == null) throw new BadRequestException(`Token is required`)
    if (body.password == null) throw new BadRequestException(`Password is required`)

    const verified = await this.verifyChangePasswordFlowToken(param.token)
    const salt = utils.generatePasswordHashSalt()
    const hash = utils.generatePasswordHash({ password: body.password, salt })
    await this.consumerService.repository.updateById(verified.identityId, { salt, password: hash })
    await this.resetPasswordService.removeAllConsumerRecords(verified.identityId)
    return true
  }

  private generateToken(consumer: Pick<IConsumerModel, `email` | `id`>): string {
    const payload: IJwtTokenPayload = { identityId: consumer.id, email: consumer.email }
    const options = {
      secret: this.configService.get<string>(`JWT_SECRET`),
      expiresIn: this.configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`),
    }
    return this.jwtService.sign(payload, options)
  }

  private async verifyChangePasswordFlowToken(token): Promise<IJwtTokenPayload> {
    const verified = await this.jwtService.verifyAsync<IJwtTokenPayload>(token)
    if (!verified) throw new UnauthorizedException(`Invalid token`)

    const [consumer] = await this.consumerService.repository.find({ filter: { email: verified.email, id: verified.identityId } })
    if (consumer == null) throw new UnauthorizedException(`Consumer not found`)

    const record = await this.resetPasswordService.getRecordIfNotExpired({ token, consumerId: consumer.id })
    if (record == null) throw new NotFoundException(`Change password flow is expired or not initialized`)

    return verified
  }

  private generateRefreshToken() {
    const payload = { tokenUuid: uuid.v4(), type: `refresh` }
    const options = {
      secret: this.configService.get<string>(`JWT_SECRET`),
      expiresIn: this.configService.get<string>(`JWT_REFRESH_TOKEN_EXPIRES_IN`),
    }
    return { tokenUuid: payload.tokenUuid, token: this.jwtService.sign(payload, options) }
  }
}
