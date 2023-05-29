import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Response as IExpressResponse } from 'express'
import { OAuth2Client } from 'google-auth-library'
import * as uuid from 'uuid'

import { CONSUMER } from '../../dtos'
import { IBaseModel, IConsumerModel } from '../../models'
import { MailingService } from '../../shared-modules/mailing/mailing.service'
import * as utils from '../../utils'
import { ConsumersService } from '../entities/consumers/consumer.service'
import { GoogleProfilesService } from '../entities/google-profiles/google-profiles.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly oAuth2Client: OAuth2Client
  private readonly audience: string

  constructor(
    @Inject(ConsumersService) private readonly consumersService: ConsumersService,
    @Inject(GoogleProfilesService) private readonly googleProfileService: GoogleProfilesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailingService: MailingService,
  ) {
    const secret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    this.audience = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    this.oAuth2Client = new OAuth2Client(this.audience, secret)
  }

  /* OK !!! */ async googleSignin(body: CONSUMER.GoogleSignin): Promise<CONSUMER.SigninResponse> {
    try {
      const verified = await this.oAuth2Client.verifyIdToken({ idToken: body.credential })
      const rawGoogleProfile = new CONSUMER.GoogleProfile(verified.getPayload())
      const consumer = await this.consumersService.upsertConsumer(this.extractConsumerData(rawGoogleProfile))
      if (consumer.deletedAt != null) throw new BadRequestException(`Consumer is suspended, please contact the support`)

      const gProfile = await this.googleProfileService.upsertGoogleProfile(consumer.id, rawGoogleProfile)
      if (gProfile.deletedAt != null) throw new BadRequestException(`Profile is suspended, please contact the support`)

      const accessToken = this.generateToken(consumer)
      const refreshToken = this.generateRefreshToken() //@TODO : need to store refresh token
      return utils.toResponse(CONSUMER.SigninResponse, Object.assign(consumer, { googleProfileId: gProfile.id, accessToken, refreshToken }))
    } catch (error) {
      this.logger.error(error)
      throw new InternalServerErrorException()
    }
  }

  async signin(identity: IConsumerModel): Promise<CONSUMER.SigninResponse> {
    const accessToken = this.generateToken(identity)
    const refreshToken = this.generateRefreshToken() //@TODO : need to store refresh token
    return utils.toResponse(CONSUMER.SigninResponse, Object.assign(identity, { accessToken, refreshToken: refreshToken.token }))
  }

  private extractConsumerData(dto: CONSUMER.GoogleProfile): Omit<IConsumerModel, keyof IBaseModel> {
    const fullName = dto.name.split(` `)
    return {
      email: dto.email,
      verified: dto.emailVerified,
      firstName: dto.givenName || fullName[0],
      lastName: dto.familyName || fullName[1],
    }
  }

  async signup(body: CONSUMER.SignupRequest): Promise<void | never> {
    const [exist] = await this.consumersService.repository.find({ filter: { email: body.email } })
    if (exist) throw new BadRequestException(`This email is already exist`)

    const salt = utils.generatePasswordHashSalt()
    const hash = utils.generatePasswordHash({ password: body.password, salt })
    const consumer = await this.consumersService.upsertConsumer({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      verified: false,
      password: hash,
      salt,
    })

    const token = this.generateToken(consumer)
    this.mailingService.sendConsumerSignupCompletionEmail({ email: body.email, token })
  }

  async signupCompletion(token: string, res: IExpressResponse) {
    const decoded: any = this.jwtService.decode(token)
    const redirectUrl = new URL(`signup/verification`, `http://localhost:3000`)

    if (decoded.email) {
      redirectUrl.searchParams.append(`email`, decoded.email)

      const [updated] = await this.consumersService.repository.update({ email: decoded.email }, { verified: true })
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
