import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as uuid from 'uuid'

import * as constants from '../../constants'
import { ADMIN } from '../../dtos'
import { IAdminModel } from '../../models'
import { validatePassword } from '../../utils'
import { AdminsService } from '../entities/admins/admins.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(AdminsService) private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getAuthenticatedAdmin(email: string, password: string): Promise<IAdminModel> {
    const admin = await this.adminsService.findByEmail(email)
    if (!admin) throw new BadRequestException(constants.INVALID_CREDENTIALS)

    const isValidPassword = await validatePassword({ incomingPass: password, password: admin.password, salt: admin.salt })
    if (!isValidPassword) throw new BadRequestException(constants.INVALID_CREDENTIALS)

    return admin
  }

  async login(body: ADMIN.Credentials): Promise<ADMIN.Access> {
    try {
      const admin = await this.adminsService.findByEmail(body.email)
      if (!admin) throw new NotFoundException(constants.ADMIN_NOT_FOUND)

      const verified = await validatePassword({ incomingPass: body.password, password: admin.password, salt: admin.salt })
      if (!verified) throw new BadRequestException(constants.INVALID_CREDENTIALS)

      const accessToken = this.generateToken(admin)
      const refreshToken = this.generateRefreshToken() //@TODO : need to store refresh token
      return { accessToken, refreshToken: refreshToken.token, type: admin.type }
    } catch (error) {
      this.logger.error(error)
      throw new InternalServerErrorException()
    }
  }

  private generateToken(admin: IAdminModel): string {
    const payload = { email: admin.email, identityId: admin.id }
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
