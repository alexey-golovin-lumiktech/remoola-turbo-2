import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcryptjs';

import { RefreshTokenPayload } from './types';
import { JWT_ACCESS_TTL, JWT_REFRESH_SECRET, JWT_REFRESH_TTL, JWT_SECRET } from '../../envs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConsumerAuthService {
  constructor(
    private readonly jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string, isAdminApp = false) {
    // const user = await this.userRepository
    //   .createQueryBuilder(`u`)
    //   .addSelect(`u.passwordHash`)
    //   .where(`u.email = :email`, { email })
    //   .getOne();
    // if (!user) {
    //   if (!isAdminApp) return this.createClient(email, pass);
    //   throw new UnauthorizedException(`INVALID_CREDENTIALS`);
    // }
    // const ok = await bcrypt.compare(pass, user.passwordHash);
    // if (!ok) throw new UnauthorizedException(`INVALID_CREDENTIALS`);
    // return user;
  }

  signAccess(user: any) {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role }, //
      { secret: JWT_SECRET, expiresIn: JWT_ACCESS_TTL },
    );
  }

  signRefresh(user: any) {
    return this.jwt.sign(
      { sub: user.id, typ: `refresh` }, //
      { secret: JWT_REFRESH_SECRET, expiresIn: JWT_REFRESH_TTL },
    );
  }

  verifyRefresh(token: string) {
    try {
      return this.jwt.verify<RefreshTokenPayload>(token, { secret: JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException(`Invalid refresh`);
    }
  }

  private async createClient(email: string, pass: string) {
    return {} as any;
  }
}
