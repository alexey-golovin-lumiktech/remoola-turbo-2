import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import * as uuid from 'uuid'

import { constants } from '../../constants'
import { ICredentials, ISignup } from '../../dtos'
import { GoogleProfile, IGoogleSignin, ISigninResponse } from '../../dtos/consumer'
import { IBaseModel, IConsumerModel } from '../../models'
import { MailingService } from '../../shared-modules/mailing/mailing.service'
import * as utils from '../../utils'
import { ConsumersService } from '../entities/consumers/consumers.service'
import { GoogleProfilesService } from '../entities/google-profiles/google-profiles.service'

@Injectable()
export class AuthService {
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

  /* OK !!! */ async googleSignin(body: IGoogleSignin): Promise<ISigninResponse> {
    try {
      const verified = await this.oAuth2Client.verifyIdToken({ idToken: body.credential })
      const rawGoogleProfile = new GoogleProfile(verified.getPayload())
      const consumer = await this.consumersService.upsertConsumer(this.extractConsumerData(rawGoogleProfile))
      if (consumer.deletedAt != null) throw new BadRequestException(`Consumer is suspended, please contact the support`)

      const gProfile = await this.googleProfileService.upsertGoogleProfile(consumer.id, rawGoogleProfile)
      if (gProfile.deletedAt != null) throw new BadRequestException(`Profile is suspended, please contact the support`)

      this.consumersService.repository.updateById(consumer.id, { googleProfileId: gProfile.id })
      const accessToken = this.generateToken(consumer)
      return Object.assign(consumer, { googleProfileId: gProfile.id, accessToken, refreshToken: null })
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async signin(body: ICredentials): Promise<ISigninResponse> {
    try {
      const [consumer] = await this.consumersService.repository.find({ filter: { email: body.email } })
      if (!consumer) throw new NotFoundException({ message: constants.NOT_FOUND })
      if (!consumer.password && !consumer.salt) throw new BadRequestException({ message: constants.PASSWORD_NOT_SET_YET })

      const params = { incomingPass: body.password, password: consumer.password, salt: consumer.salt }
      const isValidPassword = await utils.validatePassword(params)
      if (!isValidPassword) throw new BadRequestException({ message: constants.INVALID_PASSWORD })

      const accessToken = this.generateToken(consumer)
      const refreshToken = this.generateRefreshToken() //@TODO : need to store refresh token
      return Object.assign(consumer, { accessToken, refreshToken: refreshToken.token })
    } catch (error) {
      const message = error.message ?? `Internal error`
      const status = error.status ?? HttpStatus.INTERNAL_SERVER_ERROR
      throw new HttpException(message, status)
    }
  }

  private extractConsumerData(dto: GoogleProfile): Omit<IConsumerModel, keyof IBaseModel> {
    const fullName = dto.name.split(` `)
    return {
      email: dto.email,
      verified: dto.emailVerified,
      firstName: dto.givenName || fullName[0],
      lastName: dto.familyName || fullName[1],

      password: null,
      salt: null,
      middleName: null,
      googleProfileId: null,
    }
  }

  async signup(body: ISignup): Promise<void | never> {
    const { email, password, firstName, lastName, middleName } = body
    const [exist] = await this.consumersService.repository.find({ filter: { email } })
    if (exist) throw new BadRequestException(`This email is already exist`)
    const salt = utils.generatePasswordHashSalt()
    const hash = utils.generatePasswordHash({ password, salt })
    await this.consumersService.repository.create({ email, firstName, lastName, middleName, password: hash, salt })
    const token = this.generateToken({ email })
    this.mailingService.sendConsumerSignupCompletion({ email, token })
  }

  async signupCompletion(token: string, res: Response) {
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
    const payload = { email: consumer.email, ...((consumer as IConsumerModel).id && { consumerId: (consumer as IConsumerModel).id }) }
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
