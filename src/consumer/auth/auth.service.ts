import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Response as IExpressResponse } from 'express'
import { OAuth2Client } from 'google-auth-library'
import * as uuid from 'uuid'

import { HowDidHearAboutUs } from '@wirebill/shared-common/enums'
import { IBaseModel, IConsumerModel } from '@wirebill/shared-common/models'

import { MailingService } from '../../common-shared-modules/mailing/mailing.service'
import { CONSUMER } from '../../dtos'
import * as utils from '../../utils'
import { ConsumerService } from '../entities/consumer/consumer.service'
import { GoogleProfileDetailsService } from '../entities/google-profile-details/google-profile-details.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly oAuth2Client: OAuth2Client
  private readonly audience: string

  constructor(
    @Inject(ConsumerService) private readonly service: ConsumerService,
    @Inject(GoogleProfileDetailsService) private readonly googleProfileService: GoogleProfileDetailsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailingService: MailingService,
  ) {
    const secret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    this.audience = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    this.oAuth2Client = new OAuth2Client(this.audience, secret)
  }

  async googleOAuth(body: CONSUMER.GoogleSignin): Promise<CONSUMER.LoginResponse> {
    try {
      const { credential, contractorKind = null, accountType = null } = body
      const verified = await this.oAuth2Client.verifyIdToken({ idToken: credential })
      const rawGoogleProfile = new CONSUMER.CreateGoogleProfileDetails(verified.getPayload())

      const consumerData = this.extractConsumerData(rawGoogleProfile)
      const [exist] = await this.service.repository.find({ filter: { email: consumerData.email } })

      const temporaryGeneratedStrongPassword = utils.generateStrongPassword()
      const salt = utils.generatePasswordHashSalt()
      const hash = utils.generatePasswordHash({ password: temporaryGeneratedStrongPassword, salt })
      const consumer = exist ?? (await this.service.upsert({ ...consumerData, password: hash, salt, accountType, contractorKind }))
      if (consumer.deletedAt != null) throw new BadRequestException(`Consumer is suspended, please contact the support`)

      const googleProfile = await this.googleProfileService.upsert(consumer.id, rawGoogleProfile)
      if (googleProfile.deletedAt != null) throw new BadRequestException(`Profile is suspended, please contact the support`)

      await this.mailingService.sendConsumerTemporaryPasswordForGoogleOAuth({ email: consumer.email, temporaryGeneratedStrongPassword })
      const accessToken = this.generateToken(consumer)
      const { token: refreshToken } = this.generateRefreshToken() //@TODO: need to store refresh token
      return Object.assign(consumer, { googleProfileId: googleProfile.id, accessToken, refreshToken })
    } catch (error) {
      this.logger.error(error)
      throw new InternalServerErrorException()
    }
  }

  async login(consumerIdentity: IConsumerModel): Promise<CONSUMER.LoginResponse> {
    const accessToken = this.generateToken(consumerIdentity)
    const refreshToken = this.generateRefreshToken() //@TODO: need to store refresh token
    return utils.toResponse(CONSUMER.LoginResponse, Object.assign(consumerIdentity, { accessToken, refreshToken: refreshToken.token }))
  }

  private extractConsumerData(
    dto: CONSUMER.CreateGoogleProfileDetails,
  ): Omit<IConsumerModel, keyof IBaseModel | `accountType` | `contractorKind` | `password` | `salt`> {
    const fullName = dto.name.split(` `)

    return {
      email: dto.email,
      verified: dto.emailVerified,
      legalVerified: false, //@TODO: should be "true" only when users who have provided documents for bank transfer
      howDidHearAboutUs: HowDidHearAboutUs.Google, //@TODO: random
      firstName: dto.givenName || fullName[0],
      lastName: dto.familyName || fullName[1],
    }
  }

  async signup(body: CONSUMER.SignupRequest): Promise<CONSUMER.ConsumerResponse | never> {
    const [exist] = await this.service.repository.find({ filter: { email: body.email } })
    if (exist) throw new BadRequestException(`This email is already exist`)

    const salt = utils.generatePasswordHashSalt()
    const hash = utils.generatePasswordHash({ password: body.password, salt })
    const consumer = await this.service.upsert({
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

  async completeProfileCreation(consumerId: string): Promise<void | never> {
    const consumer = await this.service.getById(consumerId)
    if (!consumer) throw new BadRequestException(`No consumer for provided consumerId: ${consumerId}`)
    const token = this.generateToken(consumer)
    this.mailingService.sendConsumerSignupCompletionEmail({ email: consumer.email, token })
  }

  async signupVerification(token: string, res: IExpressResponse) {
    const decoded: any = this.jwtService.decode(token)
    const redirectUrl = new URL(`signup/verification`, `http://localhost:3000`)

    if (decoded.email) {
      redirectUrl.searchParams.append(`email`, decoded.email)

      const [updated] = await this.service.repository.update({ email: decoded.email }, { verified: true })
      redirectUrl.searchParams.append(`verified`, !updated || updated.verified == false ? `no` : `yes`)
    }

    res.redirect(redirectUrl.toString())
  }

  private generateToken(consumer: IConsumerModel | { email: string }): string {
    const payload = { email: consumer.email, ...((consumer as IConsumerModel).id && { identityId: (consumer as IConsumerModel).id }) }
    const options = {
      secret: this.configService.get<string>(`JWT_SECRET`),
      expiresIn: this.configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`),
    }
    return this.jwtService.sign(payload, options)
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
