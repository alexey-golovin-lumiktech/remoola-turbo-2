import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { Admin as AdminModel, AdminType } from '@remoola/database';

import { RefreshTokenPayload } from './types';
import { passwordUtils } from '../../common';
import { JWT_ACCESS_TTL, JWT_REFRESH_SECRET, JWT_REFRESH_TTL, JWT_SECRET } from '../../envs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async validate(incomingEmail: string, incomingPass: string) {
    console.log(`validate`);
    const admin = await this.prisma.admin.findFirst({
      where: { email: incomingEmail },
    });
    if (!admin) throw new UnauthorizedException(`INVALID_CREDENTIALS`);

    const ok = await bcrypt.compare(incomingPass, admin.password);
    if (!ok) throw new UnauthorizedException(`INVALID_CREDENTIALS`);
    return { id: admin.id, email: admin.email, type: admin.type };
  }

  signAccess(admin: Pick<AdminModel, `id` | `email` | `type`>) {
    console.log(`signAccess`);
    return this.jwt.sign(
      { sub: admin.id, email: admin.email, type: admin.type, typ: `access` }, //
      { secret: JWT_SECRET, expiresIn: JWT_ACCESS_TTL },
    );
  }

  signRefresh(admin: Pick<AdminModel, `id` | `email` | `type`>) {
    console.log(`signRefresh`);
    return this.jwt.sign(
      { sub: admin.id, email: admin.email, type: admin.type, typ: `refresh` }, //
      { secret: JWT_REFRESH_SECRET, expiresIn: JWT_REFRESH_TTL },
    );
  }

  verifyRefresh(token: string) {
    console.log(`verifyRefresh`);
    try {
      return this.jwt.verify<RefreshTokenPayload>(token, { secret: JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException(`Invalid refresh`);
    }
  }

  private async createAdmin(email: string, password: string, type = AdminType.ADMIN) {
    const salt = passwordUtils.getHashingSalt(10);
    const hash = await bcrypt.hash(password, 10);
    return await this.prisma.admin.create({
      data: { email, type, salt, password: hash },
    });
  }
}
