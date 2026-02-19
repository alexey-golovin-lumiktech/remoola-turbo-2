import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type AccessRefreshTokenModel, type AdminModel } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { Credentials } from '../../dtos/admin';
import { IJwtTokenPayload } from '../../dtos/consumer';
import { PrismaService } from '../../shared/prisma.service';
import { passwordUtils } from '../../shared-common';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(body: Credentials) {
    const identity = await this.prisma.adminModel.findFirst({
      where: { email: body.email, deletedAt: null },
    });
    if (!identity) throw new UnauthorizedException(adminErrorCodes.ADMIN_INVALID_CREDENTIALS);

    const valid = await passwordUtils.verifyPassword({
      password: body.password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });
    if (!valid) throw new UnauthorizedException(adminErrorCodes.ADMIN_INVALID_CREDENTIALS);

    const access = await this.getAccessAndRefreshToken(identity.id);
    return { identity, ...access };
  }

  async refreshAccess(refreshToken: string) {
    const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
    const exist = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId: verified.identityId } });
    if (exist == null) throw new BadRequestException(adminErrorCodes.ADMIN_NO_IDENTITY_RECORD);
    if (exist.refreshToken != refreshToken) throw new BadRequestException(adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID);

    const admin = await this.prisma.adminModel.findFirst({ where: { id: verified.identityId } });
    const access = await this.getAccessAndRefreshToken(admin.id);
    return Object.assign({ ...access, type: admin.type, email: admin.email, id: admin.id });
  }

  private async getAccessAndRefreshToken(identityId: AdminModel[`id`]) {
    const accessToken = await this.getAccessToken(identityId);
    const refreshToken = await this.getRefreshToken(identityId);

    const data = { accessToken, refreshToken, identityId };

    const found = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId } });
    let saved: AccessRefreshTokenModel;
    if (found) {
      saved = await this.prisma.accessRefreshTokenModel.upsert({
        where: { id: found.id },
        update: data,
        create: data,
      });
    } else saved = await this.prisma.accessRefreshTokenModel.create({ data });

    return { accessToken: saved.accessToken, refreshToken: saved.refreshToken };
  }

  private getAccessToken(identityId: string) {
    return this.jwtService //
      .signAsync({ identityId, type: `access` }, { expiresIn: 86400 }); //86400 ~ 24hrs in milliseconds
  }

  private getRefreshToken(identityId: string) {
    return this.jwtService //
      .signAsync({ identityId, type: `refresh` }, { expiresIn: 604800 }); //604800 ~ 7days in seconds
  }
}
