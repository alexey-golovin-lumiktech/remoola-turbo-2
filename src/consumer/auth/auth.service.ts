import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { UsersService } from '../entities/users/users.service'
import { IAccessToken, ILoginBody } from '../../dtos'
import { JwtService } from '@nestjs/jwt'
import { IUserModel } from '../../models'
import { constants } from '../../constants'
import { ConfigService } from '@nestjs/config'
import { verifyPass } from 'src/utils'

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(body: ILoginBody): Promise<IAccessToken> {
    try {
      const user = await this.usersService.findByEmail(body.email)
      if (!user) throw new NotFoundException({ message: constants.ADMIN_NOT_FOUND })

      const verified = await verifyPass({ incomingPass: body.password, password: user.password, salt: user.salt })
      if (!verified) throw new BadRequestException({ message: constants.INVALID_PASSWORD })

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
}
