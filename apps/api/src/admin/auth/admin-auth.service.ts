import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { type AccessRefreshTokenModel, type AdminModel } from '@remoola/database-2';

import { IJwtTokenPayload } from '../../dtos/consumer';
import { PrismaService } from '../../shared/prisma.service';
import { constants, passwordUtils } from '../../shared-common';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}
  async getAuthenticatedAdmin(email: string, password: string) {
    const admin = await this.prisma.adminModel.findFirst({ where: { email } });
    if (!admin) throw new BadRequestException(constants.INVALID_CREDENTIALS);

    const isValidPassword = await passwordUtils.verifyPassword({
      password,
      storedHash: admin.password,
      storedSalt: admin.salt,
    });
    if (!isValidPassword) throw new BadRequestException(constants.INVALID_CREDENTIALS);

    return admin;
  }

  async login(body: any) {
    const identity = await this.prisma.adminModel.findUnique({ where: { email: body.email } });
    if (!identity) throw new UnauthorizedException(`Invalid credentials`);

    const valid = await passwordUtils.verifyPassword({
      password: body.password,
      storedHash: identity.password,
      storedSalt: identity.salt,
    });
    if (!valid) throw new UnauthorizedException(`Invalid credentials`);

    const access = await this.getAccessAndRefreshToken(identity.id);
    return { identity, ...access };
  }

  async refreshAccess(refreshToken: string) {
    const verified = this.jwtService.verify<IJwtTokenPayload>(refreshToken);
    const exist = await this.prisma.accessRefreshTokenModel.findFirst({ where: { identityId: verified.identityId } });
    if (exist == null) throw new BadRequestException(`no identity record`);
    if (exist.refreshToken != refreshToken) throw new BadRequestException(`provided refresh token is not valid`);

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
