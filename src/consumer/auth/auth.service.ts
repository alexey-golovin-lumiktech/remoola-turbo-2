import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { UsersService } from '../entities/users/users.service'
import { IAccessToken, ILoginBody } from '../../dtos'
import { JwtService } from '@nestjs/jwt'
import { IUserModel } from '../../models'
import { constants } from '../../constants'
import { ConfigService } from '@nestjs/config'
import { verifyPass } from 'src/utils'
import { LoginTicket, OAuth2Client } from 'google-auth-library'
import { GoogleProfile, IGoogleLogin } from 'src/dtos/consumer/google-profile.dto'
import { GoogleProfilesService } from '../entities/google-profiles/google-profiles.service'

@Injectable()
export class AuthService {
  private readonly oAuth2Client: OAuth2Client
  private readonly audience: string

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(GoogleProfilesService) private readonly googleProfileService: GoogleProfilesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    const secret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    this.audience = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    this.oAuth2Client = new OAuth2Client(this.audience, secret)
  }

  async login(body: ILoginBody): Promise<IAccessToken> {
    try {
      const user = await this.usersService.findByEmail(body.email)
      if (!user) throw new NotFoundException({ message: constants.NOT_FOUND })

      const verified = await verifyPass({ incomingPass: body.password, password: user.password, salt: user.salt })
      if (!verified) throw new BadRequestException({ message: constants.INVALID_PASSWORD })

      const accessToken = this.generateToken(user)
      return { accessToken }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async googleLogin(body: IGoogleLogin): Promise<IAccessToken> {
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
      return { accessToken }
    } catch (error) {
      throw new HttpException(error.message || `Internal error`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  private generateToken(admin: IUserModel): string {
    const payload = { email: admin.email, id: admin.id }
    const options = {
      secret: this.configService.get<string>(`JWT_SECRET`),
      expiresIn: this.configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`)
    }
    return this.jwtService.sign(payload, options)
  }

  private verifyIdToken(idToken): Promise<LoginTicket> {
    return this.oAuth2Client.verifyIdToken({ idToken, audience: this.audience })
  }
}
