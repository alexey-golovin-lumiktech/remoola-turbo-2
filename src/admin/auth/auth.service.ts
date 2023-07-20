import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as uuid from 'uuid'

import { IAdminModel } from '@wirebill/shared-common/models'

import * as constants from '../../constants'
import { ADMIN } from '../../dtos'
import { passwordsIsEqual } from '../../utils'
import { AdminService } from '../entities/admin/admin.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(AdminService) private readonly adminsService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getAuthenticatedAdmin(email: string, password: string): Promise<IAdminModel> {
    const admin = await this.adminsService.findByEmail(email)
    if (!admin) throw new BadRequestException(constants.INVALID_CREDENTIALS)

    const isValidPassword = await passwordsIsEqual({ incomingPass: password, password: admin.password, salt: admin.salt })
    if (!isValidPassword) throw new BadRequestException(constants.INVALID_CREDENTIALS)

    return admin
  }

  async login(admin: IAdminModel): Promise<ADMIN.Access> {
    try {
      const accessToken = this.generateToken(admin)
      const refreshToken = this.generateRefreshToken() //@TODO: need to store refresh token
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
