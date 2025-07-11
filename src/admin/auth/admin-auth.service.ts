import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { IAdminModel } from '@wirebill/shared-common/models'

import { commonUtils } from '@-/common-utils'
import * as constants from '@-/constants'
import { ADMIN } from '@-/dtos'
import { IJwtTokenPayload } from '@-/dtos/consumer'
import { AccessRefreshTokenRepository } from '@-/repositories'

import { AdminService } from '../entities/admin/admin.service'

@Injectable()
export class AdminAuthService {
  constructor(
    @Inject(AdminService) private readonly adminsService: AdminService,
    @Inject(AccessRefreshTokenRepository) private readonly accessRefreshTokenRepository: AccessRefreshTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  async getAuthenticatedAdmin(email: string, password: string): Promise<IAdminModel> {
    const admin = await this.adminsService.findByEmail(email)
    if (!admin) throw new BadRequestException(constants.INVALID_CREDENTIALS)

    const isValidPassword = await commonUtils.validatePassword({ incomingPass: password, password: admin.password, salt: admin.salt })
    if (!isValidPassword) throw new BadRequestException(constants.INVALID_CREDENTIALS)

    return admin
  }

  async login(admin: IAdminModel): Promise<ADMIN.Access> {
    const access = await this.getAccessAndRefreshToken(admin.id)
    return Object.assign({ ...access, type: admin.type, email: admin.email, id: admin.id })
  }

  async refreshAccess(refreshToken: string): Promise<ADMIN.Access> {
    const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken)
    const exist = await this.accessRefreshTokenRepository.findOne({ identityId: verified.identityId })
    if (exist == null) throw new BadRequestException(`no identity record`)
    if (exist.refreshToken != refreshToken) throw new BadRequestException(`provided refresh token is not valid`)

    const admin = await this.adminsService.repository.findById(verified.identityId)
    const access = await this.getAccessAndRefreshToken(admin.id)
    return Object.assign({ ...access, type: admin.type, email: admin.email, id: admin.id })
  }

  private async getAccessAndRefreshToken(identityId: IAdminModel[`id`]): Promise<Pick<ADMIN.Access, `accessToken` | `refreshToken`>> {
    const accessToken = await this.getAccessToken(identityId)
    const refreshToken = await this.getRefreshToken(identityId)
    const saved = await this.accessRefreshTokenRepository.upsert({ accessToken, refreshToken, identityId })
    return { accessToken: saved.accessToken, refreshToken: saved.refreshToken }
  }

  private getAccessToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `access` }, { expiresIn: 86400 }) //86400 ~ 24hrs in milliseconds
  }

  private getRefreshToken(identityId: string) {
    return this.jwtService.signAsync({ identityId, type: `refresh` }, { expiresIn: 604800 }) //604800 ~ 7days in seconds
  }
}
