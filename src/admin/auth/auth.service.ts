import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { UsersService } from '../entities/users/users.service'
import { IAccessToken, ILoginBody } from '../../dtos'
import { JwtService } from '@nestjs/jwt'
import { IUserModel } from '../../models'
import { constants } from '../../constants'
import * as bcrypt from 'bcryptjs'
import { ConfigService } from '@nestjs/config'
import uuid from 'uuid'
import crypto from 'crypto'

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

      const passwordEquals = await bcrypt.compare(body.password, user.password)

      if (!passwordEquals) {
        throw new BadRequestException({ message: constants.INVALID_PASSWORD })
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

  private validatePassword({ password, dbPassword, dbSalt }): boolean {
    const hash = crypto.createHmac(`sha512`, dbSalt).update(password).digest(`hex`).slice().trim()
    return dbPassword === hash
  }

  private hashPassword(password: string, salt = ``): string {
    if (salt.length == 0) salt = this.getRandomString(12)
    return crypto.createHmac(`sha512`, salt).update(password).digest(`hex`)
  }

  private getRandomString(count = 3) {
    return Array(count).fill(null).map(() => Math.random().toString(36).slice(2)).join(``) //eslint-disable-line
  }

  private generateRefreshToken() {
    const payload = { tokenUuid: uuid.v4(), type: `refresh` }
    const options = {
      secret: this.configService.get<string>(`JWT_SECRET`),
      expiresIn: this.configService.get<string>(`JWT_REFRESH_TOKEN_EXPIRES_IN`)
    }
    return { tokenUuid: payload.tokenUuid, token: this.jwtService.sign(payload, options) }
  }
}
