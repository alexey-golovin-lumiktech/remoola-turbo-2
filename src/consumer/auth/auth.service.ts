import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'

import { Response } from 'express'
import { UsersService } from '../entities/users/users.service'
import { ICredentials, ISignup } from '../../dtos'
import { JwtService } from '@nestjs/jwt'
import { IUserModel } from '../../models'
import { constants } from '../../constants'
import { ConfigService } from '@nestjs/config'
import { generatePasswordHash, generateStrongPassword, verifyPass } from 'src/utils'
import { LoginTicket, OAuth2Client } from 'google-auth-library'
import { GoogleProfile, IGoogleLogin } from 'src/dtos/consumer/googleProfile.dto'
import { GoogleProfilesService } from '../entities/googleProfiles/googleProfiles.service'
import { IAccessConsumer } from 'src/dtos/consumer'
import { generatePasswordHashSalt } from 'src/utils'
import { MailingService } from 'src/sharedModules/mailing/mailing.service'

@Injectable()
export class AuthService {
  private readonly oAuth2Client: OAuth2Client
  private readonly audience: string

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(GoogleProfilesService) private readonly googleProfileService: GoogleProfilesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailingService: MailingService
  ) {
    const secret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    this.audience = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    this.oAuth2Client = new OAuth2Client(this.audience, secret)
  }

  getRandomPassword(): Promise<string> {
    const getPassword = async () => {
      const password = generateStrongPassword()
      const salt = generatePasswordHashSalt(10)
      const hash = generatePasswordHash({ password, salt })
      const exist = await this.usersService.repository.find({ filter: { password: { eq: hash } } })
      return exist.length > 0 ? getPassword() : password
    }
    return getPassword()
  }

  async login(body: ICredentials): Promise<IAccessConsumer> {
    try {
      const user = await this.usersService.findByEmail(body.email)
      if (!user) throw new NotFoundException({ message: constants.NOT_FOUND })

      const verified = await verifyPass({ incomingPass: body.password, password: user.password, salt: user.salt })
      if (!verified) throw new BadRequestException({ message: constants.INVALID_PASSWORD })

      const accessToken = this.generateToken(user)
      return { accessToken, refreshToken: null }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async googleLogin(body: IGoogleLogin): Promise<IAccessConsumer> {
    try {
      const verified = await this.verifyIdToken(body.credential)
      const userId: string = verified.getUserId()
      const googleProfile = new GoogleProfile(userId, verified.getPayload())
      let user = await this.usersService.findByEmail(googleProfile.email)
      if (!user) {
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
        // for user
        // and in next time user should do remember password

        user = await this.usersService.repository.create({
          email,
          verified,
          firstName,
          lastName,
          googleProfileId: profile.id,
          password: ``, //@TODO: needs to discuss
          salt: `` //@TODO: needs to discuss
        })
      }

      const accessToken = this.generateToken(user)
      return { accessToken, refreshToken: null }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async signup(body: ISignup): Promise<any> {
    const { email, password, firstName, lastName, middleName } = body
    const exist = await this.usersService.findByEmail(email)
    if (exist) throw new BadRequestException(`This email is already exist`)
    const salt = generatePasswordHashSalt()
    const hash = generatePasswordHash({ password, salt })
    await this.usersService.repository.create({ email, firstName, lastName, middleName, password: hash, salt })
    const code = generateStrongPassword()
    const token = this.generateToken({ email })
    this.mailingService.sendUserConfirmation({ email, token, code })
  }

  async confirm(token: string, res: Response) {
    const decoded: any = this.jwtService.decode(token)
    const redirectUrl = new URL(`confirmed`, `http://localhost:3000`)

    if (decoded.email) {
      redirectUrl.searchParams.append(`email`, decoded.email)

      const [updated] = await this.usersService.repository.update({ email: { eq: decoded.email } }, { verified: true })
      redirectUrl.searchParams.append(`verified`, !updated || updated.verified == false ? `no` : `yes`)
    }

    res.redirect(redirectUrl.toString())
  }

  private generateToken(user: IUserModel | { email: string }): string {
    const payload = { email: user.email, ...((user as IUserModel).id && { userId: (user as IUserModel).id }) }
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
