import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Response } from 'express'
import { LoginTicket, OAuth2Client } from 'google-auth-library'

import { constants } from '../../constants'
import { ICredentials, ISignup } from '../../dtos'
import { GoogleProfile, IAccessConsumer, IGoogleLogin } from '../../dtos/consumer'
import { IConsumerModel } from '../../models'
import { MailingService } from '../../sharedModules/mailing/mailing.service'
import * as utils from '../../utils'
import { ConsumersService } from '../entities/consumers/consumers.service'
import { GoogleProfilesService } from '../entities/googleProfiles/googleProfiles.service'

@Injectable()
export class AuthService {
  private readonly oAuth2Client: OAuth2Client
  private readonly audience: string

  constructor(
    @Inject(ConsumersService) private readonly consumersService: ConsumersService,
    @Inject(GoogleProfilesService) private readonly googleProfileService: GoogleProfilesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailingService: MailingService
  ) {
    const secret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    this.audience = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    this.oAuth2Client = new OAuth2Client(this.audience, secret)
  }

  async validateConsumerCredentials(email: string, password: string): Promise<IConsumerModel | null> {
    const [consumer] = await this.consumersService.repository.find({ filter: { email, deletedAt: null } })

    if (consumer) {
      const hash = utils.generatePasswordHash({ password, salt: consumer.salt })
      if (hash == consumer.password) return consumer
    }

    return null
  }

  getRandomPassword(): Promise<string> {
    const getPassword = async () => {
      const password = utils.generateStrongPassword()
      const salt = utils.generatePasswordHashSalt(10)
      const hash = utils.generatePasswordHash({ password, salt })
      const exist = await this.consumersService.repository.find({ filter: { password: hash } })
      return exist.length > 0 ? getPassword() : password
    }
    return getPassword()
  }

  async login(body: ICredentials): Promise<IAccessConsumer> {
    try {
      const consumer = await this.consumersService.findByEmail(body.email)
      if (!consumer) throw new NotFoundException({ message: constants.NOT_FOUND })

      const verified = await utils.validatePassword({ incomingPass: body.password, password: consumer.password, salt: consumer.salt })
      if (!verified) throw new BadRequestException({ message: constants.INVALID_PASSWORD })

      const accessToken = this.generateToken(consumer)
      return { accessToken, refreshToken: null }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async googleLogin(body: IGoogleLogin): Promise<IAccessConsumer> {
    try {
      const verified = await this.verifyIdToken(body.credential)
      const consumerId: string = verified.getUserId()
      const googleProfile = new GoogleProfile(consumerId, verified.getPayload())

      let consumer = await this.consumersService.findByEmail(googleProfile.email)
      if (!consumer) {
        const { email, emailVerified: verified } = googleProfile
        let firstName = googleProfile.givenName
        let lastName = googleProfile.familyName
        if (googleProfile.name && (!firstName || !lastName)) {
          const splitted = googleProfile.name.split(` `)
          firstName = splitted[0]
          lastName = splitted[1]
        }

        Object.assign(googleProfile, { data: JSON.stringify(googleProfile) })
        const profile = await this.googleProfileService.repository.create(googleProfile)

        //@IMPORTANT: we need to gen rand password + salt
        // for consumer
        // and in next time consumer should do remember password

        consumer = await this.consumersService.repository.create({
          email,
          verified,
          firstName,
          lastName,
          googleProfileId: profile.id,
          password: ``, //@TODO: needs to discuss
          salt: `` //@TODO: needs to discuss
        })
      }

      const accessToken = this.generateToken(consumer)
      return { accessToken, refreshToken: null }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async signup(body: ISignup): Promise<void | never> {
    const { email, password, firstName, lastName, middleName } = body
    const exist = await this.consumersService.findByEmail(email)
    if (exist) throw new BadRequestException(`This email is already exist`)
    const salt = utils.generatePasswordHashSalt()
    const hash = utils.generatePasswordHash({ password, salt })
    await this.consumersService.repository.create({ email, firstName, lastName, middleName, password: hash, salt })
    const token = this.generateToken({ email })
    this.mailingService.sendConsumerConfirmation({ email, token })
  }

  async confirm(token: string, res: Response) {
    const decoded: any = this.jwtService.decode(token)
    const redirectUrl = new URL(`confirmation`, `http://localhost:3000`)

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
      expiresIn: this.configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`)
    }
    return this.jwtService.sign(payload, options)
  }

  private async verifyIdToken(idToken): Promise<LoginTicket> {
    return this.oAuth2Client.verifyIdToken({ idToken })
  }
}
